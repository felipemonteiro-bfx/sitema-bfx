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

type FluxoRow = { mes: string; entradas: number; saidas: number; saldo: number };

function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function FluxoCharts({ rows }: { rows: FluxoRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: 10, right: 10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(v) => currency(Number(v))} />
            <Tooltip formatter={(v) => currency(Number(v))} />
            <Legend />
            <Bar dataKey="entradas" fill="#16a34a" name="Entradas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" fill="#dc2626" name="Saídas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 10, right: 10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(v) => currency(Number(v))} />
            <Tooltip formatter={(v) => currency(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="saldo" stroke="#0f172a" strokeWidth={2} name="Saldo" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
