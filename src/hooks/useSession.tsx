import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface SessionContextValue {
  /** Sesión activa de Supabase Auth, o `null` si no hay usuario autenticado. */
  session: Session | null;
  /** `true` mientras se resuelve la sesión inicial — los guards muestran spinner (R6). */
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Único punto de contacto con `supabase.auth` para el estado de sesión:
 * resuelve la sesión inicial con `getSession()` (persistida en localStorage,
 * R4) y se suscribe a `onAuthStateChange` para login/logout (R2, R5).
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  // Sin cliente configurado no hay nada que cargar: loading arranca en false.
  const [loading, setLoading] = useState<boolean>(supabase !== null);

  useEffect(() => {
    if (supabase === null) {
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>;
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
