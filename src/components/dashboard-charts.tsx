"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyStateInline } from "@/components/ui/empty-state";
import { TrendingUp, Package, BarChart3 } from "lucide-react";

function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

type EvoRow = { mes: string; total: number; lucro: number };
type TopRow = { label: string; value: number };

type ChartRow = {
  mes: string;
  custo: number;
  faturamento: number;
  bottom: number;
  profitDelta: number;
  lossDelta: number;
  _lucro: number;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const custo = payload.find((p) => p.dataKey === "custo")?.value ?? 0;
  const fat = payload.find((p) => p.dataKey === "faturamento")?.value ?? 0;
  const lucro = fat - custo;
  const margem = fat > 0 ? (lucro / fat) * 100 : 0;
  const isNeg = lucro < 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl dark:shadow-[var(--shadow-lg)] animate-fade-in min-w-[210px]">
      <div className="text-sm font-semibold text-foreground mb-3">{label}</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
            <span className="text-xs text-muted-foreground">Custo total</span>
          </div>
          <span className="text-xs font-semibold tabular-nums">{currency(custo)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">Faturamento</span>
          </div>
          <span className="text-xs font-semibold tabular-nums">{currency(fat)}</span>
        </div>
        <div className="border-t border-border/40 pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isNeg ? "bg-destructive" : "bg-success"}`} />
              <span className="text-xs text-muted-foreground">Lucro líquido</span>
            </div>
            <span className={`text-xs font-bold tabular-nums ${isNeg ? "text-destructive" : "text-success-text"}`}>
              {currency(lucro)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-muted-foreground pl-4">Margem</span>
            <span className={`text-xs font-semibold tabular-nums ${isNeg ? "text-destructive" : "text-muted-foreground"}`}>
              {margem.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvoChart({ evoData }: { evoData: EvoRow[] }) {
  const chartData: ChartRow[] = evoData.map((d) => {
    const custo = d.total - d.lucro;
    const faturamento = d.total;
    return {
      mes: d.mes,
      custo,
      faturamento,
      // Base: from 0 up to the lower of the two lines
      bottom: Math.min(custo, faturamento),
      // Delta above bottom for profit months (green zone: custo → faturamento)
      profitDelta: Math.max(0, d.lucro),
      // Delta above bottom for loss months (red zone: faturamento → custo)
      lossDelta: Math.max(0, -d.lucro),
      _lucro: d.lucro,
    };
  });

  const allY = chartData.flatMap((d) => [d.custo, d.faturamento]);
  const maxY = Math.max(...allY, 0);
  const minY = Math.min(...allY, 0);
  const pad = (maxY - minY) * 0.1;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
      <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.5} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          // Sem valor negativo, o eixo começa em R$ 0: o respiro de 10% embaixo
          // gerava um "-R$ 4.641" que não existe nos dados.
          domain={[minY < 0 ? minY - pad : 0, maxY + pad]}
          tickFormatter={(v) => currency(Number(v))}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Neutral base fill (from 0 up to the lower line — invisible, just anchors the stack) */}
        <Area
          stackId="s"
          type="monotone"
          dataKey="bottom"
          fill="transparent"
          stroke="none"
          legendType="none"
          isAnimationActive={false}
        />

        {/* Green fill: profit zone (custo → faturamento when lucro > 0) */}
        <Area
          stackId="s"
          type="monotone"
          dataKey="profitDelta"
          fill="url(#profitFill)"
          stroke="none"
          legendType="none"
          animationDuration={900}
          animationEasing="ease-out"
        />

        {/* Red fill: loss zone (faturamento → custo when lucro < 0) */}
        <Area
          stackId="s"
          type="monotone"
          dataKey="lossDelta"
          fill="url(#lossFill)"
          stroke="none"
          legendType="none"
          animationDuration={900}
          animationEasing="ease-out"
        />

        {/* Custo line — the reference baseline */}
        <Line
          type="monotone"
          dataKey="custo"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ fill: "var(--chart-1)", strokeWidth: 0, r: 3.5 }}
          activeDot={{ r: 5, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }}
          animationDuration={900}
          animationEasing="ease-out"
        />

        {/* Faturamento line — where the lucro actually landed (above = profit, below = loss) */}
        <Line
          type="monotone"
          dataKey="faturamento"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={(props: { cx?: number; cy?: number; payload?: ChartRow }) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null || !payload) return <g key="empty" />;
            const color = payload._lucro < 0 ? "var(--destructive)" : "var(--success)";
            return (
              <circle
                key={`dot-fat-${payload.mes}`}
                cx={cx}
                cy={cy}
                r={3.5}
                fill={color}
                stroke="var(--card)"
                strokeWidth={1.5}
              />
            );
          }}
          activeDot={{ r: 5, strokeWidth: 2, fill: "var(--card)" }}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DashboardCharts({
  evoData,
  topProdutos,
}: {
  evoData: EvoRow[];
  topProdutos: TopRow[];
}) {
  const hasNeg = evoData.some((d) => d.lucro < 0);

  return (
    // Modo discreto: `bloco-sensivel` na raiz do proprio componente, e nao num
    // O `bloco-sensivel` fica em cada CardContent, nao aqui: na raiz ele desfocava
    // tambem titulo, legenda e o estado vazio, e o `pointer-events: none` matava
    // qualquer controle que os cards venham a ter.
    <div className="grid gap-4 lg:grid-cols-3">
      <Card animated className="lg:col-span-2 stagger-5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10">
                <TrendingUp className="h-4 w-4 text-chart-1" />
              </div>
              Evolução Mensal
            </CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Badge variant="outline" size="sm" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-chart-1" />
              Custo
            </Badge>
            <Badge variant="outline" size="sm" className="gap-1">
              <div className={`h-2 w-2 rounded-full ${hasNeg ? "bg-destructive" : "bg-success"}`} />
              Faturamento
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="h-72 min-h-[288px] bloco-sensivel">
          {evoData.length === 0 ? (
            <EmptyStateInline
              message="Sem dados suficientes para histórico"
              icon={BarChart3}
            />
          ) : (
            <EvoChart evoData={evoData} />
          )}
        </CardContent>
      </Card>

      <Card animated className="lg:col-span-1 stagger-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
                <Package className="h-4 w-4 text-chart-3" />
              </div>
              Top Produtos
            </CardTitle>
            <Badge variant="secondary" size="sm">Top 5</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Unidades vendidas no período</p>
        </CardHeader>
        <CardContent className="min-h-72 bloco-sensivel">
          {topProdutos.length === 0 ? (
            <EmptyStateInline
              message="Sem dados de produtos"
              icon={Package}
            />
          ) : (
            // Lista com barra (nome inteiro + quantidade), uma cor só: o gráfico
            // anterior cortava os nomes e pintava as barras em degradê laranja→azul.
            <ol className="space-y-3.5">
              {[...topProdutos]
                .sort((a, b) => b.value - a.value)
                .map((p, i, lista) => (
                  <li key={p.label} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate" title={p.label}>{p.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{p.value} un.</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className="barra-crescer h-full rounded-full bg-primary"
                        style={{ width: `${(p.value / lista[0].value) * 100}%`, animationDelay: `${200 + i * 40}ms` }}
                      />
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
