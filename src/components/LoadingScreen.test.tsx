import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingScreen from "@/components/LoadingScreen";

describe("LoadingScreen — 14 ciclorama (R12, R27)", () => {
  it("anuncia 'Cargando…' con role=status sobre el suelo nocturno", () => {
    render(<LoadingScreen />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Cargando…");
    expect(status).toHaveClass("animate-pulse", "motion-reduce:animate-none", "text-day/60");
    expect(screen.getByRole("main")).toHaveClass("bg-cyc-black", "text-day");
  });
});
