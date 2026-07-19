import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InstructionSteps from "@/components/InstructionSteps";

describe("InstructionSteps (R3)", () => {
  it("renderiza los pasos como <ol> numerado en el orden recibido", () => {
    render(<InstructionSteps steps={["Primer paso", "Segundo paso", "Tercer paso"]} />);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(list).toHaveClass("list-decimal");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Primer paso",
      "Segundo paso",
      "Tercer paso",
    ]);
  });

  it("caso borde: sin pasos muestra un aviso en español en lugar de lista vacía", () => {
    render(<InstructionSteps steps={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("Sin instrucciones disponibles")).toBeInTheDocument();
  });
});
