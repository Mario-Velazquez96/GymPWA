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
 */
export default function ChecklistItem({ item, checked, onToggle }: ChecklistItemProps) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onToggle(item.id)}
        className="flex min-h-11 w-full items-center gap-3 px-2 py-2 text-left"
      >
        <span
          aria-hidden="true"
          className={`flex size-6 shrink-0 items-center justify-center rounded border text-sm font-bold ${
            checked ? "border-sky-400 bg-sky-500 text-slate-950" : "border-slate-500"
          }`}
        >
          {checked ? "✓" : ""}
        </span>
        <span className={checked ? "text-slate-500 line-through" : "text-slate-100"}>
          {checklistLabel(item)}
        </span>
      </button>
    </li>
  );
}
