import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/auth", () => ({
  signOut: mocks.signOut,
}));

import AppHeader from "@/components/AppHeader";

describe("AppHeader (R5)", () => {
  it("muestra el título y el botón 'Cerrar sesión' con target ≥ 44px", () => {
    render(<AppHeader />);

    expect(screen.getByText("Rutinas Gym")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(button.className).toContain("min-h-11");
  });

  it("al pulsar 'Cerrar sesión' llama a signOut (R5)", async () => {
    const user = userEvent.setup();
    render(<AppHeader />);

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("AppHeader — 14 ciclorama (R7)", () => {
  it("la marca es un kicker (mayúsculas por CSS, DOM 'Rutinas Gym') y el botón mide ≥ 44px", () => {
    render(<AppHeader />);

    const brand = screen.getByText("Rutinas Gym");
    expect(brand).toHaveClass("uppercase", "tracking-plot", "font-bold");
    expect(brand.textContent).toBe("Rutinas Gym");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toHaveClass("min-h-11");
  });

  it("la franja es negra con costura de apagón, sin radios ni sombras", () => {
    render(<AppHeader />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-cyc-black", "border-blackout", "min-h-11");
  });
});

describe("AppHeader — correcciones de la revisión de cierre (finish-review-14)", () => {
  it("fix 7: marca y 'Cerrar sesión' comparten la columna de 448 px del contenido", () => {
    render(<AppHeader />);

    const header = screen.getByRole("banner");
    const column = screen.getByText("Rutinas Gym").parentElement;
    expect(column).not.toBeNull();
    expect(column).toHaveClass("mx-auto", "w-full", "max-w-md", "justify-between");
    expect(column).toContainElement(screen.getByRole("button", { name: "Cerrar sesión" }));
    // La franja negra sigue siendo de ancho completo (solo el contenido se acota).
    expect(header).toHaveClass("bg-cyc-black", "min-h-11");
    expect(header).not.toHaveClass("max-w-md");
  });
});
