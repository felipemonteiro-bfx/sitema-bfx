"use client";

import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import type { SortDir } from "@/hooks/use-table-features";

interface SortableHeaderProps {
  label: string;
  field: string;
  currentField?: string;
  currentDir: SortDir;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHeader({ label, field, currentField, currentDir, onSort, className = "" }: SortableHeaderProps) {
  const isActive = currentField === field;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-accent/50 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}
