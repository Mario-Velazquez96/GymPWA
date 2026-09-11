import { useCallback, useState } from "react";
import {
  checklistStorageKey,
  readChecked,
  writeChecked,
  type ChecklistKind,
} from "@/lib/checklist";

/** Tachado de una lista: qué está marcado y cómo cambiarlo. */
export interface ChecklistApi {
  /** Ids de `diet_checklist_items` marcados ahora mismo. */
  checked: ReadonlySet<string>;
  /** Marca el renglón si estaba sin marcar y viceversa; persiste el resultado. */
  toggle: (id: string) => void;
  /** Desmarca toda la lista y persiste `[]`. */
  clearAll: () => void;
}

interface ChecklistState {
  key: string;
  checked: ReadonlySet<string>;
}

/**
 * Tachado de UNA lista (meal prep o súper) de UN plan de dieta (11 R2, R3, R5,
 * R6, R14). El estado inicial se lee de forma perezosa desde el dispositivo
 * (`localStorage`, sin valor → vacío) y cada toque persiste best-effort: si el
 * almacenamiento está bloqueado, el tachado sigue vivo en memoria durante la
 * sesión y solo no sobrevive a la recarga.
 *
 * **Cero escrituras a Supabase**: el tachado es estado del dispositivo, no del
 * plan (client_requirement_dieta §6).
 */
export function useChecklist(planId: string, kind: ChecklistKind): ChecklistApi {
  const key = checklistStorageKey(planId, kind);
  const [state, setState] = useState<ChecklistState>(() => ({
    key,
    checked: readChecked(planId, kind),
  }));

  // Al cargar otro plan (mes nuevo) hay que leer SU clave; la anterior no se
  // toca (R14). Se ajusta DURANTE el render (patrón oficial de React para
  // estado derivado de props) en vez de en un efecto, que encadenaría un
  // render extra — mismo esqueleto que `useExerciseUnit` (08).
  if (state.key !== key) {
    setState({ key, checked: readChecked(planId, kind) });
  }
  const checked = state.key === key ? state.checked : readChecked(planId, kind);

  const toggle = useCallback(
    (id: string): void => {
      const next = new Set(checked);
      if (!next.delete(id)) {
        next.add(id);
      }
      setState({ key, checked: next });
      // Se escribe en el callback, nunca dentro del updater (Strict Mode los
      // ejecuta dos veces) ni en un efecto (escribiría al montar lo que acaba
      // de leer). Un toque es un evento discreto: `checked` está fresco.
      writeChecked(planId, kind, next);
    },
    [checked, key, planId, kind],
  );

  const clearAll = useCallback((): void => {
    setState({ key, checked: new Set() });
    writeChecked(planId, kind, []);
  }, [key, planId, kind]);

  return { checked, toggle, clearAll };
}
