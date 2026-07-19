# Tasks — 02_auth

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [ ] Implement `services/auth.ts` with `signIn`/`signOut` and Spanish error
      mapping (R2, R3, R5)
- [ ] Implement `hooks/useSession.tsx` (`SessionProvider` + `useSession`) over
      `getSession` + `onAuthStateChange` (R4, R6)
- [ ] Implement `ProtectedRoute` and `PublicOnly` guards; wire all routes in
      `App.tsx` (R1, R6, R8)
- [ ] Build `LoginScreen`: labeled inputs, ≥44px targets, pending state,
      inline Spanish errors (R2, R3, R7)
- [ ] Add app-shell header with "Cerrar sesión" on protected screens (R5)
- [ ] Document optional `E2E_EMAIL`/`E2E_PASSWORD` in `.env.example` (R7 note)
- [ ] Unit tests: auth service error mapping (mocked client) (R2, R3)
- [ ] Component tests: guards (loading/redirect/pass-through) and LoginScreen
      states (R1, R3, R6, R7, R8)
- [ ] E2E: login round trip incl. reload persistence and sign-out; skip cleanly
      without `E2E_*` (R1, R2, R4, R5)
- [ ] Run `./init.sh` + `./init.sh e2e`; all green

## Verification

- Mapping: R1 → ProtectedRoute tests + e2e; R2 → auth.test + e2e; R3 →
  auth.test + LoginScreen test; R4 → e2e reload step; R5 → e2e sign-out;
  R6 → ProtectedRoute loading test; R7 → LoginScreen test (labels, disabled,
  min-h-11 class); R8 → PublicOnly test.
- Coverage ≥ 80% lines on `services/auth.ts` + `hooks/useSession.tsx`.
- Manual: deep-link `/historial/0001` unauthenticated → `/login`.
