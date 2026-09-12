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
 * `role="status"` (= `aria-live="polite"`) lo anuncia sin robar el foco. Va
 * como banda de apagón (14 R20): la app está a media luz, no rota.
 */
export default function OfflineBanner({ savedAt }: OfflineBannerProps) {
  const fecha = formatSavedAt(savedAt);

  return (
    <p role="status" className="bg-blackout px-4 py-2 text-sm text-day/90">
      {fecha === null
        ? "Sin conexión · plan guardado en este dispositivo"
        : `Sin conexión · plan guardado el ${fecha}`}
    </p>
  );
}
