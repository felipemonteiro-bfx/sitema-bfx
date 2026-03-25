"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const fat = payload.find((p) => p.dataKey === "total")?.value ?? 0;
  const lucro = payload.find((p) => p.dataKey === "lucro")?.value ?? 0;
  const custo = fat - lucro;
  const margem = fat > 0 ? (lucro / fat) * 100 : 0;
  const isNeg = lucro < 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl animate-fade-in min-w-[210px]">
      <div className="text-sm font-semibold text-foreground mb-3">{label}</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
            <span className="text-xs text-muted-foreground">Faturamento</span>
          </div>
          <span className="text-xs font-semibold tabular-nums">{currency(fat)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">Custos totais</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{currency(custo)}</span>
        </div>
        <div className="border-t border-border/40 pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isNeg ? "bg-destructive" : "bg-emerald-500"}`} />
              <span className="text-xs text-muted-foreground">Lucro líquido</span>
            </div>
            <span className={`text-xs font-bold tabular-nums ${isNeg ? "text-destructive" : "text-emerald-500"}`}>
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

function TopTooltip({ active, payload }: { active?: boolean; payload?: { payload: TopRow }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg animate-fade-in">
      <div className="font-semibold text-foreground mb-1">{item.label}</div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Package className="h-3.5 w-3.5" />
        <span className="text-sm">{item.value} unidades vendidas</span>
      </div>
    </div>
  );
}

function shorten(label: string, max = 18) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function EvoChart({ evoData }: { evoData: EvoRow[] }) {
  const hasData = evoData.length > 0;
  const maxY = hasData ? Math.max(...evoData.map((d) => d.total), 1) : 1;
  const minY = hasData ? Math.min(...evoData.map((d) => d.lucro), 0) : 0;
  const hasNeg = minY < 0;

  const pad = (maxY - minY) * 0.08;
  const domainMax = maxY + pad;
  const domainMin = minY - pad;

  // Position of y=0 line from top (0%) to bottom (100%) within the chart area
  const zeroPct = Math.round((domainMax / (domainMax - domainMin)) * 100);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
      <AreaChart data={evoData} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
        <defs>
          {/* Faturamento: blue gradient fills from total line down — represents the full revenue band */}
          <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>

          {/* Lucro: green above 0, red below — gradient switches exactly at the zero line */}
          <linearGradient id="lucroGradient" x1="0" y1="0" x2="0" y2="1">
            {hasNeg ? (
              <>
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                <stop offset={`${zeroPct - 1}%`} stopColor="#10b981" stopOpacity={0.12} />
                <stop offset={`${zeroPct}%`} stopColor="#ef4444" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.55} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
              </>
            )}
          </linearGradient>

          {/* Lucro line stroke: green above 0, red below */}
          <linearGradient id="lucroStroke" x1="0" y1="0" x2="0" y2="1">
            {hasNeg ? (
              <>
                <stop offset={`${zeroPct - 1}%`} stopColor="#10b981" />
                <stop offset={`${zeroPct}%`} stopColor="#ef4444" />
              </>
            ) : (
              <stop offset="0%" stopColor="#10b981" />
            )}
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
          domain={[domainMin, domainMax]}
          tickFormatter={(v) => currency(Number(v))}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Zero reference line shown only when there are negative values */}
        {hasNeg && (
          <ReferenceLine
            y={0}
            stroke="var(--destructive)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            strokeOpacity={0.6}
            label={{ value: "breakeven", position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }}
          />
        )}

        {/* Faturamento area — wide, light fill represents full revenue */}
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#totalGradient)"
          dot={false}
          activeDot={{ r: 5, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }}
          animationDuration={900}
          animationEasing="ease-out"
        />

        {/* Lucro area — sits inside revenue band; gradient fill shows profit (green) or loss (red) */}
        <Area
          type="monotone"
          dataKey="lucro"
          stroke="url(#lucroStroke)"
          strokeWidth={2.5}
          fill="url(#lucroGradient)"
          dot={(props) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: EvoRow };
            const color = payload.lucro < 0 ? "#ef4444" : "#10b981";
            return <circle key={`dot-${payload.mes}`} cx={cx} cy={cy} r={3.5} fill={color} stroke="var(--card)" strokeWidth={1.5} />;
          }}
          activeDot={{ r: 5, strokeWidth: 2, fill: "var(--card)" }}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
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
              Faturamento
            </Badge>
            <Badge variant="outline" size="sm" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              Custo
            </Badge>
            <Badge variant="outline" size="sm" className="gap-1.5">
              <div className={`h-2 w-2 rounded-full ${hasNeg ? "bg-destructive" : "bg-emerald-500"}`} />
              Lucro
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="h-72 min-h-[288px]">
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
          <p className="text-xs text-muted-foreground">Por volume de vendas</p>
        </CardHeader>
        <CardContent className="h-72 min-h-[288px]">
          {topProdutos.length === 0 ? (
            <EmptyStateInline
              message="Sem dados de produtos"
              icon={Package}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart
                data={[...topProdutos].sort((a, b) => a.value - b.value)}
                layout="vertical"
                margin={{ left: 12, right: 16, top: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.4} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value) => shorten(String(value))}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.1 }}
                  content={<TopTooltip />}
                />
                <Bar
                  dataKey="value"
                  fill="url(#barFill)"
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
