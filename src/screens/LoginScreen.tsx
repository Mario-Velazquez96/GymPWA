import { useState, type FormEvent } from "react";
import { signIn } from "@/services/auth";

const INPUT_CLASS =
  "min-h-11 rounded-sm border-2 border-day/60 bg-cyc-black px-3 text-base text-day outline-none transition-colors duration-150 focus:border-horizon-rose motion-reduce:transition-none";

/**
 * Pantalla de inicio de sesión (R2, R3, R7): formulario controlado con labels,
 * targets ≥ 44px (min-h-11) y error inline en español. En éxito no navega
 * manualmente: el cambio de sesión hace que <PublicOnly> redirija a / (R2).
 *
 * Suelo nocturno (14 R26): labels en kicker, inputs como rectángulos con
 * borde de día que se enciende en rosa al enfocar, "Entrar" como acción
 * primaria de horizonte y apagón mientras entra.
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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cyc-black p-6 text-day">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-bold tracking-plot text-day/90 uppercase">
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
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-xs font-bold tracking-plot text-day/90 uppercase"
          >
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
            className={INPUT_CLASS}
          />
        </div>

        {error !== null && (
          <p role="alert" className="text-base font-semibold text-cue-fault">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-sm border-2 border-transparent bg-horizon px-4 text-base font-bold text-day transition-colors duration-150 active:bg-none active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none disabled:cursor-not-allowed disabled:border-blackout disabled:bg-blackout disabled:bg-none disabled:text-day/60 disabled:opacity-100"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
