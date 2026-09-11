import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  DietChecklistItem,
  DietMeal,
  DietPlanFull,
  DietSection,
  DietSupplement,
} from "@/lib/types";

/** Hooks mockeados en su frontera: la pantalla solo compone (R20). */
vi.mock("@/hooks/useDietPlan", () => ({ useDietPlan: vi.fn() }));
vi.mock("@/hooks/useNowMinutes", () => ({ useNowMinutes: vi.fn() }));

import { useDietPlan } from "@/hooks/useDietPlan";
import { useNowMinutes } from "@/hooks/useNowMinutes";
import DietScreen from "@/screens/DietScreen";

const mockUseDietPlan = vi.mocked(useDietPlan);
const mockUseNowMinutes = vi.mocked(useNowMinutes);
const retry = vi.fn();

function makeMeal(overrides: Partial<DietMeal> = {}): DietMeal {
  return {
    id: "meal-1",
    diet_plan_id: "diet-1",
    position: 1,
    title: "Desayuno fuerte",
    hora: "10:00:00",
    kcal: 1050,
    proteina_g: 85,
    items: ["4 huevos enteros"],
    notes: null,
    ...overrides,
  };
}

const supplement: DietSupplement = {
  id: "sup-1",
  diet_plan_id: "diet-1",
  position: 1,
  nombre: "Creatina monohidratada",
  dosis: "5 g",
  momento: "Diario",
  nota: null,
  recomendado: true,
};

const section: DietSection = {
  id: "sec-1",
  diet_plan_id: "diet-1",
  position: 1,
  kind: "reglas",
  title: "Reglas del plan",
  body_md: "**Proteína** en cada comida",
};

function makePlan(overrides: Partial<DietPlanFull> = {}): DietPlanFull {
  return {
    id: "diet-1",
    user_id: "user-1",
    name: "Recomposición — Septiembre 2026",
    goal: null,
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "active",
    kcal_objetivo: 2000,
    proteina_g: 160,
    carbohidrato_g: 195,
    grasa_g: 65,
    ventana_inicio: "10:00:00",
    ventana_fin: "18:00:00",
    created_at: "2026-09-01T00:00:00Z",
    diet_meals: [
      makeMeal(),
      makeMeal({ id: "meal-2", position: 2, title: "Comida", hora: "14:00:00" }),
    ],
    diet_checklist_items: [
      {
        id: "chk-1",
        diet_plan_id: "diet-1",
        kind: "meal_prep",
        position: 1,
        categoria: null,
        item: "Cocer 1.6 kg de pollo",
        cantidad: "1.6 kg",
      },
    ],
    diet_supplements: [supplement],
    diet_sections: [section],
    ...overrides,
  };
}

