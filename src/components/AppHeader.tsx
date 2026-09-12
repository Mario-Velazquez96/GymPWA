import { signOut } from "@/services/auth";

/**
 * Encabezado del app shell en pantallas protegidas (R5): al cerrar sesión,
 * `onAuthStateChange` deja la sesión en null y el guard redirige a /login.
 *
 * Franja negra de 44 px (14 R7): la marca va como kicker (mayúsculas por CSS;
 * el DOM sigue diciendo "Rutinas Gym") y "Cerrar sesión" es un botón de texto.
 * La franja es de ancho completo, pero su contenido vive en la misma columna
 * de 448 px que el `<main>` y la barra inferior: en escritorio marca y botón
 * no se van a los bordes de la pantalla. A 390 px nada cambia.
 */
export default function AppHeader() {
  return (
    <header className="flex min-h-11 items-center border-b border-blackout bg-cyc-black px-4 text-day">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <span className="text-xs font-bold tracking-plot text-day uppercase">Rutinas Gym</span>
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="min-h-11 px-2 text-base text-day/90 underline-offset-4 transition-colors duration-150 hover:underline focus-visible:underline motion-reduce:transition-none"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
