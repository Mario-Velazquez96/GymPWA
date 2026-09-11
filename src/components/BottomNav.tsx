import { Link, useLocation } from "react-router-dom";

/**
 * Pestañas de la navegación principal. "Hoy" cubre `/`, `/ejercicio/*` e
 * `/historial/*` (ambas son contextuales a la rutina del día); "Dieta" cubre
 * `/dieta` y cualquier ruta bajo ella (R2).
 */
const TABS = [
  { to: "/", label: "Hoy", isActive: (pathname: string) => !pathname.startsWith("/dieta") },
  { to: "/dieta", label: "Dieta", isActive: (pathname: string) => pathname.startsWith("/dieta") },
] as const;

/**
 * Navegación principal de la app (R2, R3): barra inferior fija, alcanzable con
 * el pulgar, con dos pestañas de ≥ 44px. `<Link>` de React Router → navegación
 * sin recarga; el padding `env(safe-area-inset-bottom)` la sube por encima del
 * indicador de inicio del iPhone en modo standalone.
 */
export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center border-t-2 py-2 text-base font-semibold transition-colors ${
                  active
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
