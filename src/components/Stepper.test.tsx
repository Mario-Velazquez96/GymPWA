import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Stepper from "@/components/Stepper";

const onChange = vi.fn();

function renderStepper(props: Partial<Parameters<typeof Stepper>[0]> = {}) {
  render(
    <Stepper
      label="Peso serie 1"
      value={20}
      step={2.5}
      min={0}
      unit="kg"
      onChange={onChange}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Stepper — botones ± (R4)", () => {
  it("muestra el valor con unidad y suma el paso con '+'", async () => {
    renderStepper();

    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("20 kg");
    await userEvent.click(screen.getByRole("button", { name: "Aumentar Peso serie 1" }));

    expect(onChange).toHaveBeenCalledWith(22.5);
  });

  it("resta el paso con '−'", async () => {
    renderStepper({ value: 22.5 });

    await userEvent.click(screen.getByRole("button", { name: "Disminuir Peso serie 1" }));

    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("clampa al mínimo: 1 rep − 1 no baja de 1", async () => {
    renderStepper({ label: "Repeticiones serie 1", value: 1, step: 1, min: 1, unit: undefined });

    await userEvent.click(screen.getByRole("button", { name: "Disminuir Repeticiones serie 1" }));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("clampa al mínimo de peso: 0 kg − 2.5 no baja de 0", async () => {
    renderStepper({ value: 0 });

    await userEvent.click(screen.getByRole("button", { name: "Disminuir Peso serie 1" }));

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("sin unidad muestra solo el número (reps)", () => {
    renderStepper({ label: "Repeticiones serie 1", value: 10, step: 1, min: 1, unit: undefined });

    expect(screen.getByRole("button", { name: "Repeticiones serie 1" })).toHaveTextContent("10");
  });

  it("los tres targets táctiles miden ≥ 44px (min-h-11 / min-w-11)", () => {
    renderStepper();

    const minus = screen.getByRole("button", { name: "Disminuir Peso serie 1" });
    const plus = screen.getByRole("button", { name: "Aumentar Peso serie 1" });
    const center = screen.getByRole("button", { name: "Peso serie 1" });
    expect(minus).toHaveClass("min-h-11", "min-w-11");
    expect(plus).toHaveClass("min-h-11", "min-w-11");
    expect(center).toHaveClass("min-h-11");
  });

  it("deshabilitado no dispara onChange ni abre el input", async () => {
    renderStepper({ disabled: true });

    const plus = screen.getByRole("button", { name: "Aumentar Peso serie 1" });
    const center = screen.getByRole("button", { name: "Peso serie 1" });
    expect(plus).toBeDisabled();
    expect(center).toBeDisabled();
    await userEvent.click(plus).catch(() => undefined);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("Stepper — entrada numérica directa (R4)", () => {
  it("tap al valor abre un input inputmode=decimal y Enter confirma", async () => {
    renderStepper();

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    expect(input).toHaveAttribute("inputmode", "decimal");

    await userEvent.clear(input);
    await userEvent.type(input, "27.5{Enter}");

    expect(onChange).toHaveBeenCalledWith(27.5);
  });

  it("blur también confirma el valor tecleado", async () => {
    renderStepper();

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "40");
    await userEvent.tab();

    expect(onChange).toHaveBeenCalledWith(40);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("acepta coma decimal ('22,5' → 22.5)", async () => {
    renderStepper();

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "22,5{Enter}");

    expect(onChange).toHaveBeenCalledWith(22.5);
  });

  it("clampa la entrada directa al mínimo ('-5' con min 0 → 0)", async () => {
    renderStepper();

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "-5{Enter}");

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("entrada no numérica revierte sin llamar onChange", async () => {
    renderStepper();

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "abc{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("20 kg");
  });

  it("entrada vacía revierte sin llamar onChange", async () => {
    renderStepper();

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.tab();

    expect(onChange).not.toHaveBeenCalled();
  });
});
