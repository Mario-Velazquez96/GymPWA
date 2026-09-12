import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * Sección colapsable nativa (R14): `<details>` cerrado por defecto con un
 * `<summary>` de ≥ 44px que se abre con tap o Enter — teclado y lector de
 * pantalla gratis, sin JavaScript. Banda nocturna con costuras de apagón; el
 * chevron gira 90° en 150 ms (corte con reduced-motion) (14 R24).
 */
export default function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  return (
    <details className="group border-y border-blackout bg-cyc-black">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-base font-bold text-day select-none marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span
          aria-hidden="true"
          className="text-xl leading-none text-day/60 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
        >
          ›
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
