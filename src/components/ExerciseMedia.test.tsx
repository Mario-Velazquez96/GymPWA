import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ExerciseMedia from "@/components/ExerciseMedia";

const props = {
  name: "Press de banca",
  imageUrl: "https://storage.example/0001.png",
  gifUrl: "https://storage.example/0001.gif",
};

describe("ExerciseMedia (R2)", () => {
  it("reserva una caja cuadrada fija para evitar saltos de layout", () => {
    render(<ExerciseMedia {...props} />);

    const box = screen.getByTestId("exercise-media");
    expect(box).toHaveClass("aspect-square");
    expect(box).toHaveClass("max-w-[240px]");
  });

  it("muestra el GIF con alt en español y el thumbnail como placeholder debajo", () => {
    render(<ExerciseMedia {...props} />);

    const gif = screen.getByAltText("Demostración de Press de banca");
    expect(gif).toHaveAttribute("src", props.gifUrl);

    const thumb = screen.getByTestId("exercise-media").querySelector(`img[src="${props.imageUrl}"]`);
    expect(thumb).not.toBeNull();
  });

  it("el GIF arranca invisible (opacity-0) y se revela al terminar de cargar", () => {
    render(<ExerciseMedia {...props} />);

    const gif = screen.getByAltText("Demostración de Press de banca");
    expect(gif).toHaveClass("opacity-0");

    fireEvent.load(gif);

    expect(gif).toHaveClass("opacity-100");
  });

  it("si el GIF falla (404), se retira sin crash y la caja placeholder permanece", () => {
    render(<ExerciseMedia {...props} />);

    fireEvent.error(screen.getByAltText("Demostración de Press de banca"));

    expect(screen.queryByAltText("Demostración de Press de banca")).not.toBeInTheDocument();
    expect(screen.getByTestId("exercise-media")).toBeInTheDocument();
  });

  it("si también falla el thumbnail, la caja permanece como placeholder sólido", () => {
    render(<ExerciseMedia {...props} />);

    const box = screen.getByTestId("exercise-media");
    const thumb = box.querySelector(`img[src="${props.imageUrl}"]`);
    expect(thumb).not.toBeNull();
    // El null queda descartado por el assert anterior.
    fireEvent.error(thumb as Element);
    fireEvent.error(screen.getByAltText("Demostración de Press de banca"));

    expect(box.querySelector("img")).toBeNull();
    expect(box).toBeInTheDocument();
    expect(box).toHaveClass("bg-slate-800");
  });
});
