import { useState } from "react";

interface StepperProps {
  /** Etiqueta accesible del valor, p. ej. "Peso serie 1" (única por fila). */
  label: string;
  value: number;
  /** Incremento por tap: 2.5 (kg) para peso, 1 para reps (R4). */
  step: number;
  /** Mínimo permitido: 0 para peso, 1 para reps (R4). */
  min: number;
  /** Unidad visible junto al valor ("kg"); reps va sin unidad. */
  unit?: string;
  /** Deshabilitado mientras la fila guarda o ya quedó guardada (R5, R10). */
  disabled?: boolean;
  onChange: (value: number) => void;
}

/** Redondeo a 2 decimales para evitar arrastre flotante (22.5 + 2.5 = 25). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Stepper de una mano para el gym (R4): botones −/+ de ≥ 44px con clamp al
 * mínimo, y valor central tappable que se convierte en `<input
 * inputmode="decimal">` para entrada numérica directa (commit en blur/Enter;
 * entrada no numérica revierte al valor previo).
 */
export default function Stepper({
  label,
  value,
  step,
  min,
  unit,
  disabled = false,
  onChange,
}: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const adjust = (delta: number): void => {
    onChange(Math.max(min, round2(value + delta)));
  };

  const commit = (): void => {
    if (draft === null) {
      return;
    }
    setDraft(null);
    const parsed = Number(draft.trim().replace(",", "."));
    if (draft.trim() !== "" && Number.isFinite(parsed)) {
      onChange(Math.max(min, round2(parsed)));
    }
  };

  const buttonClass =
    "flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-slate-700 text-xl font-bold text-slate-100 transition-colors hover:bg-slate-600 disabled:opacity-40";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Disminuir ${label}`}
        disabled={disabled}
        onClick={() => adjust(-step)}
        className={buttonClass}
      >
        −
      </button>

      {draft !== null ? (
        <input
          aria-label={label}
          inputMode="decimal"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
            }
          }}
          className="min-h-11 w-20 rounded-lg border border-sky-500 bg-slate-900 text-center text-lg font-semibold text-slate-100 outline-none"
        />
      ) : (
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={() => setDraft(formatValue(value))}
          className="min-h-11 w-20 rounded-lg bg-slate-800 text-center text-lg font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:opacity-60"
        >
          {formatValue(value)}
          {unit !== undefined ? ` ${unit}` : ""}
        </button>
      )}

      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        disabled={disabled}
        onClick={() => adjust(step)}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}

/** Valor sin ceros de cola ("22.5", "20"). */
function formatValue(value: number): string {
  return String(round2(value));
}
