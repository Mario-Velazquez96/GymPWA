import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollapsibleSection from "@/components/CollapsibleSection";

function renderSection(): HTMLDetailsElement {
  const { container } = render(
    <CollapsibleSection title="Reglas del plan">
      <p>Proteína en cada comida</p>
    </CollapsibleSection>,
  );
  const details = container.querySelector("details");
  if (details === null) {
    throw new Error("CollapsibleSection no renderizó un <details>");
  }
  return details;
}

describe("CollapsibleSection (R14)", () => {
  it("es un <details> cerrado por defecto con el título en el <summary>", () => {
    const details = renderSection();

    expect(details.open).toBe(false);
    expect(details.querySelector("summary")).toHaveTextContent("Reglas del plan");
  });

  it("el <summary> mide al menos 44px de alto (min-h-11)", () => {
    const details = renderSection();

    expect(details.querySelector("summary")).toHaveClass("min-h-11");
  });

  it("al tocar el título se abre y muestra el contenido", async () => {
    const user = userEvent.setup();
    const details = renderSection();

    await user.click(screen.getByText("Reglas del plan"));

    expect(details.open).toBe(true);
    expect(screen.getByText("Proteína en cada comida")).toBeVisible();
  });

  it("al tocarlo de nuevo se vuelve a cerrar", async () => {
    const user = userEvent.setup();
    const details = renderSection();
    const summary = screen.getByText("Reglas del plan");

    await user.click(summary);
    await user.click(summary);

    expect(details.open).toBe(false);
  });

  it("renderiza el contenido recibido como hijo (no lo interpreta)", () => {
    render(
      <CollapsibleSection title="Rotación semanal">
        <span data-testid="hijo">contenido arbitrario</span>
      </CollapsibleSection>,
    );

    expect(screen.getByTestId("hijo")).toBeInTheDocument();
  });
});

describe("CollapsibleSection — 14 ciclorama (R24)", () => {
  it("es una banda nocturna y el chevron gira 90° en 150 ms con corte en reduced-motion", () => {
    const details = renderSection();

    expect(details).toHaveClass("border-y", "border-blackout", "bg-cyc-black");
    expect(details.querySelector("summary")).toHaveClass("min-h-11", "font-bold", "text-day");
    const chevron = details.querySelector('[aria-hidden="true"]');
    expect(chevron).toHaveClass(
      "transition-transform",
      "duration-150",
      "motion-reduce:transition-none",
      "group-open:rotate-90",
      "text-day/60",
    );
  });
});
