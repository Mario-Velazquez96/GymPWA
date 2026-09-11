import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import OfflineBanner from "@/components/OfflineBanner";

describe("OfflineBanner (R12, R13)", () => {
  it("anuncia con role=status el plan guardado y su fecha local (R12, R13)", () => {
    render(<OfflineBanner savedAt="2026-09-10T15:15:00Z" />);

    const banner = screen.getByRole("status");
    // La abreviatura del mes varía entre versiones de ICU ("sep" / "sept").
    expect(banner).toHaveTextContent(/^Sin conexión · plan guardado el 10 sept? 09:15$/);
  });

  it("con un ISO inválido degrada a un texto sin fecha, sin romper (R13)", () => {
    render(<OfflineBanner savedAt="no-es-fecha" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sin conexión · plan guardado en este dispositivo",
    );
  });

  it("es un párrafo discreto (no roba el foco ni ocupa el alto de un botón)", () => {
    render(<OfflineBanner savedAt="2026-09-10T15:15:00Z" />);

    const banner = screen.getByRole("status");
    expect(banner.tagName).toBe("P");
    expect(banner).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
