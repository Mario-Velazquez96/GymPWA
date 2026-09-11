import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Markdown from "@/components/Markdown";

describe("Markdown (R15)", () => {
  it("renderiza negritas como <strong> sin dejar asteriscos visibles", () => {
    const { container } = render(<Markdown source="**Proteína** primero" />);

    expect(container.querySelector("strong")).toHaveTextContent("Proteína");
    expect(container.textContent).not.toContain("**");
  });

  it("renderiza listas no ordenadas como <ul>/<li> sin guiones literales", () => {
    const { container } = render(<Markdown source={"- Huevos\n- Avena\n- Plátano"} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Huevos", "Avena", "Plátano"]);
    expect(container.textContent).not.toContain("- Huevos");
  });

  it("renderiza listas ordenadas como <ol>", () => {
    const { container } = render(<Markdown source={"1. Pesa la avena\n2. Cocina el pollo"} />);

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renderiza tablas GFM como <table> dentro de un contenedor con scroll horizontal", () => {
    const source = ["| Día | Comida |", "| --- | --- |", "| Lunes | Pollo |"].join("\n");

    const { container } = render(<Markdown source={source} />);

    const table = screen.getByRole("table");
    expect(table.parentElement).toHaveClass("overflow-x-auto");
    expect(within(table).getByRole("columnheader", { name: "Día" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "Lunes" })).toBeInTheDocument();
    expect(container.textContent).not.toContain("|");
  });

  it("descarta el HTML crudo del texto en vez de ejecutarlo", () => {
    const { container } = render(
      <Markdown source={"Antes\n\n<script>alert(1)</script>\n\n<b>negrita</b> después"} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("Antes");
  });

  it("con una cadena vacía no rompe ni renderiza contenido", () => {
    const { container } = render(<Markdown source="" />);

    expect(container.textContent).toBe("");
  });
});
