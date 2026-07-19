import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton del cliente supabase-js — la ÚNICA llamada a `createClient` del
 * repo. Se crea con la URL y la anon key públicas (`VITE_*`); si falta alguna,
 * exporta `null` y la app muestra <ConfigError /> en lugar de hacer llamadas
 * de red indefinidas (R4, R5).
 */
function createSingleton(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

export const supabase: SupabaseClient | null = createSingleton();

/** `true` cuando las dos variables `VITE_SUPABASE_*` están definidas. */
export const isConfigured: boolean = supabase !== null;
