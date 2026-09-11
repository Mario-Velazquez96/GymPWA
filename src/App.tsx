import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnly from "@/components/PublicOnly";
import { SessionProvider } from "@/hooks/useSession";
import ExerciseScreen from "@/screens/ExerciseScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import LoginScreen from "@/screens/LoginScreen";
import TodayScreen from "@/screens/TodayScreen";

/**
 * La pantalla Dieta va en su propio chunk (10 R21): el renderizador de
 * Markdown solo se descarga al entrar a /dieta, y el camino del gym (Hoy) no
 * paga ese peso con datos móviles. El chunk queda precacheado con el shell.
 */
const DietScreen = lazy(() => import("@/screens/DietScreen"));

/**
 * Rutas con guards de sesión (02_auth): /login es pública-solo (R8) y el resto
 * exige sesión (R1). Sin variables `VITE_SUPABASE_*`, <ProtectedRoute> muestra
 * <ConfigError /> y /login se renderiza igual (contrato de 00_project_setup).
 */
export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginScreen />
            </PublicOnly>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TodayScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ejercicio/:planExerciseId"
          element={
            <ProtectedRoute>
              <ExerciseScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dieta"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <DietScreen />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/historial/:exerciseId"
          element={
            <ProtectedRoute>
              <HistoryScreen />
            </ProtectedRoute>
          }
        />
      </Routes>
    </SessionProvider>
  );
}
