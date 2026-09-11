import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChecklistItem from "@/components/ChecklistItem";
import { checklistLabel } from "@/lib/checklist";

const item = { id: "chk-1", item: "Pechuga de pollo", cantidad: "1.6 kg" };

describe("checklistLabel (R8)", () => {
  it("une item y cantidad con un separador medio", () => {
    expect(checklistLabel(item)).toBe("Pechuga de pollo · 1.6 kg");
  });

  it.each([[null], [""], ["   "]])("con cantidad %p devuelve solo el item", (cantidad) => {
    expect(checklistLabel({ item: "Sal", cantidad })).toBe("Sal");
  });

  it("recorta los espacios de la cantidad", () => {
    expect(checklistLabel({ item: "Arroz", cantidad: "  2 kg " })).toBe("Arroz · 2 kg");
  });
});

describe("ChecklistItem (R2, R8, R16)", () => {
  it("es un checkbox accesible con el nombre '<item> · <cantidad>'", () => {
    render(<ChecklistItem item={item} checked={false} onToggle={vi.fn()} />);

    const box = screen.getByRole("checkbox", { name: "Pechuga de pollo · 1.6 kg" });
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(box).toHaveAttribute("type", "button");
  });

  it("sin cantidad, el nombre accesible es solo el item", () => {
    render(
      <ChecklistItem
        item={{ id: "chk-2", item: "Sal de mar", cantidad: null }}
        checked={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Sal de mar" })).toBeInTheDocument();
  });

  it("marcado expone aria-checked=true y tacha el texto", () => {
    render(<ChecklistItem item={item} checked onToggle={vi.fn()} />);

    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Pechuga de pollo · 1.6 kg")).toHaveClass("line-through");
  });

  it("sin marcar, el texto no lleva line-through", () => {
    render(<ChecklistItem item={item} checked={false} onToggle={vi.fn()} />);

    expect(screen.getByText("Pechuga de pollo · 1.6 kg")).not.toHaveClass("line-through");
  });

  it("tocar la fila llama onToggle con el id, una sola vez", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ChecklistItem item={item} checked={false} onToggle={onToggle} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("chk-1");
  });

  it("se activa con el teclado (Enter y Space) (R8)", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ChecklistItem item={item} checked={false} onToggle={onToggle} />);

    await user.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("la fila ocupa el ancho completo y mide ≥ 44px (R16)", () => {
    render(<ChecklistItem item={item} checked={false} onToggle={vi.fn()} />);

    const box = screen.getByRole("checkbox");
    expect(box).toHaveClass("min-h-11");
    expect(box).toHaveClass("w-full");
    expect(box.closest("li")).not.toBeNull();
  });

  it("la caja visual es decorativa para el lector de pantalla", () => {
    const { container } = render(<ChecklistItem item={item} checked onToggle={vi.fn()} />);

    const decor = container.querySelector('[aria-hidden="true"]');
    expect(decor).not.toBeNull();
    expect(decor).toHaveTextContent("✓");
  });
});
