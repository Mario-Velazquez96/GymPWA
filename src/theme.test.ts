import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 14_ui_redesign_cyclorama — inspección estática del mundo visual (R1, R2,
 * R3, R4, R6, R28, R30). No renderiza nada: lee `src/index.css`, cada
 * `src/**\/*.tsx` de producción, `index.html`, `vite.config.ts` y
 * `package.json` desde `process.cwd()` y afirma que todo el color vive en
 * `@theme`, que no hay paleta por defecto ni literales en los componentes, y
 * que el manifest lleva el negro de ciclorama.
 */

const ROOT = resolve(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

/** Archivos `.tsx` de producción bajo `src/` (sin tests). */
function productionTsxFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (full.endsWith(".tsx") && !full.endsWith(".test.tsx")) {
        out.push(full);
      }
    }
  };
  walk(join(ROOT, "src"));
  return out.sort();
}

/** Quita comentarios de bloque y de línea para no penalizar prosa. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const PALETTE_CLASS =
  /\b(bg|text|border|from|to|via|ring|outline|divide|marker|placeholder|decoration|fill|stroke|accent|caret|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const HEX_LITERAL = /#[0-9a-f]{3,8}\b/i;
const INLINE_STYLE = /\bstyle=\{\{/;
const BIG_RADIUS = /\brounded-(lg|xl|2xl|3xl|full)\b/;
const SHADOW = /\bshadow-/;
const BACKDROP = /\bbackdrop-/;
const GRADIENT = /\bbg-(linear|gradient|radial|conic)/;
const GRADIENT_TEXT = /\bbg-clip-text\b/;

const css = read("src/index.css");

describe("tokens del mundo en src/index.css (R1)", () => {
  it("empieza con el @import de Tailwind y un solo bloque @theme", () => {
    expect(css.trimStart().startsWith('@import "tailwindcss";')).toBe(true);
    expect(css.match(/@theme\b/g)).toHaveLength(1);
  });

  it.each([
    ["--color-cyc-black", "#050505"],
    ["--color-horizon-cobalt", "#0a33ff"],
    ["--color-horizon-rose", "#ff6aae"],
    ["--color-dawn-rose", "#ffc1d6"],
    ["--color-day-wash", "#f7f5ff"],
    ["--color-day", "#ffffff"],
    ["--color-blackout", "#3a3a3a"],
    ["--color-cue-fault", "#e0342c"],
  ])("define %s: %s", (token, hex) => {
    const pattern = new RegExp(`${token}:\\s*${hex}\\s*;`, "i");
    expect(css).toMatch(pattern);
  });

  it("define el horizonte, el tracking de kicker y el barrido", () => {
    expect(css).toMatch(/--background-image-horizon:\s*linear-gradient\(\s*to bottom/);
    expect(css).toMatch(/--tracking-plot:\s*0\.08em;/);
    expect(css).toMatch(/--sweep-duration:\s*200ms;/);
    expect(css).toMatch(/--ease-sweep:\s*cubic-bezier\(/);
  });

  it("no define fuentes: ni @font-face, ni @import url(, ni --font-* (R2, D)", () => {
    expect(css).not.toMatch(/@font-face/);
    expect(css).not.toMatch(/@import\s+url\(/);
    expect(css).not.toMatch(/--font-/);
  });
});

describe("superficies del navegador y utilidades (R2, R3, R4)", () => {
  it("tematiza color-scheme, selección, caret y foco desde la paleta", () => {
    expect(css).toMatch(/color-scheme:\s*dark/);
    expect(css).toMatch(/::selection/);
    expect(css).toMatch(/caret-color:\s*var\(--color-horizon-rose\)/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-horizon-rose\)/);
  });

  it.each(["horizon-edge-l", "horizon-edge-t", "dawn-sweep", "dawn-sweep-day"])(
    "declara @utility %s",
    (name) => {
      expect(css).toMatch(new RegExp(`@utility ${name}\\s*\\{`));
    },
  );

  it("el barrido es CSS puro con corte bajo prefers-reduced-motion", () => {
    expect(css).toMatch(/background-size:\s*100% 200%/);
    expect(css).toMatch(/transition:[\s\S]*background-position var\(--sweep-duration\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*transition:\s*none/);
  });

  it("no declara @keyframes propios (sin animaciones de entrada)", () => {
    expect(css).not.toMatch(/@keyframes/);
  });
});

describe("ningún .tsx conoce la paleta por defecto ni literales (R1, R3, R6)", () => {
  const files = productionTsxFiles();

  it("hay archivos que inspeccionar", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((file) => [file.slice(ROOT.length + 1).replaceAll("\\", "/"), file]))(
    "%s está limpio",
    (_label, file) => {
      const source = stripComments(readFileSync(file, "utf8"));
      expect(source).not.toMatch(PALETTE_CLASS);
      expect(source).not.toMatch(HEX_LITERAL);
      expect(source).not.toMatch(INLINE_STYLE);
      expect(source).not.toMatch(BIG_RADIUS);
      expect(source).not.toMatch(SHADOW);
      expect(source).not.toMatch(BACKDROP);
      expect(source).not.toMatch(GRADIENT);
      expect(source).not.toMatch(GRADIENT_TEXT);
    },
  );
});

describe("manifest y theme-color (R28)", () => {
  it("index.html lleva theme-color #050505 y ya no el slate", () => {
    const html = read("index.html");
    expect(html).toMatch(/<meta name="theme-color" content="#050505" \/>/);
    expect(html).not.toMatch(/#0f172a/i);
  });

  it("vite.config.ts lleva theme_color y background_color #050505", () => {
    const config = read("vite.config.ts");
    expect(config).toMatch(/theme_color:\s*"#050505"/);
    expect(config).toMatch(/background_color:\s*"#050505"/);
    expect(config).not.toMatch(/#0f172a/i);
  });
});

describe("sin dependencias nuevas (R30)", () => {
  it("package.json conserva exactamente las dependencias previas al rediseño", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      "@supabase/supabase-js",
      "react",
      "react-dom",
      "react-markdown",
      "react-router-dom",
      "remark-gfm",
    ]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual([
      "@eslint/js",
      "@playwright/test",
      "@tailwindcss/vite",
      "@testing-library/jest-dom",
      "@testing-library/react",
      "@testing-library/user-event",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "@vitejs/plugin-react",
      "@vitest/coverage-v8",
      "eslint",
      "eslint-config-prettier",
      "eslint-plugin-react-hooks",
      "eslint-plugin-react-refresh",
      "globals",
      "jsdom",
      "prettier",
      "tailwindcss",
      "typescript",
      "typescript-eslint",
      "vite",
      "vite-plugin-pwa",
      "vitest",
    ]);
  });
});

describe("correcciones de la revisión de cierre (finish-review-14)", () => {
  const files = productionTsxFiles();

  // Se compone en dos trozos a propósito: escrito de una pieza, el escáner de
  // Tailwind leería la clase en este archivo y emitiría la regla muerta.
  const BARE_BLACKOUT_HOVER = new RegExp(`(?<!disabled:)${"hover:"}${"bg-blackout"}`);

  it("fix 5: el apagón solo aparece en hover cuando el control está deshabilitado", () => {
    const offenders = files.filter((file) =>
      BARE_BLACKOUT_HOVER.test(stripComments(readFileSync(file, "utf8"))),
    );
    expect(offenders).toEqual([]);
  });

  it("fix 6: ningún control usa el desvanecido de opacidad como estado pulsado", () => {
    const offenders = files.filter((file) =>
      /hover:opacity-90|active:opacity-/.test(stripComments(readFileSync(file, "utf8"))),
    );
    expect(offenders).toEqual([]);
  });

  it("fix 6: el paso de fase pulsado usa el token dawn-rose ya declarado", () => {
    const primaries = files.filter((file) =>
      /\bbg-horizon\b/.test(stripComments(readFileSync(file, "utf8"))),
    );
    expect(primaries.length).toBeGreaterThan(3);
    for (const file of primaries) {
      const source = stripComments(readFileSync(file, "utf8"));
      expect(source).toMatch(/active:bg-dawn-rose/);
      expect(source).toMatch(/active:text-cyc-black/);
    }
  });
});
