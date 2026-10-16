"use client";

import { Menu, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EVENTO_ABRIR_BUSCA } from "@/lib/busca-rapida-ui";

// Gatilho + folha do menu no celular. O conteúdo (o mesmo painel da sidebar do desktop) vem
// montado pelo servidor em `children`, já com os contadores: este componente não consulta nada.
export function MobileMenuTrigger({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="controle"
          size="icon"
          aria-label="Abrir menu"
          className="size-11 min-h-11 min-w-11 touch-manipulation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      {/* Mesmo degrau do painel do desktop (`bg-card`) e contorno decorativo. Largura limitada a
          85vw para não ocupar um celular de 360px inteiro. */}
      <SheetContent
        side="left"
        fundo="card"
        className="flex w-72 max-w-[85vw] flex-col gap-0 overflow-hidden p-4"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

// Botão de busca do cabeçalho mobile: o gatilho em forma de campo mora na sidebar, que no celular
// fica dentro da folha. Aqui só a lupa (44px), que dispara o mesmo evento que o `<BuscaRapida>`
// único da casca escuta. O nome acessível cita Ctrl K porque é o atalho de quem usa teclado.
export function BotaoBuscaMobile() {
  return (
    <Button
      type="button"
      variant="controle"
      size="icon"
      aria-label="Buscar (Ctrl K)"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCA))}
      className="size-11 min-h-11 min-w-11 touch-manipulation"
    >
      <Search className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}
