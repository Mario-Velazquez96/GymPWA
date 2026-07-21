#!/usr/bin/env node
/**
 * generate-icons.mjs — genera el set de íconos PWA (PNG) desde una única
 * fuente vectorial: mancuerna blanca sobre fondo azul muy oscuro (#0f172a),
 * la misma geometría que public/icon.svg.
 *
 * Sin dependencias nuevas: rasteriza a mano con supersampling y codifica PNG
 * usando solo módulos internos de Node (zlib, fs). Se ejecuta una sola vez
 * para materializar los assets en public/ (que sí quedan versionados):
 *
 *   node scripts/generate-icons.mjs
 *
 * Salidas (public/):
 *   apple-touch-icon.png        180x180  (iOS, esquinas redondeadas propias)
 *   pwa-192x192.png             192x192  (manifest, purpose "any")
 *   pwa-512x512.png             512x512  (manifest, purpose "any")
 *   pwa-maskable-512x512.png    512x512  (manifest, purpose "maskable")
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Paleta (coincide con theme_color / background_color del manifest).
const BG = [15, 23, 42]; // #0f172a
const FG = [255, 255, 255]; // #ffffff

// Geometría de la mancuerna en el lienzo base 512x512 (idéntica al SVG fuente).
const VIEW = 512;
const BAR_RADIUS = 96; // esquinas redondeadas del fondo (no aplican en maskable)
const PLATES = [
  { x: 72, y: 196, w: 48, h: 120, r: 12 },
  { x: 136, y: 156, w: 48, h: 200, r: 12 },
  { x: 200, y: 236, w: 112, h: 40, r: 8 },
  { x: 328, y: 156, w: 48, h: 200, r: 12 },
  { x: 392, y: 196, w: 48, h: 120, r: 12 },
];

/** ¿El punto (px,py) está dentro del rectángulo redondeado? (todo en coords 512) */
function insideRoundRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const dx = Math.max(x + r - px, 0, px - (x + w - r));
  const dy = Math.max(y + r - py, 0, py - (y + h - r));
  return dx * dx + dy * dy <= r * r;
}

/** CRC32 (tabla perezosa) para los chunks PNG. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // datos crudos con byte de filtro 0 por fila
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Renderiza el ícono a tamaño `size`. Con `maskable` el fondo cubre todo el
 * lienzo (sin esquinas redondeadas) y la mancuerna se escala al ~72% para caer
 * dentro de la zona segura circular de las máscaras adaptativas.
 */
function render(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling 4x4 por pixel (anti-aliasing)
  const fgScale = maskable ? 0.72 : 1;
  const center = VIEW / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // punto del subsample mapeado a coords 512
          const u = ((px + (sx + 0.5) / SS) / size) * VIEW;
          const v = ((py + (sy + 0.5) / SS) / size) * VIEW;

          // fondo
          const inBg = maskable
            ? true
            : insideRoundRect(u, v, 0, 0, VIEW, VIEW, BAR_RADIUS);

          // mancuerna (con escala respecto al centro para maskable)
          const fu = (u - center) / fgScale + center;
          const fv = (v - center) / fgScale + center;
          let inFg = false;
          for (const p of PLATES) {
            if (insideRoundRect(fu, fv, p.x, p.y, p.w, p.h, p.r)) {
              inFg = true;
              break;
            }
          }

          if (inFg) {
            r += FG[0];
            g += FG[1];
            b += FG[2];
            a += 255;
          } else if (inBg) {
            r += BG[0];
            g += BG[1];
            b += BG[2];
            a += 255;
          }
          // else: transparente (contribuye 0)
        }
      }
      const n = SS * SS;
      const idx = (py * size + px) * 4;
      rgba[idx] = Math.round(r / n);
      rgba[idx + 1] = Math.round(g / n);
      rgba[idx + 2] = Math.round(b / n);
      rgba[idx + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, rgba);
}

const targets = [
  { file: "apple-touch-icon.png", size: 180, maskable: false },
  { file: "pwa-192x192.png", size: 192, maskable: false },
  { file: "pwa-512x512.png", size: 512, maskable: false },
  { file: "pwa-maskable-512x512.png", size: 512, maskable: true },
];

for (const t of targets) {
  const png = render(t.size, { maskable: t.maskable });
  writeFileSync(join(OUT_DIR, t.file), png);
  process.stdout.write(`generado public/${t.file} (${t.size}x${t.size})\n`);
}
