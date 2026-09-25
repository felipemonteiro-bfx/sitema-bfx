"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Minus, ShoppingCart, TrendingUp, Trophy, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatBRL } from "@/lib/utils";

type Tom = "info" | "success" | "warning";

// Por nome: componente (função) não atravessa do Server Component para cá.
const ICONES = { carteira: Wallet, lucro: TrendingUp, carrinho: ShoppingCart, clientes: Users, trofeu: Trophy } as const;
export type IconeKpi = keyof typeof ICONES;

// Classes literais (o Tailwind precisa enxergá-las); mesma família do CardStats.
const TONS: Record<Tom, { borda: string; fundo: string; icone: string; valor: string; linha: string }> = {
  info: {
    borda: "border-info/30 dark:border-info/40",
    fundo: "bg-gradient-to-br from-info/5 to-transparent dark:from-info/10",
    icone: "bg-info/10 text-info-text dark:bg-info/20",
    valor: "text-info-text",
    linha: "text-info-text",
  },
  success: {
    borda: "border-success/30 dark:border-success/40",
    fundo: "bg-gradient-to-br from-success/5 to-transparent dark:from-success/10",
    icone: "bg-success/10 text-success-text dark:bg-success/20",
    valor: "text-success-text",
    linha: "text-success-text",
  },
  warning: {
    borda: "border-warning/30 dark:border-warning/40",
    fundo: "bg-gradient-to-br from-warning/5 to-transparent dark:from-warning/10",
    icone: "bg-warning/10 text-warning-text dark:bg-warning/20",
    valor: "text-warning-text",
    linha: "text-warning-text",
  },
};

/** cubic-bezier(0.2, 0, 0, 1): arranca rápido e pousa suave. */
function curva(x: number): number {
  const bz = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  let m = 0;
  for (let i = 0; i < 18; i++) {
    m = (lo + hi) / 2;
    if (bz(m, 0.2, 0) < x) lo = m;
    else hi = m;
  }
  return bz(m, 0, 1);
}

const DURACAO_MS = 600;
const PASSO_MS = 60;

// No servidor não há layout; lá o efeito não roda de qualquer jeito.
const useLayoutEffectSeguro = typeof window === "undefined" ? useEffect : useLayoutEffect;

function formatar(valor: number, formato: "brl" | "int"): string {
  return formato === "brl" ? formatBRL(valor) : String(Math.round(valor));
}

