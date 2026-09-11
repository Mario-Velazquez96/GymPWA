import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

function renderNav(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<BottomNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** La pestaña activa es la que expone `aria-current="page"` (R2). */
function activeLabel(): string | undefined {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" });
  return within(nav)
    .getAllByRole("link")
    .find((link) => link.getAttribute("aria-current") === "page")
    ?.textContent?.trim();
}

describe("BottomNav — estructura (R2)", () => {
  it("es una <nav> etiquetada con exactamente dos pestañas: Hoy y Dieta", () => {
    renderNav("/");

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent?.trim())).toEqual(["Hoy", "Dieta"]);
    expect(within(nav).getByRole("link", { name: "Hoy" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Dieta" })).toHaveAttribute("href", "/dieta");
  });

  it("cada pestaña es táctil (≥ 44px) y ocupa la mitad del ancho", () => {
    renderNav("/");

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    for (const link of within(nav).getAllByRole("link")) {
      expect(link).toHaveClass("min-h-11");
      expect(link.parentElement).toHaveClass("flex-1");
    }
  });

  it("queda fija abajo y respeta el área segura del iPhone", () => {
    renderNav("/");

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(nav).toHaveClass("fixed", "bottom-0", "pb-[env(safe-area-inset-bottom)]");
  });
});

describe("BottomNav — pestaña activa (R2)", () => {
  it.each([
    ["/", "Hoy"],
    ["/ejercicio/abc-123", "Hoy"],
    ["/historial/0001", "Hoy"],
    ["/dieta", "Dieta"],
    ["/dieta/super", "Dieta"],
  ])("en %s la pestaña activa es %s", (route, expected) => {
    renderNav(route);

    expect(activeLabel()).toBe(expected);
  });

  it("solo una pestaña lleva aria-current a la vez", () => {
    renderNav("/dieta");

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
  });
});

describe("BottomNav — navegación (R3)", () => {
  it("tocar 'Dieta' navega del lado del cliente sin recargar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<p>pantalla Hoy</p>} />
          <Route path="/dieta" element={<p>pantalla Dieta</p>} />
        </Routes>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByText("pantalla Hoy")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Dieta" }));

    expect(screen.getByText("pantalla Dieta")).toBeInTheDocument();
    expect(activeLabel()).toBe("Dieta");

    await user.click(screen.getByRole("link", { name: "Hoy" }));

    expect(screen.getByText("pantalla Hoy")).toBeInTheDocument();
    expect(activeLabel()).toBe("Hoy");
  });
});
