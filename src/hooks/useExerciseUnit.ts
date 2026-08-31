import { useCallback, useState } from "react";
import { readExerciseUnit, writeExerciseUnit, type WeightUnit } from "@/lib/units";

interface UnitState {
  exerciseId: string;
  unit: WeightUnit;
}

/**
 * Preferencia de unidad de peso de UN ejercicio (08 R2, R3, R13). El estado
 * inicial se lee de forma perezosa desde el dispositivo (`localStorage`, sin
 * valor → kg) y el setter persiste best-effort: si el almacenamiento está
 * bloqueado, la unidad sigue viva en memoria durante la sesión y solo no
 * sobrevive a la recarga.
 *
 * Sin contexto global: cada pantalla lo instancia con su propio `exercise_id`
 * y la fuente de verdad compartida es el propio `localStorage`.
 */
export function useExerciseUnit(exerciseId: string): [WeightUnit, (unit: WeightUnit) => void] {
  const [state, setState] = useState<UnitState>(() => ({
    exerciseId,
    unit: readExerciseUnit(exerciseId),
  }));

  // La pantalla se reusa entre ejercicios vía la ruta: al cambiar el id hay que
  // releer su preferencia (R2). Se ajusta DURANTE el render (patrón oficial de
  // React para estado derivado de props) en vez de en un efecto, que
  // encadenaría un render extra.
  if (state.exerciseId !== exerciseId) {
    setState({ exerciseId, unit: readExerciseUnit(exerciseId) });
  }

  const setUnit = useCallback(
    (next: WeightUnit): void => {
      setState({ exerciseId, unit: next });
      writeExerciseUnit(exerciseId, next);
    },
    [exerciseId],
  );

  return [state.exerciseId === exerciseId ? state.unit : readExerciseUnit(exerciseId), setUnit];
}
