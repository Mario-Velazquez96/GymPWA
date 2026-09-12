import type { DietPlan } from "@/lib/types";

interface MacroSummaryProps {
  plan: Pick<DietPlan, "kcal_objetivo" | "proteina_g" | "carbohidrato_g" | "grasa_g">;
}

interface Tile {
  label: string;
  value: number;
  unit: "kcal" | "g";
}

/**
 * Los cuatro macros del día de un vistazo (R6): `<dl>` de cuatro columnas que
 * cabe en el primer viewport de un iPhone (390 px) sin scroll. Presentacional.
 * Cuatro casillas nocturnas separadas por 1 px (14 R21): etiqueta en kicker,
 * numeral tabular grande blanco sobre negro.
 */
export default function MacroSummary({ plan }: MacroSummaryProps) {
  const tiles: Tile[] = [
    { label: "Calorías", value: plan.kcal_objetivo, unit: "kcal" },
    { label: "Proteína", value: plan.proteina_g, unit: "g" },
    { label: "Carbohidrato", value: plan.carbohidrato_g, unit: "g" },
    { label: "Grasa", value: plan.grasa_g, unit: "g" },
  ];

  return (
    <dl aria-label="Macros del día" className="grid grid-cols-4 gap-px">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col items-center border border-blackout bg-cyc-black px-1 py-3 text-center"
        >
          <dt className="text-xs font-bold tracking-plot text-day/60 uppercase">{tile.label}</dt>
          <dd className="mt-1 leading-tight">
            <span className="text-2xl font-extrabold text-day tabular-nums">{tile.value}</span>{" "}
            <span className="text-xs text-day/60">{tile.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
