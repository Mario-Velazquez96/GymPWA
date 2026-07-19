import { defineConfig, devices } from "@playwright/test";

// Carga E2E_EMAIL / E2E_PASSWORD desde .env.local sin dependencias extra
// (Node ≥ 20.12 trae process.loadEnvFile). Sin el archivo, los specs que
// requieren credenciales se saltan solos con un mensaje claro.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local no existe — entorno sin credenciales (p. ej. CI sin secretos).
}

/**
 * E2E contra la build de producción (`pnpm preview`) para que el camino del
 * service worker sea realista. Requiere `pnpm build` previo (init.sh full lo
 * ejecuta antes de `./init.sh e2e`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
