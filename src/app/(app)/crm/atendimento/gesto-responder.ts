import { useEffect, useRef, type RefObject } from 'react';

/** Quanto o dedo precisa andar para a mensagem ser escolhida para resposta. */
export const LIMIAR = 64;
/** Quanto a bolha pode andar no máximo (com resistência depois do limiar). */
export const MAXIMO = 96;
/** Distância inicial em que decidimos se o gesto é horizontal (responder) ou vertical (scroll). */
const DECISAO_PX = 10;
/** Quanto de cada px a mais do dedo vira movimento depois do limiar. */
const RESISTENCIA = 0.35;
/** Tempo de dedo parado na bolha para abrir o menu. */
export const SEGURAR_MS = 450;

export type Gesto = { deslocamento: number; progresso: number; disparar: boolean; cancelarPorVertical: boolean };

/** Cálculo puro do arrasto: dx/dy em px desde o toque. Só a direita (dx > 0) desloca a bolha. */
export function progressoGesto(dx: number, dy: number): Gesto {
  const cancelarPorVertical = Math.max(Math.abs(dx), Math.abs(dy)) >= DECISAO_PX && Math.abs(dy) > Math.abs(dx);
  if (dx <= 0) return { deslocamento: 0, progresso: 0, disparar: false, cancelarPorVertical };
  const deslocamento = Math.min(MAXIMO, dx <= LIMIAR ? dx : LIMIAR + (dx - LIMIAR) * RESISTENCIA);
  return { deslocamento, progresso: Math.min(1, dx / LIMIAR), disparar: dx >= LIMIAR, cancelarPorVertical };
}

/** Controles que têm gesto próprio (barra do áudio, links, vídeo): o arrasto da bolha não começa neles. */
const PROPRIOS = '[role="slider"], input, video, audio, a[href], [data-sem-gesto]';

type Opcoes = { ativo: boolean; aoResponder: () => void; aoSegurar: () => void };

/**
 * Deslizar para a direita responde; segurar o dedo (~450ms) abre o menu. Só toque (`pointerType === 'touch'`):
 * no desktop o mouse continua selecionando texto. A bolha e o ícone são movidos direto no DOM (sem render por frame),
 * por isso os ouvintes são nativos, ligados num efeito aos elementos que o componente passa por ref.
 */
