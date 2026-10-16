"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

/**
 * Gráficos do fluxo de caixa na linguagem do EvolucaoMensal (redesign Vantage):
 * poço rebaixado, entradas em verde da marca, saídas hachuradas, eixos em Geist Mono
 * e tudo por token (muda sozinho com o tema). Só apresentação: os números são os
 * mesmos que `calcularFluxoCaixa` já entregava.
 */
type FluxoRow = { mes: string; entradas: number; saidas: number; saldo: number };

// A hachura vem dos tokens, como no EvolucaoMensal (135deg, traço de 2px a cada 6px).
const HACHURA = "repeating-linear-gradient(135deg, var(--hachura-traco) 0 2px, var(--hachura-fundo) 2px 6px)";

export const TICK_EIXO = { fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" };

export function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

type PontoDica = { color?: string; name?: string; value?: number };

export function TooltipGrafico({ active, payload, label }: { active?: boolean; payload?: PontoDica[]; label?: string }) {
  if (!active || !payload) return null;

  return (
    <div className="space-y-2 rounded-interno border border-vidro-borda bg-vidro p-3 text-sm backdrop-blur-md">
      <span className="block font-mono text-texto-secundario">{label}</span>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-baseline justify-between gap-4">
          <span className="text-texto-secundario">{entry.name}</span>
          <span className="font-mono">{currency(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

function Legenda({ itens }: { itens: { nome: string; amostra: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-5 text-sm text-texto-secundario">
      {itens.map((i) => (
        <span key={i.nome} className="flex items-center gap-2">
          {i.amostra}
          {i.nome}
        </span>
      ))}
    </div>
  );
}

/** Painel de um gráfico: título, legenda e o gráfico dentro do poço. */
function PainelGrafico({
  titulo,
  legenda,
  rotulo,
  children,
}: {
  titulo: string;
  legenda: React.ReactNode;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={rotulo} className="rounded-painel border border-painel-borda bg-card p-2">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-3">
        <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
        {legenda}
      </div>
      <div className="rounded-interno bg-poco px-2 pb-3 pt-5 sm:px-4">
        <div className="bloco-sensivel h-72 min-h-[288px]">{children}</div>
      </div>
    </section>
  );
}

export function FluxoCharts({ rows }: { rows: FluxoRow[] }) {
  if (rows.length === 0) return null;

  const eixoX = <XAxis dataKey="mes" tick={TICK_EIXO} axisLine={false} tickLine={false} />;
  const eixoY = (
    <YAxis tickFormatter={(v) => currency(Number(v))} tick={TICK_EIXO} axisLine={false} tickLine={false} width={84} />
  );
  // Só linhas horizontais e tracejadas curtas: a trilha é decorativa, não compete com a barra.
  const grade = <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="var(--grafico-trilha)" />;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
      <PainelGrafico
        titulo="Entradas vs saídas"
        rotulo="Entradas e saídas por mês"
        legenda={
          <Legenda
            itens={[
              { nome: "Entradas", amostra: <span className="size-3 rounded-sm bg-primary" aria-hidden="true" /> },
              {
                nome: "Saídas",
                amostra: <span className="size-3 rounded-sm" style={{ background: HACHURA }} aria-hidden="true" />,
              },
            ]}
          />
        }
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
          <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
            <defs>
              {/* Hachura das saídas: o mesmo traço do EvolucaoMensal, por token. */}
              <pattern id="hachuraSaidas" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" style={{ fill: "var(--hachura-fundo)" }} />
                <rect width="2" height="6" style={{ fill: "var(--hachura-traco)" }} />
              </pattern>
            </defs>
            {grade}
            {eixoX}
            {eixoY}
            <Tooltip content={<TooltipGrafico />} cursor={{ fill: "var(--grafico-trilha)", opacity: 0.45 }} />
            <Bar dataKey="entradas" name="Entradas" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Bar dataKey="saidas" name="Saídas" fill="url(#hachuraSaidas)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </PainelGrafico>

      <PainelGrafico
        titulo="Evolução do saldo"
        rotulo="Saldo por mês"
        legenda={
          <Legenda
            itens={[{ nome: "Saldo", amostra: <span className="h-0.5 w-4 rounded-sm bg-primary" aria-hidden="true" /> }]}
          />
        }
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
          <LineChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            {grade}
            {eixoX}
            {eixoY}
            <Tooltip content={<TooltipGrafico />} cursor={{ stroke: "var(--grafico-neutro)", strokeDasharray: "3 3" }} />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ fill: "var(--primary)", strokeWidth: 2, r: 3.5, stroke: "var(--poco)" }}
              activeDot={{ r: 5, stroke: "var(--primary)", strokeWidth: 2, fill: "var(--poco)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </PainelGrafico>
    </div>
  );
}
