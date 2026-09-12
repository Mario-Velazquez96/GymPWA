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
    return <p className="text-base text-day/60">Sin instrucciones disponibles</p>;
  }

  return (
    <ol className="flex list-decimal flex-col gap-2 pl-6 text-base leading-relaxed text-day/90 marker:font-bold marker:text-dawn-rose">
      {steps.map((step, index) => (
        <li key={`${index}-${step}`}>{step}</li>
      ))}
    </ol>
  );
}
