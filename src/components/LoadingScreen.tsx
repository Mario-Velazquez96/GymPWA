/**
 * Indicador de carga a pantalla completa (R6): se muestra mientras se resuelve
 * la sesión inicial para no parpadear una redirección equivocada.
 */
export default function LoadingScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-slate-100">
      <p role="status" className="animate-pulse text-lg text-slate-300">
        Cargando…
      </p>
    </main>
  );
}
