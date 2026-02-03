"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function TopTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as { label: string; value: number };
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium text-foreground">{item.label}</div>
      <div className="text-muted-foreground">{item.value} unidades</div>
    </div>
  );
}

function shorten(label: string, max = 18) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}...`;
}

type EvoRow = { mes: string; total: number; lucro: number };
type TopRow = { label: string; value: number };

function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function DashboardCharts({
  evoData,
  topProdutos,
}: {
  evoData: EvoRow[];
  topProdutos: TopRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Evolução Mensal (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {evoData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados suficientes para histórico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evoData} margin={{ left: 8, right: 8, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => currency(Number(v))} />
                <Tooltip
                  formatter={(v) => currency(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle>Top 5 Produtos (Vol.)</CardTitle>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              últimos 30 dias
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Ranking por volume de vendas.</div>
        </CardHeader>
        <CardContent className="h-72">
          {topProdutos.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...topProdutos].sort((a, b) => a.value - b.value)} layout="vertical" margin={{ left: 12, right: 16, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.22)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickFormatter={(value) => shorten(String(value))}
                />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} content={<TopTooltip />} />
                <Bar dataKey="value" fill="url(#barFill)" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


