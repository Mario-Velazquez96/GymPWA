import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Sin `globals: true`, RTL no registra su auto-cleanup — lo hacemos explícito.
afterEach(() => {
  cleanup();
});
