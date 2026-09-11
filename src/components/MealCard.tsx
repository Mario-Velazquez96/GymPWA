import { formatHora } from "@/lib/diet";
import type { DietMeal } from "@/lib/types";

interface MealCardProps {
  meal: DietMeal;
}

/**
 * Una comida del plan (R12): título con hora, línea de kcal/proteína (partes
 * nulas omitidas sin separadores huérfanos), renglones y notas.
 */
export default function MealCard({ meal }: MealCardProps) {
  const heading = meal.hora === null ? meal.title : `${meal.title} · ${formatHora(meal.hora)}`;

  const macroParts: string[] = [];
  if (meal.kcal !== null) {
    macroParts.push(`${meal.kcal} kcal`);
  }
  if (meal.proteina_g !== null) {
    macroParts.push(`${meal.proteina_g} g proteína`);
  }

  return (
    <article className="flex flex-col gap-2 rounded-xl bg-slate-800 p-4">
      <h3 className="text-lg leading-tight font-semibold text-slate-50">{heading}</h3>
      {macroParts.length > 0 && <p className="text-sm text-slate-300">{macroParts.join(" · ")}</p>}
      {meal.items.length > 0 && (
        <ul className="list-disc pl-5 text-base text-slate-200">
          {meal.items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
      {meal.notes !== null && meal.notes !== "" && (
        <p className="text-sm text-slate-400">{meal.notes}</p>
      )}
    </article>
  );
}
