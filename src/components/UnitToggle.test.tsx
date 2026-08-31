import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnitToggle from "@/components/UnitToggle";

const onChange = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UnitToggle (08 R1)", () => {
  it("renderiza el grupo 'Unidad de peso' con las opciones kg y lb", () => {
    render(<UnitToggle unit="kg" onChange={onChange} />);

    const group = screen.getByRole("group", { name: "Unidad de peso" });
    expect(within(group).getByRole("button", { name: "kg" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "lb" })).toBeInTheDocument();
  });

  it("marca la unidad activa con aria-pressed y deja la otra en false", () => {
    render(<UnitToggle unit="lb" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "lb" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "kg" })).toHaveAttribute("aria-pressed", "false");
  });

  it("en kg el marcado se invierte", () => {
    render(<UnitToggle unit="kg" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "kg" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "lb" })).toHaveAttribute("aria-pressed", "false");
  });

  it("tocar 'lb' emite el cambio de unidad", async () => {
    render(<UnitToggle unit="kg" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "lb" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("lb");
  });

  it("tocar 'kg' desde lb emite el cambio de vuelta", async () => {
    render(<UnitToggle unit="lb" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "kg" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("kg");
  });

  it("tocar la unidad ya activa también emite (idempotente para el caller)", async () => {
    render(<UnitToggle unit="kg" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "kg" }));

    expect(onChange).toHaveBeenCalledWith("kg");
  });

  it("ambos botones cumplen el mínimo táctil de 44px", () => {
    render(<UnitToggle unit="kg" onChange={onChange} />);

    for (const name of ["kg", "lb"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("min-h-11");
      expect(button).toHaveClass("min-w-11");
    }
  });
});
