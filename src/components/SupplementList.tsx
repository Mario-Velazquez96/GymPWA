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
    <li className="flex gap-3 border-b border-blackout py-3">
      {supplement.recomendado ? (
        <span
          role="img"
          aria-label="Recomendado"
          className="flex size-6 shrink-0 items-center justify-center bg-day text-sm font-bold text-cyc-black"
        >
          ✓
        </span>
      ) : (
        <span
          role="img"
          aria-label="No recomendado"
          className="flex size-6 shrink-0 items-center justify-center text-lg leading-none font-bold text-cue-fault"
        >
          ✕
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-bold text-day">{supplement.nombre}</p>
        {line !== "" && <p className="text-sm text-day/60">{line}</p>}
        {supplement.nota !== null && supplement.nota !== "" && (
          <p className="text-sm text-day/60">{supplement.nota}</p>
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
    <div className="flex flex-col">
      <h3 id={id} className="pt-3 text-xs font-bold tracking-plot text-day/60 uppercase">
        {title}
      </h3>
      <ul aria-labelledby={id} className="flex flex-col">
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
 * suplementos, la sección entera se omite. La marca ✓ es un cuadro de día;
 * la ✕ va en rojo de cue, siempre con su nombre accesible (14 R23).
 */
export default function SupplementList({ supplements }: SupplementListProps) {
  if (supplements.length === 0) {
    return null;
  }

  const recommended = supplements.filter((supplement) => supplement.recomendado);
  const notWorth = supplements.filter((supplement) => !supplement.recomendado);

  return (
    <section aria-labelledby="suplementos" className="flex flex-col">
      <h2 id="suplementos" className="border-b border-blackout py-2 text-lg font-bold text-day">
        Suplementos
      </h2>
      <Group id="suplementos-recomendados" title="Recomendados" items={recommended} />
      <Group id="suplementos-no-vale" title="No vale la pena" items={notWorth} />
    </section>
  );
}
