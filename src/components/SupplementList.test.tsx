import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SupplementList from "@/components/SupplementList";
import type { DietSupplement } from "@/lib/types";

function makeSupplement(overrides: Partial<DietSupplement> = {}): DietSupplement {
  return {
    id: "sup-1",
    diet_plan_id: "diet-1",
    position: 1,
    nombre: "Creatina monohidratada",
    dosis: "5 g",
    momento: "Diario, con el café de las 7:00",
    nota: "No necesita fase de carga",
    recomendado: true,
    ...overrides,
  };
}

const recomendado = makeSupplement();
const noRecomendado = makeSupplement({
  id: "sup-2",
  position: 2,
  nombre: "Quemador de grasa",
  dosis: null,
  momento: null,
  nota: "Cafeína cara: no aporta nada sobre el déficit",
  recomendado: false,
});

describe("SupplementList (R13)", () => {
  it("agrupa en 'Recomendados' y 'No vale la pena' bajo el encabezado 'Suplementos'", () => {
    render(<SupplementList supplements={[recomendado, noRecomendado]} />);

    expect(screen.getByRole("heading", { level: 2, name: "Suplementos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Recomendados" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "No vale la pena" })).toBeInTheDocument();
  });

  it("cada elemento lleva una marca con etiqueta accesible de recomendación", () => {
    render(<SupplementList supplements={[recomendado, noRecomendado]} />);

    expect(screen.getByRole("img", { name: "Recomendado" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "No recomendado" })).toBeInTheDocument();
  });

  it("muestra nombre, 'dosis · momento' y nota", () => {
    render(<SupplementList supplements={[recomendado]} />);

    const item = within(screen.getByRole("list", { name: "Recomendados" })).getByRole("listitem");
    expect(within(item).getByText("Creatina monohidratada")).toBeInTheDocument();
    expect(within(item).getByText("5 g · Diario, con el café de las 7:00")).toBeInTheDocument();
    expect(within(item).getByText("No necesita fase de carga")).toBeInTheDocument();
  });

  it("omite las partes nulas sin dejar separadores huérfanos", () => {
    render(<SupplementList supplements={[noRecomendado]} />);

    const item = within(screen.getByRole("list", { name: "No vale la pena" })).getByRole(
      "listitem",
    );
    expect(item.textContent).not.toContain("·");
    expect(within(item).getByText("Quemador de grasa")).toBeInTheDocument();
  });

  it("con solo dosis muestra la dosis sin separador", () => {
    render(<SupplementList supplements={[makeSupplement({ momento: null, nota: null })]} />);

    expect(screen.getByText("5 g")).toBeInTheDocument();
  });

  it("respeta el orden recibido dentro de cada grupo (position asc del service)", () => {
    const segundo = makeSupplement({ id: "sup-3", position: 2, nombre: "Cafeína" });

    render(<SupplementList supplements={[recomendado, segundo]} />);

    const items = within(screen.getByRole("list", { name: "Recomendados" })).getAllByRole(
      "listitem",
    );
    expect(items[0]).toHaveTextContent("Creatina monohidratada");
    expect(items[1]).toHaveTextContent("Cafeína");
  });

  it("omite por completo un grupo vacío", () => {
    render(<SupplementList supplements={[recomendado]} />);

    expect(screen.queryByRole("heading", { name: "No vale la pena" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recomendados" })).toBeInTheDocument();
  });

  it("sin suplementos no renderiza la sección", () => {
    const { container } = render(<SupplementList supplements={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Suplementos")).not.toBeInTheDocument();
  });
});

describe("SupplementList — 14 ciclorama (R23)", () => {
  it("✓ es un cuadro de día de 24 px y ✕ va en rojo de cue, con sus nombres accesibles", () => {
    render(<SupplementList supplements={[recomendado, noRecomendado]} />);

    const yes = screen.getByRole("img", { name: "Recomendado" });
    expect(yes).toHaveTextContent("✓");
    expect(yes).toHaveClass("size-6", "bg-day", "text-cyc-black", "font-bold");

    const no = screen.getByRole("img", { name: "No recomendado" });
    expect(no).toHaveTextContent("✕");
    expect(no).toHaveClass("text-cue-fault", "font-bold");
    expect(no).not.toHaveClass("bg-day");
  });

  it("los grupos son kickers y cada renglón una banda con costura de apagón", () => {
    render(<SupplementList supplements={[recomendado]} />);

    expect(screen.getByRole("heading", { level: 3, name: "Recomendados" })).toHaveClass(
      "tracking-plot",
      "uppercase",
      "text-day/60",
    );
    const item = within(screen.getByRole("list", { name: "Recomendados" })).getByRole("listitem");
    expect(item).toHaveClass("border-b", "border-blackout");
    expect(item.className).not.toMatch(/rounded|bg-/);
  });
});
