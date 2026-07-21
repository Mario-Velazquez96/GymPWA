# Rutinas Gym

PWA en español para seguir tu rutina del gym desde el iPhone: ver la rutina del
día, cada ejercicio con GIF e instrucciones, y registrar series/pesos (kg) con
la comparación contra la sesión anterior.

Los planes los genera el repo hermano `Gym`; ambos repos se comunican únicamente
a través de Supabase. Esta app solo escribe en `workout_logs`.

**Stack:** React + Vite + TypeScript (SPA) · Supabase (Postgres + Auth + Storage,
RLS) · Tailwind CSS · React Router · `vite-plugin-pwa` · pnpm · Vitest +
Playwright.

## Correr localmente

Requisitos: Node ≥ 20 y `pnpm`.

```bash
pnpm install
cp .env.example .env.local   # y completa los valores (ver abajo)
pnpm dev                     # servidor de desarrollo (el service worker está apagado en dev)
```

Para probar la PWA (manifest + service worker) hay que usar la build de
producción, porque el SW no se registra en `pnpm dev`:

```bash
pnpm build
pnpm preview                 # sirve dist/ en http://localhost:4173
```

### Variables de entorno

Ambas variables son **públicas** (clave anon/publishable). **Nunca** pongas aquí
la *service key*: esa pertenece exclusivamente al repo `Gym`.

| Variable                 | Descripción                                    |
| ------------------------ | ---------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL del proyecto Supabase (`https://…supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Clave anon/publishable del proyecto.           |

Opcionales, solo para los tests E2E de Playwright: `E2E_EMAIL`, `E2E_PASSWORD`.

## Verificación

```bash
./init.sh        # install → typecheck → lint → test → build
./init.sh e2e    # Playwright contra la build de producción (pnpm preview)
```

## Instalar en el iPhone

La app se instala como PWA (no está en la App Store). Requiere que esté servida
por **HTTPS** (por ejemplo, el deploy en Vercel/Netlify; `localhost` también
funciona para pruebas). Pasos en el iPhone:

1. Abre la URL de la app en **Safari** (Chrome en iOS no permite instalar PWAs).
2. Toca el botón **Compartir** (el cuadro con la flecha hacia arriba).
3. Elige **"Agregar a pantalla de inicio"**.
4. Confirma el nombre (**"Rutinas"**) y toca **Agregar**.

Se creará un ícono (mancuerna blanca sobre fondo azul oscuro) en la pantalla de
inicio. Al abrirlo, la app se muestra en **pantalla completa (standalone)**, sin
la barra de Safari.

> **HTTPS es obligatorio.** El service worker y la instalación solo funcionan
> sobre HTTPS (o `localhost`). El deploy en Vercel/Netlify ya sirve la app por
> HTTPS.

Una vez visto un ejercicio, su GIF queda en caché: en modo avión, al volver a
abrir ese ejercicio, la interfaz y su GIF siguen apareciendo. Las pantallas de
datos (rutina, historial) muestran su estado de error en español porque los
datos siempre se piden a la red.

## Íconos de la PWA

Los PNG de `public/` (`apple-touch-icon.png`, `pwa-192x192.png`,
`pwa-512x512.png`, `pwa-maskable-512x512.png`) se generan desde la fuente
`public/icon.svg` con un script sin dependencias externas:

```bash
node scripts/generate-icons.mjs
```
