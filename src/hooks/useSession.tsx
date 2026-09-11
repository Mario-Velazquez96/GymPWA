import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface SessionContextValue {
  /** Sesión activa de Supabase Auth, o `null` si no hay usuario autenticado. */
  session: Session | null;
  /** `true` mientras se resuelve la sesión inicial — los guards muestran spinner (R6). */
  loading: boolean;
  /**
   * `true` cuando hay una sesión persistida cuyo access token caducó y el
   * refresco **no se pudo completar por infraestructura**: sin red (modo
   * avión) o con Supabase devolviendo 5xx — los dos casos que auth-js marca
   * como `AuthRetryableFetchError`. **No** es un cierre de sesión ni un
   * rechazo de credenciales (esos llegan como `AuthApiError` 4xx y sí llevan a
   * /login): supabase-js conserva la sesión en storage y la refresca sola en
   * cuanto puede, así que los guards no deben expulsar (12 R18).
   */
  offlineSession: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Único punto de contacto con `supabase.auth` para el estado de sesión:
 * resuelve la sesión inicial con `getSession()` (persistida en localStorage,
 * R4) y se suscribe a `onAuthStateChange` para login/logout (R2, R5).
 *
 * Sin red (12 R18–R20): si el access token caducó y el refresco falla por
 * conexión, se expone `offlineSession: true` en vez de tratarlo como logout;
 * al volver la señal supabase-js refresca solo y emite `TOKEN_REFRESHED`, que
 * fija la sesión y limpia la bandera. Un `SIGNED_OUT` real (logout o refresh
 * token inválido) sigue dejando `session: null` y `offlineSession: false`.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  // Sin cliente configurado no hay nada que cargar: loading arranca en false.
  const [loading, setLoading] = useState<boolean>(supabase !== null);
  const [offlineSession, setOfflineSession] = useState(false);

  useEffect(() => {
    if (supabase === null) {
      return;
    }

    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        // `getSession()` solo sale a la red si HABÍA una sesión persistida; un
        // error de red al refrescarla (`AuthRetryableFetchError`) significa
        // "sesión válida sin conexión", no "sin sesión" (12 R18).
        if (data.session === null && error !== null && isAuthRetryableFetchError(error)) {
          setOfflineSession(true);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallo inesperado (no-AuthError): se conserva el comportamiento de 02
        // — sin sesión, sin spinner eterno, el guard redirige a /login.
        if (active) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // `INITIAL_SESSION` repite lo que ya resolvió `getSession()` (misma
      // lectura de storage) y sin red lo emite con `null`: ignorarlo evita
      // pisar `offlineSession` con un falso cierre de sesión (12 R18).
      if (!active || event === "INITIAL_SESSION") {
        return;
      }
      setSession(nextSession);
      setOfflineSession(false); // TOKEN_REFRESHED / SIGNED_IN / SIGNED_OUT (12 R20)
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, offlineSession }}>
      {children}
    </SessionContext.Provider>
  );
}

/** Accessor del contexto de sesión — exige estar dentro de <SessionProvider>. */
// eslint-disable-next-line react-refresh/only-export-components -- hook + provider conviven por diseño (design.md 02_auth)
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return value;
}
