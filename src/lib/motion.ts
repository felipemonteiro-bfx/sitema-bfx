// Constantes de movimento do redesign Vantage — espelho em TS dos tokens `--mov-*`
// de `src/app/globals.css`.
//
// O CSS e a fonte da verdade (as classes `.anim-entrada`, `.anim-barra` e
// `.anim-dica` leem os tokens direto). Este modulo existe para quem precisa do
// numero em JS — um `setTimeout` que espera a barra terminar, um `delay` de
// Web Animations API. `src/__tests__/redesign-tokens.test.ts` compara cada
// constante com o token do CSS, entao os dois lados nao divergem em silencio.
//
// So transform, opacity e filter se animam: nada que dispare layout.

/** `--mov-curva`: ease-out forte, usado em entrada, barra e segmentado. */
export const MOV_CURVA = "cubic-bezier(.22,1,.36,1)";

/** `--mov-entrada`: translateY 8px + opacity. */
export const MOV_ENTRADA_MS = 320;
/** `--mov-stagger`: atraso entre itens consecutivos de uma entrada (`--i`). */
export const MOV_STAGGER_MS = 40;

/** `--mov-barra`: scaleY das barras do grafico, origem embaixo. */
export const MOV_BARRA_MS = 480;
/** `--mov-stagger-barra`: atraso entre barras consecutivas (`--i`). */
export const MOV_STAGGER_BARRA_MS = 30;

/** `--mov-hover`: as demais barras caem para opacity .45 quando uma recebe hover. */
export const MOV_HOVER_MS = 160;
/** `--mov-dica`: tooltip do grafico, ease-out subindo 4px. */
export const MOV_DICA_MS = 140;
/** `--mov-segmentado`: troca do item ativo no controle segmentado. */
export const MOV_SEGMENTADO_MS = 220;
/** `--mov-nav`: hover dos itens da navegacao. */
export const MOV_NAV_MS = 120;