/** Caminho SVG (viewBox 100×32) dos últimos meses; null se não há variação para desenhar. */
function caminho(pontos: number[]): string | null {
  if (pontos.length < 2) return null;
  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const faixa = max - min || 1;
  return pontos
    .map((v, i) => {
      const x = (i / (pontos.length - 1)) * 100;
      const y = 29 - ((v - min) / faixa) * 24;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

interface Props {
  titulo: string;
  icone: IconeKpi;
  tom: Tom;
  /** Número a contar; `texto` substitui quando o valor não é numérico (ex.: nome do vendedor). */
  valor?: number;
  formato?: "brl" | "int";
  texto?: string;
  contexto: React.ReactNode;
  variacao?: { percentual: number; rotulo: string } | null;
  /** Linha de fundo: o mesmo indicador nos últimos meses, do mais antigo ao atual. */
  tendencia?: number[];
  /** Posição na fileira: define o atraso da contagem (60 ms por cartão). */
  ordem?: number;
  valorSensivel?: boolean;
  className?: string;
}

export function KpiCard({
  titulo,
  icone,
  tom,
  valor,
  formato = "brl",
  texto,
  contexto,
  variacao,
  tendencia,
  ordem = 0,
  valorSensivel = true,
  className,
}: Props) {
  const estilo = TONS[tom];
  const Icone = ICONES[icone];
  const final = valor === undefined ? (texto ?? "—") : formatar(valor, formato);
  // Começa do zero no servidor E no cliente (sem mismatch de hidratação): assim a
  // primeira pintura já é o início da contagem, e não o valor final que depois
  // voltaria a 0. O valor final vai para o leitor de tela no sr-only.
  const [exibido, setExibido] = useState(() => (valor === undefined ? final : formatar(0, formato)));
  const [pousou, setPousou] = useState(valor === undefined);
  const raf = useRef<number>(0);

  // Antes da pintura: com movimento permitido, começa do zero e conta até o valor.
  // Sem JS, ou com "reduzir movimento", o valor final é o que aparece.
  useLayoutEffectSeguro(() => {
    if (valor === undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExibido(formatar(valor, formato));
      setPousou(true);
      return;
    }
    setPousou(false);
    setExibido(formatar(0, formato));
    const inicio = performance.now() + ordem * PASSO_MS;
    const passo = (agora: number) => {
      const t = Math.max(0, Math.min(1, (agora - inicio) / DURACAO_MS));
      setExibido(formatar(valor * curva(t), formato));
      if (t < 1) raf.current = requestAnimationFrame(passo);
      else setPousou(true);
    };
    raf.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf.current);
  }, [valor, formato, ordem]);

  const d = tendencia ? caminho(tendencia) : null;
  const Seta = !variacao || variacao.percentual === 0 ? Minus : variacao.percentual > 0 ? ArrowUp : ArrowDown;
  const corVariacao =
    !variacao || variacao.percentual === 0
      ? "bg-muted text-muted-foreground"
      : variacao.percentual > 0
        ? "bg-success-bg text-success-text"
        : "bg-error-bg text-error-text";

  return (
    <Card className={cn("relative overflow-hidden p-4 sm:p-5", estilo.borda, className)}>
      <div className={cn("pointer-events-none absolute inset-0", estilo.fundo)} aria-hidden="true" />
      {/* Três linhas de altura fixa: os valores de todos os cartões ficam na mesma linha. */}
      <div className="relative grid grid-rows-[1.25rem_2.25rem_1.25rem_1.75rem] gap-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
          <span className={cn("hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex", estilo.icone)}>
            <Icone className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <div className={cn("truncate text-xl font-bold leading-9 tabular-nums sm:text-2xl", estilo.valor)}>
          {/* Leitor de tela ouve só o valor final, não a contagem. */}
          {/* Texto (top vendedor) não conta: mostra direto, e acompanha o filtro. */}
          <span className={cn(valorSensivel && "valor-sensivel")} aria-hidden={!pousou || undefined}>
            {valor === undefined ? final : exibido}
          </span>
          {!pousou && <span className="sr-only">{final}</span>}
        </div>
        <div className="truncate text-sm text-muted-foreground">{contexto}</div>
        {variacao ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums transition-opacity duration-200",
                corVariacao,
                valorSensivel && "valor-sensivel",
                pousou ? "opacity-100" : "opacity-0"
              )}
            >
              <Seta className="h-3 w-3" aria-hidden="true" />
              {Math.abs(Math.round(variacao.percentual * 10) / 10).toLocaleString("pt-BR")}%
            </span>
            <span className="truncate">{variacao.rotulo}</span>
          </div>
        ) : (
          <div />
        )}
      </div>
      {/* Linha no rodapé, abaixo da variação e sangrando até a borda: antes era
          absoluta e passava por cima do "▼ 52% vs …". */}
      {d && (
        <svg
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          className={cn(
            "kpi-tendencia pointer-events-none relative -mx-4 -mb-4 mt-2 block h-8 w-[calc(100%+2rem)] opacity-35 sm:-mx-5 sm:-mb-5 sm:w-[calc(100%+2.5rem)]",
            estilo.linha,
            valorSensivel && "bloco-sensivel"
          )}
          style={{ animationDelay: `${ordem * PASSO_MS}ms` }}
          aria-hidden="true"
        >
          <path d={d} pathLength={100} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </Card>
  );
}
