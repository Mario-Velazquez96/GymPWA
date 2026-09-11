import { supabase } from "@/lib/supabase";
import { writeDietSnapshot } from "@/lib/dietCache";

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

/** Clave donde supabase-js persiste la sesión: `sb-<project-ref>-auth-token`. */
const SESSION_STORAGE_KEY_PATTERN = /^sb-.+-auth-token$/;

/**
 * Borra del dispositivo la sesión persistida por supabase-js. Best-effort:
 * nunca lanza (mismo criterio que `lib/units.ts` y `lib/dietCache.ts`).
 *
 * Solo se usa como red de seguridad de `signOut` (12 R21, menor 1 del review):
 * cuando el cierre remoto no puede completarse, la sesión no puede quedarse en
 * el teléfono.
 */
function purgePersistedSession(): void {
  try {
    const store = globalThis.localStorage ?? null;
    if (store === null) {
      return;
    }
    const doomed: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key !== null && SESSION_STORAGE_KEY_PATTERN.test(key)) {
        doomed.push(key);
      }
    }
    for (const key of doomed) {
      store.removeItem(key);
    }
  } catch (thrown: unknown) {
    debugAuth("no se pudo purgar la sesión persistida:", thrown);
  }
}

/**
 * Cierra la sesión (R5). La redirección a /login ocurre sola cuando
 * `onAuthStateChange` propaga la sesión nula al guard de rutas.
 *
 * **Cierra siempre en local, aunque no haya red** (12 R21, menor 1 del review
 * de 12): si el access token caducó y el refresco falla por conexión,
 * `GoTrueClient._signOut` devuelve el error de sesión **antes** de borrarla, así
 * que sin esta red de seguridad el botón no cerraría nada y la sesión del
 * usuario anterior seguiría en el teléfono (con `offlineSession` el guard ni
 * siquiera rebotaría a /login). En ese caso se purga la clave
 * `sb-*-auth-token` y se repite el cierre: ya sin sesión almacenada,
 * supabase-js no toca la red y emite `SIGNED_OUT`, que es lo que saca al
 * usuario a /login.
 *
 * Además borra el snapshot local del plan de dieta (12 R21): el siguiente
 * usuario de este dispositivo no debe ver el plan del anterior.
 */
export async function signOut(): Promise<void> {
  if (supabase !== null) {
    let closed = false;
    try {
      const { error } = await supabase.auth.signOut();
      closed = error === null;
      if (error !== null) {
        debugAuth("signOut falló:", error);
      }
    } catch (thrown: unknown) {
      debugAuth("signOut lanzó excepción:", thrown);
    }

    if (!closed) {
      purgePersistedSession();
      try {
        // Segundo intento sin sesión almacenada: no hay petición de red y
        // supabase-js emite SIGNED_OUT (GoTrueClient._removeSession).
        await supabase.auth.signOut();
      } catch (thrown: unknown) {
        debugAuth("el cierre local de sesión lanzó excepción:", thrown);
      }
    }
  }

  // Se ejecuta siempre: la sesión local se va igual, así que el snapshot del
  // usuario que se va no puede quedarse en el dispositivo. Nunca lanza (R21).
  writeDietSnapshot(null);
}
