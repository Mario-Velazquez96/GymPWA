/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // R6: auto-actualiza el SW en la próxima carga
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Rutinas Gym",
        short_name: "Rutinas",
        description: "Tu rutina del gym, series y progreso",
        lang: "es",
        display: "standalone",
        start_url: "/",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        // R1: mancuerna blanca sobre fondo azul muy oscuro, generada por
        // scripts/generate-icons.mjs desde public/icon.svg.
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // R3: precachea el shell (JS/CSS/HTML + assets base) y sirve el shell
        // en navegaciones sin red.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // R4/R7: solo el media de Supabase Storage (GIF/imágenes de
            // ejercicios) se cachea con CacheFirst. Las rutas de API
            // (/rest/, /auth/) no coinciden con ninguna regla → siempre red (R5).
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/storage/"),
            handler: "CacheFirst",
            options: {
              cacheName: "exercise-media",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/vite-env.d.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
