"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type MesClientes = {
  mes: string;
  mesLongo: string;
  total: number;
  novos: number;
  recorrentes: number;
  vendas: number;
  /** Variação contra o mês anterior (o corrente compara com os mesmos dias). */
  variacao: { diferenca: number; percentual: number | null; base: string } | null;
};

function Legenda() {
  return (
    <div className="flex gap-4 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-chart-novos" aria-hidden="true" />
        Novos
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-chart-recorrentes" aria-hidden="true" />
        Recorrentes
      </span>
    </div>
  );
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: MesClientes }[] }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="min-w-[200px] rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg dark:shadow-[var(--shadow-lg)]">
      <div className="mb-2 text-sm font-semibold">{m.mesLongo}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-6"><span className="text-muted-foreground">Clientes</span><span className="font-semibold tabular-nums">{m.total}</span></div>
        <div className="flex justify-between gap-6"><span className="text-muted-foreground">Novos</span><span className="tabular-nums">{m.novos}</span></div>
        <div className="flex justify-between gap-6"><span className="text-muted-foreground">Recorrentes</span><span className="tabular-nums">{m.recorrentes}</span></div>
        <div className="flex justify-between gap-6"><span className="text-muted-foreground">Vendas</span><span className="tabular-nums">{m.vendas}</span></div>
      </div>
    </div>
  );
}

function textoVariacao(v: MesClientes["variacao"]): string {
  if (!v) return "—";
  const sinal = v.diferenca > 0 ? "+" : "";
  const pct = v.percentual === null ? "" : ` (${v.percentual > 0 ? "+" : ""}${Math.round(v.percentual)}%)`;
  return `${sinal}${v.diferenca}${pct}`;
}

/** Clientes distintos que compraram em cada um dos últimos meses, novos x recorrentes. */
export function ClientesMesAMes({ meses }: { meses: MesClientes[] }) {
  const resumo = meses.map((m) => `${m.mesLongo}: ${m.total} clientes (${m.novos} novos)`).join("; ");
  const atual = meses.at(-1);

  return (
    <Card animated>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            Clientes que compraram, mês a mês
          </CardTitle>
          <CardDescription>
            Cada cliente conta uma vez por mês, mesmo com várias compras. Novo = primeira compra na BFX.
          </CardDescription>
        </div>
        <Legenda />
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="h-72" role="img" aria-label={`Gráfico de clientes por mês. ${resumo}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
            <BarChart data={meses} margin={{ left: 0, right: 8, top: 24, bottom: 4 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.35} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<Dica />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Bar dataKey="novos" stackId="c" fill="var(--color-chart-novos)" stroke="var(--card)" strokeWidth={2} isAnimationActive={false} />
              <Bar dataKey="recorrentes" stackId="c" fill="var(--color-chart-recorrentes)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="total" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "var(--foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Novos</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">vs mês anterior</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...meses].reverse().map((m) => (
                <TableRow key={m.mesLongo}>
                  <TableCell>{m.mesLongo}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{m.total}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{m.novos}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{m.vendas}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      !m.variacao || m.variacao.diferenca === 0
                        ? "text-muted-foreground"
                        : m.variacao.diferenca > 0
                          ? "text-success-text"
                          : "text-error-text"
                    )}
                  >
                    {textoVariacao(m.variacao)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {atual?.variacao && (
            <p className="text-xs text-muted-foreground">
              {atual.mesLongo} está em andamento: a comparação usa {atual.variacao.base}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
