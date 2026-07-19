interface InstructionStepsProps {
  /** Pasos en español (`exercises.instruction_steps_es`), ya ordenados. */
  steps: string[];
}

/**
 * Instrucciones del ejercicio como lista ordenada y numerada en español (R3).
 * Con el catálogo aún sin pasos (caso borde), muestra un aviso en lugar de
 * una lista vacía.
 */
export default function InstructionSteps({ steps }: InstructionStepsProps) {
  if (steps.length === 0) {
    return <p className="text-base text-slate-400">Sin instrucciones disponibles</p>;
  }

  return (
    <ol className="flex list-decimal flex-col gap-2 pl-6 text-base leading-relaxed text-slate-200 marker:font-semibold marker:text-slate-400">
      {steps.map((step, index) => (
        <li key={`${index}-${step}`}>{step}</li>
      ))}
    </ol>
  );
}
