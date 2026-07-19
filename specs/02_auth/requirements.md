# Requirements — 02_auth

**Feature:** Email/password login, session, and route protection
**Source:** client_requirement RF-1; solution_design §4.1 (pantalla Login)
**Depends on:** 01_supabase_schema_and_rls

## Purpose

Let Mario sign in with email + password (Supabase Auth), keep the session
across reloads, protect all app routes from unauthenticated access, and sign
out. After this feature, every query the app makes runs with an authenticated
JWT, which is what the RLS policies from `01` key on.

## In scope

- `LoginScreen` (Spanish) with email + password + submit.
- `services/auth.ts`: `signIn(email, password)`, `signOut()`.
- `useSession` hook/context over `supabase.auth` (`getSession` +
  `onAuthStateChange`).
- `ProtectedRoute` guard: unauthenticated → redirect `/login`; authenticated
  visiting `/login` → redirect `/`.
- "Cerrar sesión" action reachable from the app shell.

## Out of scope

- Sign-up, password reset, magic links (single user, created manually in the
  Supabase dashboard — see `supabase/README.md` from `01`).
- Any plan/exercise data loading (→ `03_today_view`).

## Requirements (EARS)

**R1 (State-driven):** While there is no authenticated session, the system
shall redirect any route except `/login` to `/login`.

**R2 (Event-driven):** When valid credentials are submitted on `/login`, the
system shall establish a session via `signInWithPassword` and navigate to `/`.

**R3 (Unwanted behavior):** If sign-in fails (wrong credentials or network
error), then the system shall stay on `/login` and show a Spanish error
("Correo o contraseña incorrectos" for invalid credentials; "Error de conexión,
reintenta" otherwise), never a raw error object.

**R4 (Ubiquitous):** The session shall persist across full page reloads
(supabase-js localStorage persistence): reloading while signed in keeps the
user on the app, not `/login`.

**R5 (Event-driven):** When "Cerrar sesión" is activated, the system shall call
`signOut` and redirect to `/login`.

**R6 (State-driven):** While the initial session state is still loading, the
guard shall render a loading indicator and shall not flash a redirect.

**R7 (Ubiquitous):** All auth UI text shall be Spanish; inputs shall have
labels; interactive targets shall be ≥ 44px; the submit button shall be
disabled while a sign-in request is in flight.

**R8 (State-driven):** While a session exists, visiting `/login` shall redirect
to `/`.

## Acceptance

With Mario's user created in Supabase: signing in lands on "Hoy" (placeholder);
reload keeps the session; wrong password shows the Spanish error; sign-out
returns to login; deep-linking `/historial/0001` unauthenticated bounces to
`/login`. Playwright covers the round trip.

## Open items

- Confirm Mario's auth user is created manually in the dashboard before E2E
  can run against the real project (E2E uses a `.env`-provided test credential,
  never committed).
