import { useEffect, useState } from "react";
import { nowLocalHM, parseHM } from "@/lib/diet";

/** Minutos desde medianoche ahora mismo en `America/Mexico_City` (R7). */
function currentMinutes(): number {
  return parseHM(nowLocalHM()) ?? 0;
}

/**
 * Minutos desde medianoche en `America/Mexico_City`, refrescados cada
 * `intervalMs` (60 s por defecto) mientras el componente esté montado; el
 * intervalo se limpia al desmontar (R7, R10). No consulta Supabase: solo
 * cambia el reloj, el plan sigue viniendo de `useDietPlan`.
 */
export function useNowMinutes(intervalMs = 60_000): number {
  const [now, setNow] = useState<number>(currentMinutes);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(currentMinutes());
    }, intervalMs);
    return () => {
      clearInterval(id);
    };
  }, [intervalMs]);

  return now;
}
