import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
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
 * sin sesión redirige a /login; con sesión pinta el app shell (header +
 * navegación principal inferior, 10 R2) + la pantalla.
 * El guard es UX — la autorización real la aplica RLS en Supabase.
 *
 * Excepción sin red (12 R19): con `offlineSession` hay una sesión persistida
 * que solo no pudo refrescarse por falta de conexión, así que la app se sigue
 * mostrando (Dieta desde su snapshot; el resto con sus errores en español) en
 * vez de expulsar al usuario a un login que tampoco funcionaría en avión.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, offlineSession } = useSession();

  if (!isConfigured) {
    return <ConfigError />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (session === null && !offlineSession) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppHeader />
      {children}
      <BottomNav />
    </>
  );
}
