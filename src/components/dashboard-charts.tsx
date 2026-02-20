"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyStateInline } from "@/components/ui/empty-state";
import { TrendingUp, Package, BarChart3 } from "lucide-react";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg animate-fade-in">
      <div className="text-sm font-semibold text-foreground mb-2">{label}</div>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.dataKey === "total" ? "Faturamento" : "Lucro"}
              </span>
            </div>
            <span className="text-xs font-semibold tabular-nums">{currency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as { label: string; value: number };
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

function CustomLegend({ payload }: any) {
  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {entry.dataKey === "total" ? "Faturamento" : "Lucro"}
          </span>
        </div>
      ))}
    </div>
  );
}

function shorten(label: string, max = 18) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
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
          <div className="flex gap-2">
            <Badge variant="outline" size="sm" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-chart-1" />
              Faturamento
            </Badge>
            <Badge variant="outline" size="sm" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-chart-2" />
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
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <AreaChart data={evoData} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lucroGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tickFormatter={(v) => currency(Number(v))} 
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} 
                  axisLine={false} 
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-1)"
                  fill="url(#totalGradient)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--chart-1)", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  stroke="var(--chart-2)"
                  fill="url(#lucroGradient)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--chart-2)", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: "var(--chart-2)", strokeWidth: 2, fill: "var(--card)" }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
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

