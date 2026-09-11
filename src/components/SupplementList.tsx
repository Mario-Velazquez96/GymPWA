import type { DietSupplement } from "@/lib/types";

interface SupplementListProps {
  supplements: DietSupplement[];
}

/** "5 g · Diario, con el café" — partes nulas omitidas sin separadores huérfanos. */
function doseLine(supplement: DietSupplement): string {
  return [supplement.dosis, supplement.momento]
    .filter((part): part is string => part !== null && part !== "")
    .join(" · ");
}

function SupplementItem({ supplement }: { supplement: DietSupplement }) {
  const line = doseLine(supplement);
  return (
    <li className="flex gap-3 rounded-xl bg-slate-800 p-3">
      {supplement.recomendado ? (
        <span
          role="img"
          aria-label="Recomendado"
          className="mt-0.5 shrink-0 text-lg leading-none font-bold text-emerald-400"
        >
          ✓
        </span>
      ) : (
        <span
          role="img"
          aria-label="No recomendado"
          className="mt-0.5 shrink-0 text-lg leading-none font-bold text-red-400"
        >
          ✕
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-semibold text-slate-50">{supplement.nombre}</p>
        {line !== "" && <p className="text-sm text-slate-300">{line}</p>}
        {supplement.nota !== null && supplement.nota !== "" && (
          <p className="text-sm text-slate-400">{supplement.nota}</p>
        )}
      </div>
    </li>
  );
}

interface GroupProps {
  id: string;
  title: string;
  items: DietSupplement[];
}

function Group({ id, title, items }: GroupProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <h3 id={id} className="text-base font-semibold text-slate-200">
        {title}
      </h3>
      <ul aria-labelledby={id} className="flex flex-col gap-2">
        {items.map((supplement) => (
          <SupplementItem key={supplement.id} supplement={supplement} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Suplementos en dos grupos por `recomendado` (R13), cada uno en orden de
 * `position` (ya ordenados por el service). Un grupo vacío se omite; sin
 * suplementos, la sección entera se omite.
 */
export default function SupplementList({ supplements }: SupplementListProps) {
  if (supplements.length === 0) {
    return null;
  }

  const recommended = supplements.filter((supplement) => supplement.recomendado);
  const notWorth = supplements.filter((supplement) => !supplement.recomendado);

  return (
    <section aria-labelledby="suplementos" className="flex flex-col gap-3">
      <h2 id="suplementos" className="text-xl font-semibold text-slate-100">
        Suplementos
      </h2>
      <Group id="suplementos-recomendados" title="Recomendados" items={recommended} />
      <Group id="suplementos-no-vale" title="No vale la pena" items={notWorth} />
    </section>
  );
}
