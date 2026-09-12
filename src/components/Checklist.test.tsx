import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Checklist from "@/components/Checklist";
import type { DietChecklistItem } from "@/lib/types";

function makeItem(overrides: Partial<DietChecklistItem> = {}): DietChecklistItem {
  return {
    id: "chk-1",
    diet_plan_id: "diet-1",
    kind: "super",
    position: 1,
    categoria: null,
    item: "Pollo",
    cantidad: null,
    ...overrides,
  };
}

const threeItems: DietChecklistItem[] = [
  makeItem({ id: "a", position: 1, item: "Pollo" }),
  makeItem({ id: "b", position: 2, item: "Arroz" }),
  makeItem({ id: "c", position: 3, item: "Huevo" }),
];

/** Renderiza la lista con lo mínimo y devuelve los spies. */
function setup(props: Partial<ComponentProps<typeof Checklist>> = {}) {
  const onToggle = vi.fn();
  const onClearAll = vi.fn();
  const utils = render(
    <Checklist
      title="Lista de súper"
      items={threeItems}
      checked={new Set()}
      onToggle={onToggle}
      onClearAll={onClearAll}
      {...props}
    />,
  );
  return { ...utils, onToggle, onClearAll };
}

describe("Checklist — renglones (R9)", () => {
  it("pinta un checkbox por renglón, en el orden recibido", () => {
    setup();

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    expect(boxes.map((box) => box.textContent)).toEqual(["Pollo", "Arroz", "Huevo"]);
  });

  it("refleja en cada fila el set de marcados que recibe", () => {
    setup({ checked: new Set(["b"]) });

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes[0]).toHaveAttribute("aria-checked", "false");
    expect(boxes[1]).toHaveAttribute("aria-checked", "true");
    expect(boxes[2]).toHaveAttribute("aria-checked", "false");
  });

  it("tocar una fila propaga onToggle con su id (R2)", async () => {
    const user = userEvent.setup();
    const { onToggle } = setup();

    await user.click(screen.getAllByRole("checkbox")[2]);

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("c");
  });

  it("da nombre accesible al bloque con el título recibido", () => {
    setup({ title: "Qué cocinar" });

    expect(screen.getByRole("region", { name: "Qué cocinar" })).toBeInTheDocument();
  });
});

describe("Checklist — contador (R17)", () => {
  it("con nada marcado muestra '0 de 3 marcados'", () => {
    setup();

    expect(screen.getByText("0 de 3 marcados")).toBeInTheDocument();
  });

  it("con dos marcados muestra '2 de 3 marcados'", () => {
    setup({ checked: new Set(["a", "c"]) });

    expect(screen.getByText("2 de 3 marcados")).toBeInTheDocument();
  });

  it("los ids que no están en la lista no inflan el contador (R7)", () => {
    setup({ checked: new Set(["fantasma"]) });

    expect(screen.getByText("0 de 3 marcados")).toBeInTheDocument();
  });
});

describe("Checklist — Desmarcar todo (R6, R7, R16)", () => {
  it("está deshabilitado cuando no hay nada marcado", () => {
    setup();

    expect(screen.getByRole("button", { name: "Desmarcar todo" })).toBeDisabled();
  });

  it("sigue deshabilitado si lo marcado no pertenece a la lista (R7)", () => {
    setup({ checked: new Set(["fantasma"]) });

    expect(screen.getByRole("button", { name: "Desmarcar todo" })).toBeDisabled();
  });

  it("se habilita en cuanto hay un renglón visible marcado", () => {
    setup({ checked: new Set(["b"]) });

    expect(screen.getByRole("button", { name: "Desmarcar todo" })).toBeEnabled();
  });

  it("al tocarlo llama onClearAll", async () => {
    const user = userEvent.setup();
    const { onClearAll } = setup({ checked: new Set(["b"]) });

    await user.click(screen.getByRole("button", { name: "Desmarcar todo" }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("es táctil (≥ 44px) (R16)", () => {
    setup({ checked: new Set(["b"]) });

    expect(screen.getByRole("button", { name: "Desmarcar todo" })).toHaveClass("min-h-11");
  });
});

describe("Checklist — agrupación por categoría (R10)", () => {
  const superItems: DietChecklistItem[] = [
    makeItem({ id: "1", position: 1, categoria: "Proteínas", item: "Pollo" }),
    makeItem({ id: "2", position: 2, categoria: "Despensa", item: "Arroz" }),
    makeItem({ id: "3", position: 3, categoria: "Proteínas", item: "Huevo" }),
    makeItem({ id: "4", position: 4, categoria: null, item: "Sal" }),
  ];

  it("sin el flag no agrupa ni pinta encabezados", () => {
    setup({ items: superItems });

    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("con el flag pinta un h3 por categoría en orden de primera aparición y Otros al final", () => {
    setup({ items: superItems, groupByCategoria: true });

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Proteínas", "Despensa", "Otros"]);
  });

  it("cada grupo contiene sus propios renglones", () => {
    const { container } = setup({ items: superItems, groupByCategoria: true });

    const lists = container.querySelectorAll("ul");
    expect(within(lists[0] as HTMLElement).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(lists[1] as HTMLElement).getAllByRole("checkbox")).toHaveLength(1);
    expect(within(lists[2] as HTMLElement).getByRole("checkbox", { name: "Sal" })).toBeVisible();
  });

  it("si el único grupo es Otros, no pinta encabezado", () => {
    setup({
      items: [makeItem({ id: "1", categoria: null }), makeItem({ id: "2", categoria: "  " })],
      groupByCategoria: true,
    });

    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(screen.queryByText("Otros")).not.toBeInTheDocument();
  });

  it("con una sola categoría con nombre sí pinta su encabezado", () => {
    setup({
      items: [makeItem({ id: "1", categoria: "Despensa" })],
      groupByCategoria: true,
    });

    expect(screen.getByRole("heading", { level: 3, name: "Despensa" })).toBeInTheDocument();
  });
});

describe("Checklist — lista vacía", () => {
  it("muestra '0 de 0 marcados', el botón deshabilitado y ningún renglón", () => {
    setup({ items: [] });

    expect(screen.getByText("0 de 0 marcados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desmarcar todo" })).toBeDisabled();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});

describe("Checklist — 14 ciclorama (R25)", () => {
  it("el contador es un kicker y 'Desmarcar todo' un control secundario que se apaga", () => {
    setup();

    expect(screen.getByText("0 de 3 marcados")).toHaveClass("tracking-plot", "uppercase");
    const clear = screen.getByRole("button", { name: "Desmarcar todo" });
    expect(clear).toBeDisabled();
    expect(clear).toHaveClass("min-h-11", "border-2", "border-day", "disabled:bg-blackout");
    expect(clear).toHaveClass("disabled:text-day/60");
  });

  it("las categorías son kickers y la lista lleva costuras de apagón", () => {
    setup({
      groupByCategoria: true,
      items: [
        makeItem({ id: "a", categoria: "Proteína", item: "Pollo" }),
        makeItem({ id: "b", categoria: "Verdura", item: "Brócoli" }),
      ],
    });

    expect(screen.getByRole("heading", { level: 3, name: "Proteína" })).toHaveClass(
      "tracking-plot",
      "uppercase",
      "text-day/60",
    );
    for (const list of screen.getAllByRole("list")) {
      expect(list).toHaveClass("divide-y", "divide-blackout");
    }
  });
});
