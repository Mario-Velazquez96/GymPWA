import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { useSession } from "@/hooks/useSession";
import { isConfigured } from "@/lib/supabase";

interface PublicOnlyProps {
  children: ReactNode;
}

/**
 * Guard inverso para /login (R8): con sesión activa redirige a /; mientras
 * carga la sesión inicial muestra spinner para no parpadear el formulario (R6).
 * Sin cliente configurado, /login se renderiza igual: es el punto de entrada
 * y no depende de Supabase para pintarse.
 */
export default function PublicOnly({ children }: PublicOnlyProps) {
  const { session, loading } = useSession();

  if (!isConfigured) {
    return <>{children}</>;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (session !== null) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
