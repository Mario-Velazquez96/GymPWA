import { checklistLabel } from "@/lib/checklist";
import type { DietChecklistItem } from "@/lib/types";

interface ChecklistItemProps {
  item: Pick<DietChecklistItem, "id" | "item" | "cantidad">;
  checked: boolean;
  onToggle: (id: string) => void;
}

/**
 * Renglón tachable de una lista de dieta (R2, R8). Es UN solo
 * `<button role="checkbox" aria-checked>` que ocupa la fila entera: con las
 * manos ocupadas en la cocina o empujando el carrito del súper, el toque
 * acierta en cualquier punto. Enter y Space lo activan de forma nativa y el
 * lector de pantalla anuncia el estado; la caja visual es decorativa
 * (`aria-hidden`).
 *
 * Cada renglón marcado amanece (14 R25): el `<li>` es una banda `dawn-sweep`
 * que gana `dawn-sweep-day` al marcarse; el label (último `<span>`) queda
 * tachado y la caja pasa a día con la ✓.
 */
export default function ChecklistItem({ item, checked, onToggle }: ChecklistItemProps) {
  return (
    <li className={checked ? "dawn-sweep dawn-sweep-day" : "dawn-sweep"}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onToggle(item.id)}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left"
      >
        <span
          aria-hidden="true"
          className={`flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-current text-sm font-bold ${
            checked ? "bg-day text-cyc-black" : ""
          }`}
        >
          {checked ? "✓" : ""}
        </span>
        <span className={checked ? "line-through opacity-60" : "text-day/90"}>
          {checklistLabel(item)}
        </span>
      </button>
    </li>
  );
}