export function useGestoResponder(bolha: RefObject<HTMLElement | null>, icone: RefObject<HTMLElement | null>, { ativo, aoResponder, aoSegurar }: Opcoes) {
  const fn = useRef({ aoResponder, aoSegurar });
  useEffect(() => { fn.current = { aoResponder, aoSegurar }; });

  useEffect(() => {
    const el = bolha.current;
    if (!ativo || !el) return;
    const s = { id: -1, x: 0, y: 0, decisao: 'nenhuma' as 'nenhuma' | 'horizontal' | 'vertical', vibrou: false, reduzido: false, engolirClique: false };
    let timer: number | null = null;
    const limparTimer = () => { if (timer !== null) { window.clearTimeout(timer); timer = null; } };
    const mostrarIcone = (progresso: number) => {
      const ic = icone.current;
      if (!ic) return;
      ic.style.opacity = String(progresso);
      ic.style.transform = `translateY(-50%) scale(${s.reduzido ? 1 : 0.6 + 0.4 * progresso})`;
    };
    const reiniciar = () => {
      limparTimer();
      const linha = el.parentElement;
      el.style.transform = '';
      if (s.decisao === 'horizontal' && !s.reduzido) {
        el.style.transition = 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        window.setTimeout(() => { el.style.transition = ''; if (linha) linha.style.overflowX = ''; }, 200);
      } else { el.style.transition = ''; if (linha) linha.style.overflowX = ''; }
      const ic = icone.current;
      if (ic) { ic.style.transition = 'opacity 150ms'; mostrarIcone(0); ic.style.left = ''; ic.style.right = ''; }
      s.id = -1; s.decisao = 'nenhuma'; s.vibrou = false;
    };

    const baixou = (e: PointerEvent) => {
      const toque = e.pointerType === 'touch';
      s.engolirClique = false; // um clique engolido que sobrou não pode pegar o toque novo
      if (!toque || !e.isPrimary) return;
      if ((e.target as HTMLElement).closest(PROPRIOS)) return;
      s.id = e.pointerId; s.x = e.clientX; s.y = e.clientY; s.decisao = 'nenhuma'; s.vibrou = false;
      s.reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      limparTimer();
      timer = window.setTimeout(() => {
        timer = null;
        if (s.decisao === 'horizontal') return;
        s.engolirClique = true; s.id = -1;
        navigator.vibrate?.(10);
        fn.current.aoSegurar();
      }, SEGURAR_MS);
    };
    const moveu = (e: PointerEvent) => {
      if (e.pointerId !== s.id || e.pointerType === 'mouse') return;
      const g = progressoGesto(e.clientX - s.x, e.clientY - s.y);
      if (s.decisao === 'nenhuma') {
        if (Math.max(Math.abs(e.clientX - s.x), Math.abs(e.clientY - s.y)) < DECISAO_PX) return;
        limparTimer(); // andou: não é "segurar"
        if (g.cancelarPorVertical) { s.decisao = 'vertical'; return; }
        s.decisao = 'horizontal';
        try { el.setPointerCapture(e.pointerId); } catch { /* sem captura, o arrasto segue pelos eventos da bolha */ }
        const linha = el.parentElement; // evita barra de rolagem horizontal enquanto a bolha passa da borda
        if (linha) linha.style.overflowX = 'clip';
        el.style.transition = '';
        const ic = icone.current;
        if (ic) { ic.style.transition = ''; if (s.reduzido) { ic.style.right = 'auto'; ic.style.left = '0.5rem'; } }
      }
      if (s.decisao !== 'horizontal') return;
      if (!s.reduzido) el.style.transform = `translateX(${g.deslocamento}px)`;
      mostrarIcone(g.progresso);
      if (g.disparar && !s.vibrou) { s.vibrou = true; navigator.vibrate?.(10); }
      if (!g.disparar) s.vibrou = false;
    };
    const terminou = (cancelado: boolean) => (e: PointerEvent) => {
      if (e.pointerId !== s.id) return;
      const dispara = !cancelado && s.decisao === 'horizontal' && progressoGesto(e.clientX - s.x, e.clientY - s.y).disparar;
      if (s.decisao === 'horizontal') s.engolirClique = true; // o dedo que arrastou não "clica" na foto/botão debaixo
      reiniciar();
      if (dispara) fn.current.aoResponder();
    };
    const soltou = terminou(false);
    const cancelou = terminou(true);
    // O clique sintético vem logo depois do pointerup; se não vier (dedo arrastou para fora), a marca não pode sobrar.
    let limparEngolir: number | null = null;
    const agendarLimpeza = () => {
      if (limparEngolir !== null) window.clearTimeout(limparEngolir);
      limparEngolir = window.setTimeout(() => { s.engolirClique = false; limparEngolir = null; }, 350);
    };
    const clique = (e: MouseEvent) => {
      if (s.engolirClique) { s.engolirClique = false; e.preventDefault(); e.stopPropagation(); }
    };

    el.addEventListener('pointerdown', baixou);
    el.addEventListener('pointermove', moveu);
    el.addEventListener('pointerup', soltou);
    el.addEventListener('pointercancel', cancelou);
    el.addEventListener('pointerup', agendarLimpeza);
    el.addEventListener('pointercancel', agendarLimpeza);
    el.addEventListener('click', clique, true);
    return () => {
      limparTimer();
      if (limparEngolir !== null) window.clearTimeout(limparEngolir);
      el.removeEventListener('pointerup', agendarLimpeza);
      el.removeEventListener('pointercancel', agendarLimpeza);
      el.removeEventListener('pointerdown', baixou);
      el.removeEventListener('pointermove', moveu);
      el.removeEventListener('pointerup', soltou);
      el.removeEventListener('pointercancel', cancelou);
      el.removeEventListener('click', clique, true);
    };
  }, [ativo, bolha, icone]);
}
