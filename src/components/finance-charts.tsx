"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

type FluxoRow = { mes: string; entradas: number; saidas: number; saldo: number };

function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

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
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums">{currency(entry.value)}</span>
          </div>
        ))}
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
          <span className="text-xs font-medium text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function FluxoCharts({ rows }: { rows: FluxoRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="animate-fade-in-up stagger-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            Entradas vs Saídas
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
            <BarChart data={rows} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="entriesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--error)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--error)" stopOpacity={0.6} />
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
              <Legend content={<CustomLegend />} />
              <Bar 
                dataKey="entradas" 
                fill="url(#entriesGradient)" 
                name="Entradas" 
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Bar 
                dataKey="saidas" 
                fill="url(#expensesGradient)" 
                name="Saídas" 
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="animate-fade-in-up stagger-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            Evolução do Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
            <LineChart data={rows} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--info)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
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
              <Legend content={<CustomLegend />} />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="var(--info)" 
                strokeWidth={3} 
                name="Saldo"
                dot={{ fill: "var(--info)", strokeWidth: 2, r: 4, stroke: "var(--card)" }}
                activeDot={{ r: 6, stroke: "var(--info)", strokeWidth: 2, fill: "var(--card)" }}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
