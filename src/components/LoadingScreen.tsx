/**
 * Indicador de carga a pantalla completa (R6): se muestra mientras se resuelve
 * la sesión inicial para no parpadear una redirección equivocada.
 */
export default function LoadingScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cyc-black p-6 text-day">
      <p
        role="status"
        className="animate-pulse py-10 text-center text-lg text-day/60 motion-reduce:animate-none"
      >
        Cargando…
      </p>
    </main>
  );
}
