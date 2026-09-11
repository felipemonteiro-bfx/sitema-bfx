/**
 * Popover que abre no hover e fixa no clique (2026-09-11).
 *
 * Pedido do André para o popover de produtos da fila: "abrir no hover; se eu
 * clicar ele continua aberto, mas se não clicar ele fecha quando eu sair do
 * componente". No toque não existe hover, então o clique abre e já fixa. Os
 * atrasos de abrir/fechar ficam no componente; aqui só as transições, puras.
 */

export interface EstadoPopoverHover {
  aberto: boolean;
  /** Aberto por clique: sair com o ponteiro não fecha. */
  fixo: boolean;
}

/** `fechar` = clique fora ou Esc, que fecham mesmo fixo. */
export type EventoPopoverHover = "entrar" | "sair" | "clicar" | "fechar";

export const POPOVER_FECHADO: EstadoPopoverHover = { aberto: false, fixo: false };

export function transicaoPopoverHover(estado: EstadoPopoverHover, evento: EventoPopoverHover): EstadoPopoverHover {
  switch (evento) {
    case "entrar":
      return estado.aberto ? estado : { aberto: true, fixo: false };
    case "sair":
      return estado.fixo ? estado : POPOVER_FECHADO;
    case "clicar":
      return estado.fixo ? POPOVER_FECHADO : { aberto: true, fixo: true };
    case "fechar":
      return POPOVER_FECHADO;
  }
}
