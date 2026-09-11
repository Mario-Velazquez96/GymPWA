import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  source: string;
}

/** Tabla GFM envuelta para que la de lunes–domingo se deslice en el iPhone (R15). */
function Table(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  );
}

/**
 * Renderiza el Markdown que escribe el agente (R15): negritas, listas y
 * tablas GFM como HTML semántico. `react-markdown` construye elementos React
 * desde el AST — sin `dangerouslySetInnerHTML` — y descarta el HTML crudo del
 * texto (no hay `rehype-raw`). Estilos por variantes `[&_tag]:` de Tailwind
 * v4, sin CSS global.
 */
export default function Markdown({ source }: MarkdownProps) {
  return (
    <div className="text-base text-slate-200 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-slate-50 [&_table]:w-full [&_table]:text-sm [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_tr]:border-b [&_tr]:border-slate-700 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: Table }}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
