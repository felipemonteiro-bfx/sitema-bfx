"use client";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import type { SortDir } from "@/hooks/use-table-features";

interface SortableHeaderProps {
  label: string;
  field: string;
  currentField?: string;
  currentDir: SortDir;
  onSort: (field: string) => void;
  className?: string;
  /** Coluna que so ocupa o lugar de uma ordenavel (sem clique nem realce no hover). */
  estatico?: boolean;
}

export function SortableHeader({ label, field, currentField, currentDir, onSort, className = "", estatico = false }: SortableHeaderProps) {
  const isActive = currentField === field;
  return (
    <TableHead
      interativo={!estatico}
      className={cn(estatico && "cursor-default", className)}
      onClick={() => onSort(field)}
    >
      {/* `whitespace-nowrap` + `shrink-0`: sem os dois, numa coluna estreita o
          rotulo quebra em duas linhas e a seta fica solta ao lado do bloco — e
          o proprio <svg> e comprimido pelo flex (medido: `h-3 w-3` declarado,
          8.42px renderizado no mesmo padrao em /boletos). O <span> nao usa
          `buttonVariants`, entao nao herda o `whitespace-nowrap` nem o
          `[&_svg]:shrink-0` da base.
          Contrapartida aceita: com o rotulo em uma linha so, a coluna fica mais
          larga em 390px. A rolagem resultante e do <div overflow-auto> que o
          <Table> ja embrulha (ui/table.tsx), nao da pagina — nao vira o defeito
          de `document.scrollWidth > clientWidth`. */}
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {label}
        {isActive ? (
          currentDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}
