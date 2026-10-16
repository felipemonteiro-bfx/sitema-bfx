"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Gatilho + folha do menu no celular. O conteúdo (o mesmo painel da sidebar do desktop) vem
// montado pelo servidor em `children`, já com os contadores: este componente não consulta nada.
export function MobileMenuTrigger({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          className="size-11 min-h-11 min-w-11 touch-manipulation rounded-controle border border-divisoria bg-controle text-foreground shadow-none hover:bg-controle-ativo hover:text-foreground hover:shadow-none dark:hover:shadow-none"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      {/* Mesmo degrau do painel do desktop (`bg-card`) e contorno decorativo. Largura limitada a
          85vw para não ocupar um celular de 360px inteiro. */}
      <SheetContent
        side="left"
        className="flex w-72 max-w-[85vw] flex-col gap-0 overflow-hidden border-painel-borda bg-card p-4 text-foreground"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
