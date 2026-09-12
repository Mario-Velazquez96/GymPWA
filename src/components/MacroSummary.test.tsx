import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import MacroSummary from "@/components/MacroSummary";

const plan = {
  kcal_objetivo: 2000,
  proteina_g: 160,
  carbohidrato_g: 195,
  grasa_g: 65,
};

/** El `<dl>` de macros (sin rol ARIA implícito: se localiza por etiqueta + tag). */
function macroList(container: HTMLElement): HTMLDListElement {
  const list = container.querySelector<HTMLDListElement>('dl[aria-label="Macros del día"]');
  if (list === null) {
    throw new Error("MacroSummary no renderizó un <dl> etiquetado");
  }
  return list;
}

function textsOf(list: HTMLElement, selector: "dt" | "dd"): (string | undefined)[] {
  return Array.from(list.querySelectorAll(selector)).map((node) =>
    node.textContent?.replace(/\s+/g, " ").trim(),
  );
}

describe("MacroSummary (R6)", () => {
  it("muestra los cuatro macros etiquetados dentro de un <dl>", () => {
    const { container } = render(<MacroSummary plan={plan} />);

    expect(textsOf(macroList(container), "dt")).toEqual([
      "Calorías",
      "Proteína",
      "Carbohidrato",
      "Grasa",
    ]);
  });

  it("muestra cada valor con su unidad: kcal para calorías y g para los macros", () => {
    const { container } = render(<MacroSummary plan={plan} />);

    expect(textsOf(macroList(container), "dd")).toEqual(["2000 kcal", "160 g", "195 g", "65 g"]);
  });

  it("usa una rejilla de cuatro columnas para que quepan sin scroll en el iPhone", () => {
    const { container } = render(<MacroSummary plan={plan} />);

    expect(macroList(container)).toHaveClass("grid-cols-4");
  });

  it("renderiza valores en cero sin omitir ningún tile", () => {
    const { container } = render(
      <MacroSummary plan={{ kcal_objetivo: 0, proteina_g: 0, carbohidrato_g: 0, grasa_g: 0 }} />,
    );

    expect(textsOf(macroList(container), "dd")).toEqual(["0 kcal", "0 g", "0 g", "0 g"]);
  });
});

describe("MacroSummary — 14 ciclorama (R21)", () => {
  it("casillas nocturnas separadas por 1 px, etiqueta en kicker y numeral tabular grande", () => {
    const { container } = render(<MacroSummary plan={plan} />);

    const list = macroList(container);
    expect(list).toHaveClass("grid-cols-4", "gap-px");
    const tile = list.querySelector("div");
    expect(tile).toHaveClass("bg-cyc-black", "border-blackout");
    expect(list.querySelector("dt")).toHaveClass("tracking-plot", "uppercase", "text-day/60");
    const value = list.querySelector("dd span");
    expect(value).toHaveTextContent("2000");
    expect(value).toHaveClass("text-2xl", "font-extrabold", "tabular-nums", "text-day");
  });
});
