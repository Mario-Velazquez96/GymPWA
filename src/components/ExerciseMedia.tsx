import { useState } from "react";

interface ExerciseMediaProps {
  /** Nombre del ejercicio para el `alt` en español (R2). */
  name: string;
  /** Thumbnail estático que ocupa el lugar mientras el GIF carga (R2). */
  imageUrl: string;
  /** GIF animado de demostración (R2). */
  gifUrl: string;
}

type MediaStatus = "loading" | "loaded" | "error";

/**
 * Media del ejercicio (R2): caja cuadrada de tamaño fijo (fuente 180×180)
 * para que no haya saltos de layout; el thumbnail hace de placeholder y el
 * GIF se revela con un cambio de opacidad al terminar de cargar. Si el GIF o
 * el thumbnail fallan (404, sin red), la caja se queda como placeholder — sin
 * crash y sin spinner infinito.
 */
export default function ExerciseMedia({ name, imageUrl, gifUrl }: ExerciseMediaProps) {
  const [gifStatus, setGifStatus] = useState<MediaStatus>("loading");
  const [thumbFailed, setThumbFailed] = useState(false);

  return (
    <div
      data-testid="exercise-media"
      className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-xl bg-slate-800"
    >
      {!thumbFailed && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          onError={() => setThumbFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {gifStatus !== "error" && (
        <img
          src={gifUrl}
          alt={`Demostración de ${name}`}
          onLoad={() => setGifStatus("loaded")}
          onError={() => setGifStatus("error")}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            gifStatus === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
