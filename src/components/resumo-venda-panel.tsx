"use client";

import { ArrowRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatBRL } from "@/lib/utils";
import type { CenarioAntecipacao, SimulacaoMargem } from "@/lib/simular-margem-venda";

interface Props {
  simulacao: SimulacaoMargem;
  /** Teto e já comprometido do card de limite, para a barra; sem eles a barra some. */
  barraLimite?: { teto: number; comprometido: number } | null;
  taxaNotaPct?: number;
  comissaoPct?: number;
  regraVencimento?: { diaCorte: number; diaVencimento: number } | null;
}

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const larguraBarra = (parte: number, teto: number) =>
  teto > 0 ? Math.max(0, Math.min(100, (parte / teto) * 100)) : 0;

/**
 * Resumo da venda antes de finalizar (spec 2026-09-30 §7): limite antes e depois, custos e os
 * cenários de antecipação na Prudent. Só apresenta o que `simularMargemVenda` calculou — nada
 * daqui é gravado na venda.
 */
export function ResumoVendaPanel({ simulacao, barraLimite, taxaNotaPct, comissaoPct, regraVencimento }: Props) {
  const { limite, custos, repasse, cenarios, semParcelas, valorParcela } = simulacao;
  const antecipavel = cenarios.some((c) => c.chave === "todas");
  const destaque = (c: CenarioAntecipacao) => c.chave === "todas";

  const custosLinhas: { rotulo: string; valor: number }[] = [
    { rotulo: "Produtos", valor: custos.produtos },
    { rotulo: "Envio", valor: custos.envio },
    { rotulo: custos.nota > 0 && taxaNotaPct ? `Nota fiscal (${pct(taxaNotaPct)})` : "Nota fiscal", valor: custos.nota },
    { rotulo: comissaoPct ? `Comissão (${pct(comissaoPct)})` : "Comissão", valor: custos.comissao },
    { rotulo: "Desconto", valor: custos.desconto },
  ];

  return (
    <div className="grid gap-7 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-5">
        {limite && (
          <section aria-labelledby="resumo-limite" className="flex flex-col gap-2.5">
            <h3 id="resumo-limite" className="text-sm font-bold text-foreground">
              Limite do colaborador
            </h3>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 tabular-nums">
              <span className="text-sm text-muted-foreground valor-sensivel">{formatBRL(limite.antes)}</span>
              <ArrowRight className="h-4 w-4 self-center text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">depois desta venda:</span>
              <span
                className={cn(
                  "text-xl font-extrabold valor-sensivel",
                  limite.depois < 0 ? "text-error-text" : "text-foreground"
                )}
              >
                {formatBRL(limite.depois)}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">disponível por mês</span>
            </div>
            {barraLimite && barraLimite.teto > 0 && (
              <>
                <div
                  role="img"
                  aria-label={`Uso do limite: ${formatBRL(barraLimite.comprometido)} já comprometido, ${formatBRL(valorParcela)} desta venda, teto ${formatBRL(barraLimite.teto)}`}
                  className="flex h-2.5 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="bg-muted-foreground"
                    style={{ width: `${larguraBarra(barraLimite.comprometido, barraLimite.teto)}%` }}
                  />
                  <span
                    className={limite.depois < 0 ? "bg-error" : "bg-success"}
                    style={{ width: `${larguraBarra(valorParcela, barraLimite.teto)}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-muted-foreground" aria-hidden="true" />
                    já comprometido
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn("h-2 w-2 rounded-sm", limite.depois < 0 ? "bg-error" : "bg-success")}
                      aria-hidden="true"
                    />
                    esta venda
                  </span>
                  <span className="ml-auto tabular-nums">
                    teto <span className="valor-sensivel">{formatBRL(barraLimite.teto)}</span>
                  </span>
                </div>
              </>
            )}
          </section>
        )}

        <section aria-labelledby="resumo-custos" className="flex flex-col gap-2">
          <h3 id="resumo-custos" className="text-sm font-bold text-foreground">
            Custos da venda
          </h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm tabular-nums">
            {custosLinhas.map((l) => (
              <div key={l.rotulo} className="contents">
                <dt className="text-muted-foreground">{l.rotulo}</dt>
                <dd className="text-right text-foreground valor-sensivel">{formatBRL(l.valor)}</dd>
              </div>
            ))}
            {repasse && (
              <div className="contents">
                <dt className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  Repasse à empresa ({pct(repasse.pct)})
                  <Badge variant="warning" size="sm">
                    estimado — regra a definir
                  </Badge>
                </dt>
                <dd className="text-right text-foreground valor-sensivel">{formatBRL(repasse.valor)}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section aria-labelledby="resumo-antecipacao" className="flex flex-col gap-2.5 lg:col-span-7">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 id="resumo-antecipacao" className="text-sm font-bold text-foreground">
            Antecipação na Prudent
          </h3>
          <span className="text-xs text-muted-foreground">Simulação — nada disso é gravado na venda.</span>
        </div>

        {antecipavel && semParcelas && (
          <p className="flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-text">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Informe as datas das parcelas para simular a antecipação.
          </p>
        )}

        {/* `border-separate`: em `collapse` o navegador ignora o raio das células, e a coluna em
            destaque perderia os cantos. Com isso a linha divisória sai das células, não do <tr>. */}
        <Table className="border-separate border-spacing-0 tabular-nums">
          <TableHeader className="[&_tr]:bg-transparent dark:[&_tr]:bg-transparent">
            <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
              <TableHead scope="col">
                <span className="sr-only">Cenário</span>
              </TableHead>
              {cenarios.map((c) => (
                <TableHead
                  key={c.chave}
                  scope="col"
                  className={cn(
                    "text-right text-sm normal-case tracking-normal text-foreground",
                    destaque(c) && "rounded-t-lg bg-success-bg font-bold text-success-text"
                  )}
                >
                  {c.rotulo}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:border-t [&_th]:border-t">
            {(
              [
                { rotulo: "Taxa Prudent", campo: "taxa" },
                { rotulo: "Dinheiro já", campo: "dinheiroJa" },
              ] as const
            ).map((linha) => (
              <TableRow key={linha.campo} className="hover:bg-transparent dark:hover:bg-transparent">
                <TableHead scope="row" className="text-sm font-medium normal-case tracking-normal">
                  {linha.rotulo}
                </TableHead>
                {cenarios.map((c) => (
                  <TableCell
                    key={c.chave}
                    className={cn("text-right valor-sensivel", destaque(c) && "bg-success-bg text-success-text")}
                  >
                    {formatBRL(c[linha.campo])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
              <TableHead scope="row" className="text-sm font-bold normal-case tracking-normal text-foreground">
                Lucro estimado
              </TableHead>
              {cenarios.map((c) => (
                <TableCell
                  key={c.chave}
                  className={cn(
                    "text-right text-base font-extrabold valor-sensivel",
                    destaque(c) && "rounded-b-lg bg-success-bg",
                    c.lucro < 0 ? "text-error-text" : destaque(c) ? "text-success-text" : "text-foreground"
                  )}
                >
                  {formatBRL(c.lucro)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {antecipavel
            ? "A coluna em destaque é a que o lucro gravado da venda considera hoje: toda venda em folha antecipada por inteiro."
            : "Esta forma de pagamento não passa pela Prudent."}
          {antecipavel && regraVencimento
            ? ` Vencimentos pela regra da empresa: corte dia ${regraVencimento.diaCorte}, vence dia ${regraVencimento.diaVencimento}.`
            : ""}
        </p>
      </section>
    </div>
  );
}
