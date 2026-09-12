/**
 * Pantalla de error de configuración (R5): se muestra cuando falta
 * VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY, en lugar de una pantalla en
 * blanco o llamadas de red indefinidas.
 */
export default function ConfigError() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cyc-black p-6 text-center text-day">
      <h1 className="text-2xl font-bold">Error de configuración</h1>
      <p className="max-w-sm text-base text-day/90">
        Faltan las variables de entorno{" "}
        <code className="font-mono text-dawn-rose">VITE_SUPABASE_URL</code> y/o{" "}
        <code className="font-mono text-dawn-rose">VITE_SUPABASE_ANON_KEY</code>.
      </p>
      <p className="max-w-sm text-sm text-day/60">
        Copia <code className="font-mono text-dawn-rose">.env.example</code> a{" "}
        <code className="font-mono text-dawn-rose">.env.local</code>, completa los valores y vuelve
        a cargar la app.
      </p>
    </main>
  );
}
