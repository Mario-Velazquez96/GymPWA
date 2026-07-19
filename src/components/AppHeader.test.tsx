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
