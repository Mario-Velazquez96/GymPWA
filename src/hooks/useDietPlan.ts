import { useCallback, useEffect, useState } from "react";
import { readDietSnapshot, writeDietSnapshot } from "@/lib/dietCache";
import type { DietPlanFull } from "@/lib/types";
import { getActiveDietPlan } from "@/services/diet";

export interface DietPlanState {
  /** `true` solo cuando NO hay snapshot y la consulta sigue en vuelo (10 R16, 12 R7). */
  loading: boolean;
  /** Mensaje en español si la consulta falló y no hay snapshot que mostrar (10 R18, 12 R10). */
  error: string | null;
  /** Plan activo con sus hijas; `null` sin `loading` ni `error` = sin plan (10 R17). */
  plan: DietPlanFull | null;
  /** `true` cuando lo que se muestra viene del snapshot porque la red falló (12 R9). */
  isStale: boolean;
  /** ISO de cuándo se guardó el snapshot, solo cuando `isStale` (12 R9, R12). */
  savedAt: string | null;
}

/** Fase de la máquina stale-while-revalidate (12 design.md). */
type Phase =
  | { kind: "loading" } // sin snapshot, red en vuelo
  | { kind: "snapshot"; plan: DietPlanFull } // snapshot mostrado, red en vuelo
  | { kind: "fresh"; plan: DietPlanFull | null } // red OK (null = sin plan activo)
  | { kind: "stale"; plan: DietPlanFull; savedAt: string } // red falló, se muestra el snapshot
  | { kind: "error"; error: string }; // red falló y no hay snapshot

/**
 * Carga el plan de dieta activo con **stale-while-revalidate** (12 R6–R11):
 * al montar muestra de inmediato el snapshot de `localStorage` si existe (sin
 * pasar por "Cargando dieta…"), consulta la red y, según el resultado,
 * reemplaza el plan y reescribe el snapshot (o lo borra si ya no hay plan) o
 * conserva el snapshot marcándolo `isStale`. Mientras esté stale, el evento
 * `online` relanza la consulta una vez.
 *
 * Nada de esto toca el service worker: la API de Supabase nunca se cachea
 * (docs/architecture.md). `services/diet.ts` queda intacto (R17).
 */
export function useDietPlan(): DietPlanState & { retry: () => void } {
  const [phase, setPhase] = useState<Phase>(() => {
    // Una sola lectura del snapshot al montar: define si hay algo que enseñar
    // antes de que conteste la red (R6, R7).
    const snapshot = readDietSnapshot();
    return snapshot === null ? { kind: "loading" } : { kind: "snapshot", plan: snapshot.plan };
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    // Desde el estado de error, "Reintentar" vuelve al spinner (10 R18). Desde
    // `stale` (reintento por `online`) no se parpadea: el banner y el plan se
    // quedan en su sitio hasta que la red conteste (R11).
    setPhase((previous) => (previous.kind === "error" ? { kind: "loading" } : previous));
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void getActiveDietPlan().then((result) => {
      if (!active) {
        return;
      }
      if (result.error === null) {
        writeDietSnapshot(result.data); // `null` borra la clave (R8, R4)
        setPhase({ kind: "fresh", plan: result.data });
        return;
      }
      // Se relee el snapshot: es el más reciente persistido y trae su `savedAt`.
      const snapshot = readDietSnapshot();
      setPhase(
        snapshot === null
          ? { kind: "error", error: result.error } // R10
          : { kind: "stale", plan: snapshot.plan, savedAt: snapshot.savedAt }, // R9
      );
    });

    return () => {
      active = false;
    };
  }, [attempt]);

  // Reintento al volver la red, registrado SOLO mientras se muestra el
  // snapshot (R11). En iPhone la app instalada se reanuda sin recargar.
  useEffect(() => {
    if (phase.kind !== "stale") {
      return;
    }
    const onOnline = (): void => setAttempt((current) => current + 1);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [phase.kind]);

  const base = {
    loading: false,
    error: null,
    plan: null,
    isStale: false,
    savedAt: null,
    retry,
  } satisfies DietPlanState & { retry: () => void };

  switch (phase.kind) {
    case "loading":
      return { ...base, loading: true };
    case "snapshot":
      return { ...base, plan: phase.plan };
    case "fresh":
      return { ...base, plan: phase.plan };
    case "stale":
      return { ...base, plan: phase.plan, isStale: true, savedAt: phase.savedAt };
    case "error":
      return { ...base, error: phase.error };
  }
}
