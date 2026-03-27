"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalFiltered: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({ page, totalPages, totalFiltered, totalItems, onPageChange }: TablePaginationProps) {
  if (totalPages <= 1 && totalFiltered === totalItems) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1 pt-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {totalFiltered === totalItems
          ? `${totalFiltered} registro${totalFiltered !== 1 ? "s" : ""}`
          : `${totalFiltered} de ${totalItems} registros`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs tabular-nums px-2 text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
