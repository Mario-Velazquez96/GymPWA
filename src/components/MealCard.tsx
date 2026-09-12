import { formatHora } from "@/lib/diet";
import type { DietMeal } from "@/lib/types";

interface MealCardProps {
  meal: DietMeal;
}

/**
 * Una comida del plan (R12): título con hora, línea de kcal/proteína (partes
 * nulas omitidas sin separadores huérfanos), renglones y notas. Banda
 * nocturna con costura de apagón (14 R23), sin radio ni relleno.
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
    <article className="flex flex-col gap-2 border-b border-blackout py-3">
      <h3 className="text-lg leading-tight font-bold text-day">{heading}</h3>
      {macroParts.length > 0 && (
        <p className="text-sm text-day/60 tabular-nums">{macroParts.join(" · ")}</p>
      )}
      {meal.items.length > 0 && (
        <ul className="list-disc pl-5 text-base text-day/90 marker:text-dawn-rose">
          {meal.items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
      {meal.notes !== null && meal.notes !== "" && (
        <p className="text-sm text-day/60">{meal.notes}</p>
      )}
    </article>
  );
}
