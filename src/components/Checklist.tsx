import ChecklistItem from "@/components/ChecklistItem";
import { groupByCategoria as groupItems, type ChecklistGroup } from "@/lib/checklist";
import type { DietChecklistItem } from "@/lib/types";

interface ChecklistProps {
  /** Nombre accesible del bloque; el texto visible lo pone el `<summary>`. */
  title: string;
  /** Renglones ya filtrados por `kind` y ordenados por `position`. */
  items: DietChecklistItem[];
  /** `true` en la lista de súper: agrupa por `categoria` con `<h3>` (R10). */
  groupByCategoria?: boolean;
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClearAll: () => void;
}

/**
 * Key estable del grupo. La categoría va prefijada para que ninguna cadena real
 * pueda chocar con la del grupo "Otros" (review 11, menor 5).
 */
function groupKey(group: ChecklistGroup): string {
  return group.categoria === null ? "otros" : `cat:${group.categoria}`;
}

/**
 * Lista tachable de la pantalla Dieta (R6, R7, R9, R10, R17): contador
 * "<n> de <m> marcados", botón "Desmarcar todo" (deshabilitado mientras no
 * haya nada marcado) y los renglones, planos o agrupados por categoría.
 *
 * Presentacional puro: no consulta datos: el estado marcado y sus dos acciones
 * llegan por props desde `useChecklist` (R15).
 */
export default function Checklist({
  title,
  items,
  groupByCategoria: grouped = false,
  checked,
  onToggle,
  onClearAll,
}: ChecklistProps) {
  const total = items.length;
  // Solo cuentan los ids visibles: un id viejo en el almacenamiento no habilita
  // "Desmarcar todo" ni infla el contador (R7).
  const done = items.filter((item) => checked.has(item.id)).length;
  const groups: ChecklistGroup[] = grouped
    ? groupItems(items)
    : [{ categoria: null, label: "", items }];
  const showHeadings = grouped && !(groups.length === 1 && groups[0]?.categoria === null);

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-400" aria-live="polite">
          {done} de {total} marcados
        </p>
        <button
          type="button"
          onClick={onClearAll}
          disabled={done === 0}
          className="min-h-11 rounded-lg px-4 text-sm font-semibold text-sky-400 disabled:text-slate-600"
        >
          Desmarcar todo
        </button>
      </div>

      {groups.map((group) => (
        <div key={groupKey(group)}>
          {showHeadings && (
            <h3 className="mb-1 text-sm font-semibold tracking-wide text-slate-400 uppercase">
              {group.label}
            </h3>
          )}
          <ul className="divide-y divide-slate-800">
            {group.items.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                checked={checked.has(item.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
