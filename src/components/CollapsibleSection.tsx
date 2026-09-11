import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * Sección colapsable nativa (R14): `<details>` cerrado por defecto con un
 * `<summary>` de ≥ 44px que se abre con tap o Enter — teclado y lector de
 * pantalla gratis, sin JavaScript.
 */
export default function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  return (
    <details className="group rounded-xl bg-slate-800">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-base font-semibold text-slate-100 select-none marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
