import { useState, type FormEvent } from "react";
import { signIn } from "@/services/auth";

/**
 * Pantalla de inicio de sesión (R2, R3, R7): formulario controlado con labels,
 * targets ≥ 44px (min-h-11) y error inline en español. En éxito no navega
 * manualmente: el cambio de sesión hace que <PublicOnly> redirija a / (R2).
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn(email, password);

    if (result.error !== null) {
      setError(result.error);
      setPending(false);
    }
    // En éxito el botón sigue deshabilitado hasta que el guard redirige a /.
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-900 p-6 text-slate-100">
      <h1 className="text-3xl font-bold">Iniciar sesión</h1>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-3 text-base text-slate-100 outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-300">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-3 text-base text-slate-100 outline-none focus:border-sky-500"
          />
        </div>

        {error !== null && (
          <p role="alert" className="text-sm font-medium text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-sky-600 px-4 text-base font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
