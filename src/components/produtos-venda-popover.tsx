"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn, formatBRL } from "@/lib/utils";
import { POPOVER_FECHADO, transicaoPopoverHover, type EventoPopoverHover } from "@/lib/popover-hover";

interface ItemVenda {
  produtoNome: string;
  quantidade: number;
  subtotal: number;
}

/** Atraso para abrir: varrer a tabela com o mouse não acende um popover por linha. */
const ATRASO_ABRIR_MS = 150;
/** Atraso para fechar: dá tempo de cruzar o vão entre o gatilho e o conteúdo. */
const ATRASO_FECHAR_MS = 180;

/**
 * Produtos de uma venda com vários itens: abre no hover, clique fixa aberto,
 * sem clique fecha ao sair (pedido do André, 2026-09-11). No toque o clique
 * abre e já fixa. Transições puras em `@/lib/popover-hover`.
 *
 * O botão é âncora, não `PopoverTrigger`: o toggle do Trigger brigaria com o
 * estado próprio (hover + fixo). Clique no botão é ignorado como "clique fora"
 * (`onInteractOutside`) para o segundo clique desfixar em vez de reabrir. Todo
 * clique para no componente: a linha da fila seleciona a venda ao ser clicada,
 * e evento React atravessa o portal do conteúdo.
 */
export function ProdutosVendaPopover({ itens, className }: { itens: ItemVenda[]; className?: string }) {
  const [estado, setEstado] = React.useState(POPOVER_FECHADO);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const botao = React.useRef<HTMLButtonElement>(null);
  const conteudoId = React.useId();

  const limparTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const despachar = (evento: EventoPopoverHover) => setEstado((e) => transicaoPopoverHover(e, evento));
  const depois = (evento: EventoPopoverHover, ms: number) => {
    limparTimer();
    timer.current = setTimeout(() => despachar(evento), ms);
  };

  React.useEffect(() => limparTimer, []);

  const total = itens.reduce((soma, item) => soma + item.subtotal, 0);
  // Só mouse: no toque o pointerenter também dispara e abriria sem fixar.
  const ehMouse = (e: React.PointerEvent) => e.pointerType === "mouse";

  return (
    <Popover
      open={estado.aberto}
      onOpenChange={(abrir) => {
        // Só o fechar vem daqui (clique fora, Esc, foco saindo): abrir é por hover ou clique.
        if (abrir) return;
        limparTimer();
        despachar("fechar");
      }}
    >
      <PopoverAnchor asChild>
        <Button
          ref={botao}
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={estado.aberto}
          aria-haspopup="dialog"
          aria-controls={estado.aberto ? conteudoId : undefined}
          className={cn("-ml-3 gap-1 font-semibold", estado.fixo && "bg-muted", className)}
          onPointerEnter={(e) => ehMouse(e) && depois("entrar", ATRASO_ABRIR_MS)}
          onPointerLeave={(e) => ehMouse(e) && depois("sair", ATRASO_FECHAR_MS)}
          onClick={(e) => {
            e.stopPropagation();
            limparTimer();
            despachar("clicar");
          }}
        >
          {itens.length} produtos
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverAnchor>
      <PopoverContent
        id={conteudoId}
        align="start"
        className="w-80 p-3"
        onOpenAutoFocus={(e) => {
          // Aberto por hover não rouba o foco de quem navega a tabela; aberto por
          // clique ou teclado (fixo), o foco entra para o leitor de tela chegar à lista.
          if (!estado.fixo) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (botao.current?.contains(e.target as Node)) e.preventDefault();
        }}
        onPointerEnter={(e) => ehMouse(e) && limparTimer()}
        onPointerLeave={(e) => ehMouse(e) && depois("sair", ATRASO_FECHAR_MS)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Produtos da venda</div>
        <ul className="space-y-1.5 text-sm">
          {itens.map((item, idx) => (
            <li key={idx} className="flex justify-between gap-3">
              <span className="min-w-0 truncate" title={item.produtoNome}>
                {item.produtoNome} <span className="text-muted-foreground">({item.quantidade}x)</span>
              </span>
              <span className="tabular-nums shrink-0 font-medium">{formatBRL(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-2.5" />
        {/* So a soma dos itens: o Valor da linha pode incluir frete e desconto. */}
        <div className="flex justify-between gap-3 text-sm font-bold">
          <span>Total dos produtos</span>
          <span className="tabular-nums shrink-0">{formatBRL(total)}</span>
        </div>
        {!estado.fixo && (
          <p className="mt-2 text-xs text-muted-foreground">Clique em &ldquo;{itens.length} produtos&rdquo; para manter aberto.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
