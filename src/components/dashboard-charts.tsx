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
        <CardHeader>
          <CardTitle>Top 5 Produtos (Vol.)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {topProdutos.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProdutos} layout="vertical" margin={{ left: 20, right: 8, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-3)" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
