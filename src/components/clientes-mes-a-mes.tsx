import { Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatBRL } from "@/lib/utils";

export type MesClientes = {
  mes: string;
  mesLongo: string;
  total: number;
  novos: number;
  recorrentes: number;
  vendas: number;
  /** Faturamento do mês (mesmo cálculo do gráfico de faturamento), quando disponível. */
  faturamento?: number;
  /** Variação contra o mês anterior (o corrente compara com os mesmos dias). */
  variacao: { diferenca: number; percentual: number | null; base: string } | null;
};

// Hachura dos recorrentes: tokens, a mesma do gráfico de evolução do Início.
const HACHURA = "repeating-linear-gradient(135deg, var(--hachura-traco) 0 2px, var(--hachura-fundo) 2px 6px)";

function Legenda() {
  return (
    <div className="flex gap-5 text-sm text-texto-secundario">
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-sm bg-primary" aria-hidden="true" />
        Novos
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-sm" style={{ background: HACHURA }} aria-hidden="true" />
        Recorrentes
      </span>
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
  // 15% de folga no teto: o número de cada coluna mora acima da barra.
  const teto = Math.max(1, ...meses.map((m) => m.total)) / 0.85;

  return (
    <section aria-labelledby="clientes-mes-titulo" className="rounded-painel border border-border bg-card p-2">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-4">
        <div className="space-y-1">
          <h2 id="clientes-mes-titulo" className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            Clientes que compraram, mês a mês
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada cliente conta uma vez por mês, mesmo com várias compras. Novo = primeira compra na BFX.
          </p>
        </div>
        <Legenda />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 rounded-interno bg-poco p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <div role="img" aria-label={`Gráfico de clientes por mês. ${resumo}`} className="flex h-64 items-stretch gap-2 sm:gap-4">
            {meses.map((m, i) => (
              <div key={m.mesLongo} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-1 font-mono text-sm font-medium">{m.total}</span>
                <div className="flex w-[64%] max-w-14 flex-col-reverse" style={{ height: `${(m.total / teto) * 100}%` }}>
                  <span
                    className="anim-barra block rounded-sm"
                    style={{ height: `${m.total > 0 ? (m.recorrentes / m.total) * 100 : 0}%`, background: HACHURA, "--i": i } as React.CSSProperties}
                  />
                  {m.novos > 0 && (
                    <span
                      className="anim-barra block min-h-1 rounded-sm bg-primary"
                      style={{ height: `${(m.novos / m.total) * 100}%`, boxShadow: "0 2px 0 0 var(--poco)", "--i": i } as React.CSSProperties}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="mt-3 flex gap-2 font-mono text-xs text-muted-foreground sm:gap-4">
            {meses.map((m) => (
              <span key={m.mesLongo} className="min-w-0 flex-1 text-center">
                {m.mes}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Por cliente</TableHead>
                <TableHead className="text-right">Clientes vs mês anterior</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...meses].reverse().map((m) => (
                <TableRow key={m.mesLongo}>
                  <TableCell>{m.mesLongo}</TableCell>
                  <TableCell className="text-right tabular-nums valor-sensivel valor-sensivel-fim">
                    {m.faturamento === undefined ? "—" : formatBRL(m.faturamento)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {m.total}
                    <span className="block text-xs font-normal text-muted-foreground">{m.novos} {m.novos === 1 ? "novo" : "novos"}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground valor-sensivel valor-sensivel-fim">
                    {m.faturamento === undefined || m.total === 0 ? "—" : formatBRL(m.faturamento / m.total)}
                  </TableCell>
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
      </div>
    </section>
  );
}
