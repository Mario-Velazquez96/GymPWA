# Design — 02_auth

**Source:** client_requirement RF-1; solution_design §2 (Supabase Auth), §4.1

## Approach

Services layer + first real screen. supabase-js already persists/refreshes the
session; we wrap it in one context so screens never touch `supabase.auth`
directly, and gate routes with a wrapper component.

## Services / hooks

```
services/auth.ts
  signIn(email, password) → { error: string | null }   // maps Supabase errors → Spanish messages
  signOut() → Promise<void>

hooks/useSession.tsx
  <SessionProvider>  — on mount: getSession(); subscribes onAuthStateChange;
                       exposes { session, loading }
  useSession()       — context accessor
```

Error mapping (R3): `invalid_credentials` → "Correo o contraseña incorrectos";
anything else → "Error de conexión, reintenta". Details `console.debug` only in
dev.

## Screens / components

```
App.tsx
  <SessionProvider>
    <Routes>
      /login          → <PublicOnly><LoginScreen/></PublicOnly>     (R8)
      all app routes  → <ProtectedRoute><.../></ProtectedRoute>     (R1)
```

- `ProtectedRoute`: `loading` → spinner (R6); no session → `<Navigate to="/login" replace>`;
  else children.
- `PublicOnly`: session → `<Navigate to="/" replace>` (R8).
- `LoginScreen`: controlled form, labels, `min-h-11` inputs/button, disabled +
  "Entrando…" while in flight (R7), inline error area (R3). On success,
  navigation falls out of the session state change (R2).
- App shell (simple header) gains "Cerrar sesión" (R5) — visible on all
  protected screens.

## Auth & security

Route guards are UX; RLS (feature `01`) is enforcement. No new env vars. E2E
credentials come from `E2E_EMAIL`/`E2E_PASSWORD` in `.env.local` (documented in
`.env.example` as optional, values never committed).

## Validation

HTML `required` + `type="email"` on the form; no Zod needed for two fields.

## Test approach

- Unit (Vitest): `services/auth.ts` error mapping with mocked supabase client
  (R2, R3).
- Component (RTL): `ProtectedRoute` loading/redirect/render states (R1, R6);
  `LoginScreen` disabled-while-pending + error rendering (R3, R7); `PublicOnly`
  redirect (R8).
- E2E (Playwright): full round trip — redirect to login, sign in, reload keeps
  session (R4), sign out (R5). Skipped with a clear message if `E2E_EMAIL` is
  unset.
- Coverage ≥ 80% lines on `services/auth.ts` + `hooks/useSession.tsx`.

## Open items / discrepancias

- Real-project E2E needs Mario's user + `E2E_*` vars (see requirements).
