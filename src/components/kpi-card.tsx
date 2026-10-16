import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";

/**
 * Cartão de indicador do Início (redesign Vantage). Componente de servidor: o valor
 * já chega final no HTML (o count-up saiu — decisão 2 do spec), sem JS de animação.
 */
export type KpiCardProps = {
  /** Rótulo do indicador, em tom secundário (ex.: "Faturamento"). */
  rotulo: string;
  /** Valor já formatado (ex.: "R$ 6.275,00", "29,3%", "5"). */
  valor: string;
  /** Linha de rodapé (ex.: "6 vendas · 5 clientes"). */
  rodape: React.ReactNode;
  /** Sparkline de barras: o mesmo indicador nos últimos meses, do mais antigo ao atual. */
  serie?: number[];
  /** Variação opcional contra o período anterior, mostrada no rodapé. */
  variacao?: { percentual: number; rotulo: string } | null;
  /** Posição na fileira: atraso da entrada das barras (--i). */
  ordem?: number;
  /** `false` quando o valor não é dinheiro (ex.: nome, contagem): não entra no modo discreto. */
  valorSensivel?: boolean;
  className?: string;
};

/**
 * Formato antigo, ainda usado por `dashboard/page.tsx` até a D2 montar o Início novo.
 * @deprecated use `KpiCardProps`; `icone` e `tom` são ignorados (o visual novo não tem os dois).
 */
export type IconeKpi = "carteira" | "lucro" | "carrinho" | "clientes" | "trofeu";
export type KpiCardLegadoProps = {
  titulo: string;
  icone?: IconeKpi;
  tom?: "info" | "success" | "warning";
  valor?: number;
  formato?: "brl" | "int";
  texto?: string;
  contexto: React.ReactNode;
  variacao?: { percentual: number; rotulo: string } | null;
  tendencia?: number[];
  ordem?: number;
  valorSensivel?: boolean;
  className?: string;
};

function normalizar(p: KpiCardProps | KpiCardLegadoProps): KpiCardProps {
  if ("rotulo" in p) return p;
  const valor =
    p.valor === undefined ? (p.texto ?? "—") : p.formato === "int" ? String(Math.round(p.valor)) : formatBRL(p.valor);
  return {
    rotulo: p.titulo,
    valor,
    rodape: p.contexto,
    serie: p.tendencia,
    variacao: p.variacao,
    ordem: p.ordem,
    valorSensivel: p.valorSensivel,
    className: p.className,
  };
}

/** Altura mínima de uma barra (%): o mês zerado continua visível como um traço. */
const ALTURA_MINIMA = 12;

function alturas(serie: number[]): number[] {
  const max = Math.max(...serie, 0);
  return serie.map((v) => (max > 0 ? Math.max(ALTURA_MINIMA, (Math.max(v, 0) / max) * 100) : ALTURA_MINIMA));
}

export function KpiCard(props: KpiCardProps | KpiCardLegadoProps) {
  const { rotulo, valor, rodape, serie, variacao, ordem = 0, valorSensivel = true, className } = normalizar(props);
  const barras = serie && serie.length >= 2 ? alturas(serie) : null;
  const Seta = !variacao || variacao.percentual === 0 ? Minus : variacao.percentual > 0 ? ArrowUp : ArrowDown;
  const corVariacao =
    !variacao || variacao.percentual === 0
      ? "bg-muted text-muted-foreground"
      : variacao.percentual > 0
        ? "bg-success-bg text-success-text"
        : "bg-error-bg text-error-text";

  return (
    <article
      className={cn("anim-entrada flex flex-col gap-3 rounded-interno bg-card-elevated px-5 py-4", className)}
      style={{ "--i": ordem } as React.CSSProperties}
    >
      <h3 className="text-sm font-medium text-muted-foreground">{rotulo}</h3>
      <div className={cn("truncate font-mono text-kpi font-medium tracking-tight", valorSensivel && "valor-sensivel")}>
        {valor}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">{rodape}</span>
          {variacao && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums",
                  corVariacao,
                  valorSensivel && "valor-sensivel"
                )}
              >
                <Seta className="h-3 w-3" aria-hidden="true" />
                {Math.abs(Math.round(variacao.percentual * 10) / 10).toLocaleString("pt-BR")}%
              </span>
              <span className="truncate">{variacao.rotulo}</span>
            </span>
          )}
        </div>
        {barras && (
          <div
            className={cn("flex h-8 shrink-0 items-end gap-0.5", valorSensivel && "bloco-sensivel")}
            aria-hidden="true"
          >
            {barras.map((h, i) => {
              const ultima = i === barras.length - 1;
              return (
                <span
                  key={i}
                  className={cn("anim-barra block w-1.5 rounded-sm", ultima ? "bg-primary" : "bg-grafico-inativo")}
                  style={{ height: `${h}%`, "--i": i } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
