import type { ReactElement } from "react";
import { Routes, Route } from "react-router-dom";
import ConfigError from "@/components/ConfigError";
import ExerciseScreen from "@/screens/ExerciseScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import LoginScreen from "@/screens/LoginScreen";
import TodayScreen from "@/screens/TodayScreen";
import { isConfigured } from "@/lib/supabase";

/**
 * Cuando faltan las variables `VITE_SUPABASE_*`, las pantallas que dependen de
 * datos muestran <ConfigError /> (R5). `/login` siempre se renderiza: es el
 * punto de entrada y no necesita Supabase para pintarse.
 */
function requireConfig(screen: ReactElement): ReactElement {
  return isConfigured ? screen : <ConfigError />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={requireConfig(<TodayScreen />)} />
      <Route path="/ejercicio/:planExerciseId" element={requireConfig(<ExerciseScreen />)} />
      <Route path="/historial/:exerciseId" element={requireConfig(<HistoryScreen />)} />
    </Routes>
  );
}
