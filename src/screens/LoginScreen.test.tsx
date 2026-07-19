import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  signIn: mocks.signIn,
}));

import LoginScreen from "@/screens/LoginScreen";

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Correo"), email);
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  return user;
}

describe("LoginScreen (R2, R3, R7)", () => {
  it("renderiza inputs con label y targets ≥ 44px (min-h-11) (R7)", () => {
    render(<LoginScreen />);

    const email = screen.getByLabelText("Correo");
    const password = screen.getByLabelText("Contraseña");
    const button = screen.getByRole("button", { name: "Entrar" });

    expect(email).toHaveAttribute("type", "email");
    expect(email).toBeRequired();
    expect(password).toHaveAttribute("type", "password");
    expect(password).toBeRequired();
    expect(email.className).toContain("min-h-11");
    expect(password.className).toContain("min-h-11");
    expect(button.className).toContain("min-h-11");
  });

  it("envía las credenciales a signIn (R2)", async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    render(<LoginScreen />);

    await fillAndSubmit("mario@ejemplo.com", "secreta");

    expect(mocks.signIn).toHaveBeenCalledWith("mario@ejemplo.com", "secreta");
  });

  it("deshabilita el botón y muestra 'Entrando…' mientras la petición está en vuelo (R7)", async () => {
    let resolveSignIn: (value: { error: string | null }) => void = () => undefined;
    mocks.signIn.mockImplementation(
      () =>
        new Promise<{ error: string | null }>((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    render(<LoginScreen />);

    await fillAndSubmit("mario@ejemplo.com", "secreta");

    const pendingButton = screen.getByRole("button", { name: "Entrando…" });
    expect(pendingButton).toBeDisabled();

    resolveSignIn({ error: "Correo o contraseña incorrectos" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    });
  });

  it("muestra el error en español inline cuando signIn falla y permanece en el formulario (R3)", async () => {
    mocks.signIn.mockResolvedValue({ error: "Correo o contraseña incorrectos" });
    render(<LoginScreen />);

    await fillAndSubmit("mario@ejemplo.com", "incorrecta");

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos");
    // El formulario sigue presente y editable (no navegó).
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("limpia el error anterior al reintentar y no lo muestra en éxito (R2, R3)", async () => {
    mocks.signIn.mockResolvedValueOnce({ error: "Error de conexión, reintenta" });
    render(<LoginScreen />);

    const user = await fillAndSubmit("mario@ejemplo.com", "secreta");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error de conexión, reintenta");

    mocks.signIn.mockResolvedValueOnce({ error: null });
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    // En éxito el botón queda deshabilitado hasta que el guard redirige.
    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled();
  });
});
