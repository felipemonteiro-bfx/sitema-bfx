"use client";

import * as React from "react";
import { POPOVER_FECHADO, transicaoPopoverHover, type EventoPopoverHover } from "@/lib/popover-hover";

/** Atraso para abrir: varrer a tabela com o mouse não acende um popover por linha. */
const ATRASO_ABRIR_MS = 150;
/** Atraso para fechar: dá tempo de cruzar o vão entre o gatilho e o conteúdo. */
const ATRASO_FECHAR_MS = 180;

/**
 * Popover que abre no hover, fixa no clique e, sem clique, fecha ao sair
 * (pedido do André, 2026-09-11) — usado pelos popovers de produtos e de
 * parcelas da fila. Transições puras em `@/lib/popover-hover`.
 *
 * O gatilho deve ser `PopoverAnchor`, não `PopoverTrigger`: o toggle do Trigger
 * brigaria com este estado. Clique no gatilho é ignorado como "clique fora"
 * para o segundo clique desfixar em vez de reabrir. Todo clique para aqui: a
 * linha da fila seleciona a venda, e evento React atravessa o portal.
 */
export function usePopoverHover() {
  const [estado, setEstado] = React.useState(POPOVER_FECHADO);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const gatilhoRef = React.useRef<HTMLButtonElement>(null);
  const devolverFoco = React.useRef(false);
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

  // Só mouse: no toque o pointerenter também dispara e abriria sem fixar.
  const ehMouse = (e: React.PointerEvent) => e.pointerType === "mouse";

  return {
    estado,
    popover: {
      open: estado.aberto,
      // Só o fechar vem daqui (clique fora, Esc, foco saindo): abrir é por hover ou clique.
      onOpenChange: (abrir: boolean) => {
        if (abrir) return;
        limparTimer();
        despachar("fechar");
      },
    },
    gatilho: {
      ref: gatilhoRef,
      "aria-expanded": estado.aberto,
      "aria-haspopup": "dialog" as const,
      "aria-controls": estado.aberto ? conteudoId : undefined,
      onPointerEnter: (e: React.PointerEvent) => {
        if (ehMouse(e)) depois("entrar", ATRASO_ABRIR_MS);
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (ehMouse(e)) depois("sair", ATRASO_FECHAR_MS);
      },
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        limparTimer();
        despachar("clicar");
      },
    },
    conteudo: {
      id: conteudoId,
      // Aberto por hover não rouba o foco; aberto por clique ou teclado (fixo),
      // o foco entra para o leitor de tela chegar ao conteúdo.
      onOpenAutoFocus: (e: Event) => {
        if (!estado.fixo) e.preventDefault();
      },
      // Esc devolve o foco ao gatilho: como ele é Anchor e não Trigger, o Radix
      // mandaria o foco para o body e quem usa teclado perderia o lugar na
      // tabela. Clique fora ou foco saindo: o foco fica onde o usuário o pôs.
      onEscapeKeyDown: () => {
        devolverFoco.current = true;
      },
      onCloseAutoFocus: (e: Event) => {
        e.preventDefault();
        if (devolverFoco.current) gatilhoRef.current?.focus();
        devolverFoco.current = false;
      },
      onInteractOutside: (e: Event) => {
        if (gatilhoRef.current?.contains(e.target as Node)) e.preventDefault();
      },
      onPointerEnter: (e: React.PointerEvent) => {
        if (ehMouse(e)) limparTimer();
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (ehMouse(e)) depois("sair", ATRASO_FECHAR_MS);
      },
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    },
  };
}
