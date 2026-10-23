"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function HistoricoAcoesMenu({ vendaId, children }: { vendaId: number; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label={`Mais ações da venda ${vendaId}`} title="Mais ações">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" compacto aria-label={`Ações do termo da venda ${vendaId}`}>
        <div className="flex flex-col items-stretch gap-2">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
