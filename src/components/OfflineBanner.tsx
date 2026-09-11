import { formatSavedAt } from "@/lib/dietCache";

interface OfflineBannerProps {
  /** ISO 8601 de cuándo se guardó el snapshot que se está mostrando (12 R12). */
  savedAt: string;
}

/**
 * Aviso discreto de que la pantalla Dieta está mostrando el **plan guardado en
 * el dispositivo** porque la red falló (12 R12, R13). Presentacional: no
 * consulta nada y no ofrece botón — al volver la señal el plan se actualiza
 * solo (evento `online` o al reabrir Dieta).
 *
 * `role="status"` (= `aria-live="polite"`) lo anuncia sin robar el foco.
 */
export default function OfflineBanner({ savedAt }: OfflineBannerProps) {
  const fecha = formatSavedAt(savedAt);

  return (
    <p role="status" className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-300">
      {fecha === null
        ? "Sin conexión · plan guardado en este dispositivo"
        : `Sin conexión · plan guardado el ${fecha}`}
    </p>
  );
}
