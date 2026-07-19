import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfigError from "@/components/ConfigError";

describe("ConfigError (R5)", () => {
  it("muestra el título del error en español", () => {
    render(<ConfigError />);
    expect(screen.getByRole("heading", { name: "Error de configuración" })).toBeInTheDocument();
  });

  it("menciona las dos variables de entorno faltantes", () => {
    render(<ConfigError />);
    expect(screen.getByText("VITE_SUPABASE_URL")).toBeInTheDocument();
    expect(screen.getByText("VITE_SUPABASE_ANON_KEY")).toBeInTheDocument();
  });

  it("indica cómo corregirlo (.env.example → .env.local)", () => {
    render(<ConfigError />);
    expect(screen.getByText(".env.example")).toBeInTheDocument();
    expect(screen.getByText(".env.local")).toBeInTheDocument();
  });
});
