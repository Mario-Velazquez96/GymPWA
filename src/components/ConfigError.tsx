/**
 * Pantalla de error de configuración (R5): se muestra cuando falta
 * VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY, en lugar de una pantalla en
 * blanco o llamadas de red indefinidas.
 */
export default function ConfigError() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-slate-100">
      <h1 className="text-2xl font-bold">Error de configuración</h1>
      <p className="max-w-sm text-base text-slate-300">
        Faltan las variables de entorno <code className="font-mono">VITE_SUPABASE_URL</code> y/o{" "}
        <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
      </p>
      <p className="max-w-sm text-sm text-slate-400">
        Copia <code className="font-mono">.env.example</code> a{" "}
        <code className="font-mono">.env.local</code>, completa los valores y vuelve a cargar la
        app.
      </p>
    </main>
  );
}
