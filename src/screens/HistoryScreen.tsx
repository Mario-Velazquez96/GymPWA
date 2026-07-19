import { useParams } from "react-router-dom";

/** Pantalla provisional de historial — el contenido real llega en 06_history. */
export default function HistoryScreen() {
  const { exerciseId } = useParams<"exerciseId">();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-slate-100">
      <h1 className="text-3xl font-bold">Historial</h1>
      <p className="text-base text-slate-300">
        Pantalla en construcción{exerciseId ? ` · ${exerciseId}` : ""}
      </p>
    </main>
  );
}
