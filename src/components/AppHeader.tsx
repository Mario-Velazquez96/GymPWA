import { signOut } from "@/services/auth";

/**
 * Encabezado del app shell en pantallas protegidas (R5): al cerrar sesión,
 * `onAuthStateChange` deja la sesión en null y el guard redirige a /login.
 */
export default function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2 text-slate-100">
      <span className="text-lg font-bold">Rutinas Gym</span>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        className="min-h-11 rounded-lg px-4 text-base font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
