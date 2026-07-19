import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ConfigError from "@/components/ConfigError";
import LoadingScreen from "@/components/LoadingScreen";
import { useSession } from "@/hooks/useSession";
import { isConfigured } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guard de rutas protegidas (R1, R6): sin variables de entorno muestra
 * <ConfigError /> (no tiene sentido rebotar a un login que no puede funcionar);
 * mientras carga la sesión inicial muestra spinner sin parpadear redirección;
 * sin sesión redirige a /login; con sesión pinta el app shell + la pantalla.
 * El guard es UX — la autorización real la aplica RLS en Supabase.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useSession();

  if (!isConfigured) {
    return <ConfigError />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
