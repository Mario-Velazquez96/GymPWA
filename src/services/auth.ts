import { supabase } from "@/lib/supabase";

/** Mensajes de error en español — nunca se muestra un error crudo (R3). */
export const AUTH_ERROR_INVALID_CREDENTIALS = "Correo o contraseña incorrectos";
export const AUTH_ERROR_CONNECTION = "Error de conexión, reintenta";

/** Detalles del error solo en consola de desarrollo, nunca en la UI (R3). */
function debugAuth(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[auth]", ...details);
  }
}

/**
 * Inicia sesión con correo + contraseña vía Supabase Auth (R2). Devuelve
 * `{ error: null }` en éxito o un mensaje en español listo para la UI (R3).
 */
export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (supabase === null) {
    debugAuth("cliente supabase no configurado");
    return { error: AUTH_ERROR_CONNECTION };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error === null) {
      return { error: null };
    }

    debugAuth("signIn falló:", error);
    if (error.code === "invalid_credentials") {
      return { error: AUTH_ERROR_INVALID_CREDENTIALS };
    }
    return { error: AUTH_ERROR_CONNECTION };
  } catch (thrown: unknown) {
    debugAuth("signIn lanzó excepción:", thrown);
    return { error: AUTH_ERROR_CONNECTION };
  }
}

/**
 * Cierra la sesión (R5). La redirección a /login ocurre sola cuando
 * `onAuthStateChange` propaga la sesión nula al guard de rutas.
 */
export async function signOut(): Promise<void> {
  if (supabase === null) {
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error !== null) {
      debugAuth("signOut falló:", error);
    }
  } catch (thrown: unknown) {
    debugAuth("signOut lanzó excepción:", thrown);
  }
}