/** Estado devuelto por `useDietPlan` para el caso bajo prueba. */
function mockState(state: Partial<ReturnType<typeof useDietPlan>>): void {
  mockUseDietPlan.mockReturnValue({
    loading: false,
    error: null,
    plan: null,
    isStale: false,
    savedAt: null,
    retry,
    ...state,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNowMinutes.mockReturnValue(9 * 60); // 09:00 en America/Mexico_City
});

afterEach(() => {
  localStorage.clear();
});

/** El `<details>` cuyo `<summary>` dice `title`, o `null` si no existe (R12, R13). */
function detailsFor(title: string): HTMLDetailsElement | null {
  const summary = screen.queryAllByText(title).find((node) => node.closest("summary") !== null);
  return summary?.closest("details") ?? null;
}

/** `true` si `a` precede a `b` en el DOM. */
function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("DietScreen — estados (R16, R17, R18)", () => {
  it("mientras carga muestra el aviso con role=status y nada del plan (R16)", () => {
    mockState({ loading: true });

    render(<DietScreen />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando dieta…");
    expect(screen.queryByText("Comidas")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Dieta" })).toBeInTheDocument();
  });

  it("sin plan activo muestra el mensaje vacío en español (R17)", () => {
    mockState({ plan: null });

    render(<DietScreen />);

    expect(screen.getByText("Aún no tienes un plan de dieta asignado")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("el estado vacío no ensucia la consola (criterio 8) (R17)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockState({ plan: null });

    render(<DietScreen />);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("ante un error muestra el mensaje con role=alert y un botón táctil (R18)", () => {
    mockState({ error: "No se pudo cargar la dieta" });

    render(<DietScreen />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la dieta");
    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveClass("min-h-11");
  });

  it("el botón Reintentar vuelve a pedir el plan al hook (R18)", async () => {
    const user = userEvent.setup();
    mockState({ error: "No se pudo cargar la dieta" });

    render(<DietScreen />);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("DietScreen — plan activo (R6, R19)", () => {
  beforeEach(() => {
    mockState({ plan: makePlan() });
  });

  it("muestra macros, ventana, comidas, suplementos y secciones", () => {
    const { container } = render(<DietScreen />);

    expect(container.querySelector('dl[aria-label="Macros del día"]')).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Ventana de alimentación 10:00–18:00" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Comidas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Suplementos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Más del plan" })).toBeInTheDocument();
    expect(screen.getByText("Recomposición — Septiembre 2026")).toBeInTheDocument();
  });

  it("respeta el orden macros → ventana → comidas → suplementos → secciones (R19)", () => {
    const { container } = render(<DietScreen />);

    const macros = container.querySelector('dl[aria-label="Macros del día"]');
    expect(macros).not.toBeNull();
    const nodes: Element[] = [
      macros as Element,
      screen.getByRole("heading", { name: /Ventana de alimentación/ }),
      screen.getByRole("heading", { level: 2, name: "Comidas" }),
      screen.getByRole("heading", { level: 2, name: "Suplementos" }),
      screen.getByRole("heading", { level: 2, name: "Más del plan" }),
    ];

    for (let i = 0; i < nodes.length - 1; i += 1) {
      const follows =
        nodes[i].compareDocumentPosition(nodes[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING;
      expect(follows).toBeTruthy();
    }
  });

  it("pinta una tarjeta por comida en el orden recibido (R12)", () => {
    render(<DietScreen />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Desayuno fuerte · 10:00");
    expect(headings[1]).toHaveTextContent("Comida · 14:00");
  });

  it("calcula el estado de la ventana con la hora del hook (R8, R10)", () => {
    render(<DietScreen />);

    expect(
      screen.getByText("Fuera de la ventana · faltan 60 min para Desayuno fuerte (10:00)"),
    ).toBeInTheDocument();
  });

  // 10 R19 pedía que los `diet_checklist_items` llegaran cargados pero SIN
  // pintar (la pantalla era solo lectura). 11 R9 los pinta: esta aserción es la
  // versión actualizada del mismo caso.
  it("renderiza los diet_checklist_items cargados dentro de su lista (11 R9)", () => {
    render(<DietScreen />);

    expect(detailsFor("Qué cocinar")).not.toBeNull();
    expect(
      screen.getByRole("checkbox", { name: "Cocer 1.6 kg de pollo · 1.6 kg" }),
    ).toBeInTheDocument();
  });

  it("las secciones se renderizan cerradas y con el Markdown interpretado (R14, R15)", () => {
    const { container } = render(<DietScreen />);

    const details = detailsFor("Reglas del plan");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(container.querySelector("strong")).toHaveTextContent("Proteína");
    expect(container.textContent).not.toContain("**");
  });

  it("reserva espacio para la barra inferior con pb-24 (R3)", () => {
    render(<DietScreen />);

    expect(screen.getByRole("main")).toHaveClass("pb-24");
  });
});

describe("DietScreen — plan con datos parciales (R9, R12, R13)", () => {
  it("sin comidas muestra el aviso correspondiente (R12)", () => {
    mockState({ plan: makePlan({ diet_meals: [] }) });

    render(<DietScreen />);

    expect(screen.getByText("Este plan no tiene comidas")).toBeInTheDocument();
  });

  it("sin suplementos omite la sección entera (R13)", () => {
    mockState({ plan: makePlan({ diet_supplements: [] }) });

    render(<DietScreen />);

    expect(screen.queryByRole("heading", { name: "Suplementos" })).not.toBeInTheDocument();
  });

  it("sin secciones omite el bloque final (R14)", () => {
    mockState({ plan: makePlan({ diet_sections: [] }) });

    render(<DietScreen />);

    expect(screen.queryByRole("heading", { name: "Más del plan" })).not.toBeInTheDocument();
  });

  it("sin ventana de ayuno lo dice y no inventa horas (R9)", () => {
    mockState({ plan: makePlan({ ventana_inicio: null, ventana_fin: null }) });

    render(<DietScreen />);

    expect(screen.getByText("Este plan no tiene ventana de ayuno")).toBeInTheDocument();
    expect(screen.queryByText(/Fuera de la ventana|Dentro de la ventana/)).not.toBeInTheDocument();
  });
});

/* ── 11_diet_checklists: listas tachables (R2, R3, R6, R7, R9–R14) ────────── */

const rotacionSection: DietSection = {
  id: "sec-rot",
  diet_plan_id: "diet-1",
  position: 2,
  kind: "rotacion",
  title: "Rotación de la semana",
  body_md: "| Día | Comida |\n| --- | --- |\n| Lunes | Tinga |",
};

function makeCheck(overrides: Partial<DietChecklistItem> = {}): DietChecklistItem {
  return {
    id: "chk-x",
    diet_plan_id: "diet-1",
    kind: "super",
    position: 1,
    categoria: null,
    item: "Renglón",
    cantidad: null,
    ...overrides,
  };
}

/** Meal prep DESORDENADO a propósito: la pantalla debe ordenarlo por position. */
const mealPrepItems: DietChecklistItem[] = [
  makeCheck({ id: "m3", kind: "meal_prep", position: 3, item: "Porcionar en táper" }),
  makeCheck({ id: "m1", kind: "meal_prep", position: 1, item: "Pechuga", cantidad: "1.6 kg" }),
  makeCheck({ id: "m2", kind: "meal_prep", position: 2, item: "Arroz integral" }),
];

const superItems: DietChecklistItem[] = [
  makeCheck({ id: "s1", position: 1, categoria: "Proteínas", item: "Pollo", cantidad: "2 kg" }),
  makeCheck({ id: "s2", position: 2, categoria: "Despensa", item: "Arroz" }),
  makeCheck({ id: "s3", position: 3, categoria: "Proteínas", item: "Huevo" }),
  makeCheck({ id: "s4", position: 4, categoria: "Frutas y verduras", item: "Espinaca" }),
  makeCheck({ id: "s5", position: 5, categoria: "Despensa", item: "Avena" }),
  makeCheck({ id: "s6", position: 6, categoria: null, item: "Sal" }),
];

/** Plan completo de 11: meal prep + súper + rotación + una sección normal. */
function makeFullPlan(overrides: Partial<DietPlanFull> = {}): DietPlanFull {
  return makePlan({
    diet_checklist_items: [...mealPrepItems, ...superItems],
    diet_sections: [section, rotacionSection],
    ...overrides,
  });
}

describe("DietScreen — Qué cocinar (R9, R11, R12)", () => {
  beforeEach(() => {
    mockState({ plan: makeFullPlan() });
  });

  it("pinta la sección cerrada, con el meal prep en orden de position (R9, R12)", () => {
    render(<DietScreen />);

    const details = detailsFor("Qué cocinar");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    const boxes = within(details as HTMLElement).getAllByRole("checkbox");
    expect(boxes.map((box) => box.textContent)).toEqual([
      "Pechuga · 1.6 kg",
      "Arroz integral",
      "Porcionar en táper",
    ]);
  });

  it("la rotación va DENTRO de la misma sección y DESPUÉS del último renglón (R11)", () => {
    render(<DietScreen />);

    const details = detailsFor("Qué cocinar") as HTMLElement;
    const heading = screen.getByRole("heading", { level: 3, name: "Rotación de la semana" });
    expect(heading.closest("details")).toBe(details);

    const boxes = within(details).getAllByRole("checkbox");
    expect(precedes(boxes[boxes.length - 1], heading)).toBe(true);
  });

  it("la rotación se interpreta como tabla, sin pipes crudos (R11)", () => {
    render(<DietScreen />);

    const details = detailsFor("Qué cocinar") as HTMLElement;
    expect(details.querySelector("table")).not.toBeNull();
    expect(within(details).getByText("Tinga")).toBeInTheDocument();
    const lines = (details.textContent ?? "").split("\n");
    expect(lines.some((line) => line.trim().startsWith("|"))).toBe(false);
  });

  it("la rotación ya NO aparece entre las colapsables de 'Más del plan' (R11)", () => {
    render(<DietScreen />);

    const masDelPlan = screen.getByRole("heading", { level: 2, name: "Más del plan" })
      .parentElement as HTMLElement;
    expect(within(masDelPlan).getByText("Reglas del plan")).toBeInTheDocument();
    expect(within(masDelPlan).queryByText("Rotación de la semana")).not.toBeInTheDocument();
  });

  it("con varias secciones de rotación las pinta en orden de position asc (R11)", () => {
    mockState({
      plan: makeFullPlan({
        diet_sections: [
          { ...rotacionSection, id: "rot-b", position: 5, title: "Rotación B" },
          { ...rotacionSection, id: "rot-a", position: 3, title: "Rotación A" },
        ],
      }),
    });

    render(<DietScreen />);

    const details = detailsFor("Qué cocinar") as HTMLElement;
    const titles = within(details)
      .getAllByRole("heading", { level: 3 })
      .map((node) => node.textContent);
    expect(titles).toEqual(["Rotación A", "Rotación B"]);
  });

  it("respeta el orden Suplementos → Qué cocinar → Lista de súper → Más del plan (R12)", () => {
    render(<DietScreen />);

    const nodes: Element[] = [
      screen.getByRole("heading", { level: 2, name: "Suplementos" }),
      detailsFor("Qué cocinar") as Element,
      detailsFor("Lista de súper") as Element,
      screen.getByRole("heading", { level: 2, name: "Más del plan" }),
    ];

    for (let i = 0; i < nodes.length - 1; i += 1) {
      expect(precedes(nodes[i], nodes[i + 1])).toBe(true);
    }
  });
});

describe("DietScreen — Lista de súper (R10, R12)", () => {
  beforeEach(() => {
    mockState({ plan: makeFullPlan() });
  });

  it("arranca cerrada y agrupa por categoría en orden de primera aparición, Otros al final (R10)", () => {
    render(<DietScreen />);

    const details = detailsFor("Lista de súper") as HTMLDetailsElement;
    expect(details.open).toBe(false);

    const headings = within(details)
      .getAllByRole("heading", { level: 3 })
      .map((node) => node.textContent);
    expect(headings).toEqual(["Proteínas", "Despensa", "Frutas y verduras", "Otros"]);
  });

  it("cada renglón cuelga de su grupo y muestra la cantidad cuando la hay (R8, R10)", () => {
    render(<DietScreen />);

    const details = detailsFor("Lista de súper") as HTMLElement;
    const boxes = within(details).getAllByRole("checkbox");
    expect(boxes.map((box) => box.textContent)).toEqual([
      "Pollo · 2 kg",
      "Huevo",
      "Arroz",
      "Avena",
      "Espinaca",
      "Sal",
    ]);
  });

  it("muestra el contador en español y el botón deshabilitado al abrir (R7, R16, R17)", () => {
    render(<DietScreen />);

    const details = detailsFor("Lista de súper") as HTMLElement;
    expect(within(details).getByText("0 de 6 marcados")).toBeInTheDocument();
    expect(within(details).getByRole("button", { name: "Desmarcar todo" })).toBeDisabled();
  });
});

describe("DietScreen — tachado persistido (R2, R3, R6, R14)", () => {
  beforeEach(() => {
    mockState({ plan: makeFullPlan() });
  });

  it("tocar un renglón lo marca y lo guarda en la clave del plan (R2)", async () => {
    const user = userEvent.setup();
    render(<DietScreen />);

    const details = detailsFor("Lista de súper") as HTMLElement;
    const box = within(details).getByRole("checkbox", { name: "Arroz" });
    await user.click(box);

    expect(box).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("gym:diet:check:diet-1:super")).toBe('["s2"]');
    expect(within(details).getByText("1 de 6 marcados")).toBeInTheDocument();
  });

  it("al volver a montar la pantalla el renglón sigue tachado (R3)", async () => {
    const user = userEvent.setup();
    const first = render(<DietScreen />);

    await user.click(
      within(detailsFor("Lista de súper") as HTMLElement).getByRole("checkbox", { name: "Arroz" }),
    );
    first.unmount();

    render(<DietScreen />);

    const details = detailsFor("Lista de súper") as HTMLElement;
    expect(within(details).getByRole("checkbox", { name: "Arroz" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("'Desmarcar todo' limpia SU lista y deja intacta la otra (R6)", async () => {
    const user = userEvent.setup();
    render(<DietScreen />);

    const cocinar = detailsFor("Qué cocinar") as HTMLElement;
    const superList = detailsFor("Lista de súper") as HTMLElement;

    await user.click(within(cocinar).getByRole("checkbox", { name: "Arroz integral" }));
    await user.click(within(superList).getByRole("checkbox", { name: "Arroz" }));
    await user.click(within(superList).getByRole("checkbox", { name: "Sal" }));
    await user.click(within(superList).getByRole("button", { name: "Desmarcar todo" }));

    for (const box of within(superList).getAllByRole("checkbox")) {
      expect(box).toHaveAttribute("aria-checked", "false");
    }
    expect(localStorage.getItem("gym:diet:check:diet-1:super")).toBe("[]");
    expect(localStorage.getItem("gym:diet:check:diet-1:meal_prep")).toBe('["m2"]');
    expect(within(cocinar).getByRole("checkbox", { name: "Arroz integral" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(superList).getByRole("button", { name: "Desmarcar todo" })).toBeDisabled();
  });

  it("un plan nuevo arranca limpio y no toca la clave del anterior (R14)", async () => {
    const user = userEvent.setup();
    const first = render(<DietScreen />);

    await user.click(
      within(detailsFor("Lista de súper") as HTMLElement).getByRole("checkbox", { name: "Arroz" }),
    );
    first.unmount();

    mockState({ plan: makeFullPlan({ id: "diet-2" }) });
    render(<DietScreen />);

    const details = detailsFor("Lista de súper") as HTMLElement;
    expect(within(details).getByText("0 de 6 marcados")).toBeInTheDocument();
    expect(localStorage.getItem("gym:diet:check:diet-1:super")).toBe('["s2"]');
    expect(localStorage.getItem("gym:diet:check:diet-2:super")).toBeNull();
  });
});

describe("DietScreen — omisiones de las listas (R13)", () => {
  it("sin meal prep y sin rotación no existe 'Qué cocinar'", () => {
    mockState({
      plan: makeFullPlan({ diet_checklist_items: superItems, diet_sections: [section] }),
    });

    render(<DietScreen />);

    expect(detailsFor("Qué cocinar")).toBeNull();
  });

  it("sin meal prep pero con rotación, 'Qué cocinar' trae solo el bloque de rotación", () => {
    mockState({ plan: makeFullPlan({ diet_checklist_items: superItems }) });

    render(<DietScreen />);

    const details = detailsFor("Qué cocinar") as HTMLElement;
    expect(within(details).queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      within(details).queryByRole("button", { name: "Desmarcar todo" }),
    ).not.toBeInTheDocument();
    expect(
      within(details).getByRole("heading", { level: 3, name: "Rotación de la semana" }),
    ).toBeInTheDocument();
  });

  it("sin renglones de súper no existe 'Lista de súper'", () => {
    mockState({ plan: makeFullPlan({ diet_checklist_items: mealPrepItems }) });

    render(<DietScreen />);

    expect(detailsFor("Lista de súper")).toBeNull();
    expect(detailsFor("Qué cocinar")).not.toBeNull();
  });

  it("si la única sección es la rotación, 'Más del plan' desaparece (R13, open item D)", () => {
    mockState({ plan: makeFullPlan({ diet_sections: [rotacionSection] }) });

    render(<DietScreen />);

    expect(
      screen.queryByRole("heading", { level: 2, name: "Más del plan" }),
    ).not.toBeInTheDocument();
    expect(detailsFor("Qué cocinar")).not.toBeNull();
  });

  it("sin plan no se pinta ninguna lista ni se escribe ninguna clave (R13, R15)", () => {
    mockState({ plan: null });

    render(<DietScreen />);

    expect(detailsFor("Qué cocinar")).toBeNull();
    expect(detailsFor("Lista de súper")).toBeNull();
    expect(Object.keys(localStorage)).toEqual([]);
  });
});

describe("DietScreen — snapshot sin conexión (12 R12)", () => {
  it("con isStale pinta el banner entre el <h1> y los macros, y el plan completo (R12)", () => {
    mockState({
      plan: makeFullPlan(),
      isStale: true,
      savedAt: "2026-09-10T15:15:00Z",
    });

    const { container } = render(<DietScreen />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/^Sin conexión · plan guardado el 10 sept? 09:15$/);

    const titulo = screen.getByRole("heading", { level: 1, name: "Dieta" });
    const macros = container.querySelector('dl[aria-label="Macros del día"]') as Element;
    expect(precedes(titulo, banner)).toBe(true);
    expect(precedes(banner, macros)).toBe(true);

    // El plan se renderiza idéntico al de una carga con red (R12).
    expect(screen.getByRole("heading", { name: /Ventana de alimentación/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Comidas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Suplementos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Más del plan" })).toBeInTheDocument();
    expect(detailsFor("Qué cocinar")).not.toBeNull();
    expect(detailsFor("Lista de súper")).not.toBeNull();
  });

  it("las listas siguen siendo tachables mostrando el snapshot (R14)", async () => {
    const user = userEvent.setup();
    mockState({
      plan: makeFullPlan(),
      isStale: true,
      savedAt: "2026-09-10T15:15:00Z",
    });

    render(<DietScreen />);
    const details = detailsFor("Lista de súper") as HTMLElement;
    const primero = within(details).getAllByRole("checkbox")[0];
    await user.click(primero);

    expect(primero).toHaveAttribute("aria-checked", "true");
    // El id del snapshot manda sobre la clave de 11: mismo plan, misma clave.
    expect(localStorage.getItem("gym:diet:check:diet-1:super")).toContain("s1");
  });

  it("sin isStale no existe ningún texto 'Sin conexión' (R12)", () => {
    mockState({ plan: makeFullPlan() });

    render(<DietScreen />);

    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
  });

  it("con isStale pero sin savedAt (caso imposible hoy) no se pinta el banner (R12)", () => {
    mockState({ plan: makeFullPlan(), isStale: true, savedAt: null });

    render(<DietScreen />);

    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
  });
});
