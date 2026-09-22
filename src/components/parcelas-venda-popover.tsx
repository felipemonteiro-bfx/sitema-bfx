"use client";

import { Fragment, useState, useTransition } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatBRL } from "@/lib/utils";
import { formatarDataPura } from "@/lib/data-pura";
import type { ParcelasDaVenda, SituacaoParcela } from "@/lib/antecipacao-compradores";
import { usePopoverHover } from "@/hooks/use-popover-hover";
import { darBaixaParcelas } from "@/app/(app)/historico/baixa-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SITUACAO: Record<SituacaoParcela, { rotulo: string; classe: string }> = {
  antecipada: { rotulo: "Antecipada", classe: "bg-success-bg text-success-text" },
  em_andamento: { rotulo: "Em andamento na Prudent", classe: "bg-info-bg text-info-text" },
  paga: { rotulo: "Paga", classe: "bg-success-bg text-success-text" },
  a_antecipar: { rotulo: "A antecipar", classe: "bg-warning-bg text-warning-text" },
  vencida: { rotulo: "Venceu sem antecipar", classe: "bg-error-bg text-error-text" },
};

const CELULA = "px-2 py-1.5 tabular-nums";
const PILULA = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Um número da célula "total / antecipadas / a antecipar / vencidas": zero fica apagado, sem tint. */
function Contador({ valor, classe }: { valor: number; classe: string }) {
  if (valor === 0) return <span className="px-1 text-xs font-bold text-muted-foreground">0</span>;
  return <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-bold", classe)}>{valor}</span>;
}

const Barra = () => (
  <span aria-hidden="true" className="text-xs text-muted-foreground">
    /
  </span>
);

/**
 * Parcelas de uma venda, na célula "4 / 2 / 1 / 1" da coluna Parcelas da fila (total /
 * antecipadas / em andamento / a antecipar / vencidas; legenda no "?" do cabeçalho.
 * Abre com a data da compra,
 * quantas parcelas e de quanto, a contagem por situação, a tabela parcela a
 * parcela e o que já foi e o que falta antecipar. Tudo calculado no servidor
 * (`parcelasDaVenda`); aqui só se mostra. Abre no hover, fixa no clique.
 */
export function ParcelasVendaPopover({ parcelas, hoje }: { parcelas: ParcelasDaVenda; hoje: string }) {
  const { estado, popover, gatilho, conteudo } = usePopoverHover();
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [emAndamento, startTransition] = useTransition();
  const { contagem, lista, totais } = parcelas;
  const selecionaveis = lista.filter((p) => p.situacao === "vencida" && p.id != null);
  const valorSelecionado = lista
    .filter((p) => p.id != null && selecionadas.includes(p.id))
    .reduce((total, p) => total + p.valor, 0);
  const alternar = (id: number, marcado: boolean) => {
    setSelecionadas((atual) => marcado ? [...new Set([...atual, id])] : atual.filter((item) => item !== id));
  };
  const confirmarBaixa = () => {
    if (selecionadas.length === 0) return;
    const fd = new FormData();
    fd.set("parcelaIds", JSON.stringify(selecionadas));
    fd.set("dataPagamento", dataPagamento);
    startTransition(async () => {
      try {
        const resultado = await darBaixaParcelas(fd);
        if (!resultado.success) {
          toast.error(resultado.error || "Não foi possível dar baixa nas parcelas.");
          return;
        }
        toast.success(`${resultado.count} ${resultado.count === 1 ? "parcela recebeu" : "parcelas receberam"} baixa.`);
        setSelecionadas([]);
        router.refresh();
      } catch {
        toast.error("Não foi possível dar baixa nas parcelas. Tente novamente.");
      }
    });
  };
  const chips = [
    { n: contagem.antecipadas, texto: plural(contagem.antecipadas, "antecipada", "antecipadas"), classe: SITUACAO.antecipada.classe },
    { n: contagem.emAndamento, texto: `${contagem.emAndamento} em andamento`, classe: SITUACAO.em_andamento.classe },
    { n: contagem.aAntecipar, texto: `${contagem.aAntecipar} a antecipar`, classe: SITUACAO.a_antecipar.classe },
    {
      n: contagem.vencidas,
      texto: plural(contagem.vencidas, "vencida sem antecipação", "vencidas sem antecipação"),
      classe: SITUACAO.vencida.classe,
    },
  ].filter((c) => c.n > 0);

  return (
    <Popover {...popover}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="ghost"
          {...gatilho}
          aria-label={`${plural(parcelas.quantidade, "parcela", "parcelas")}: ${contagem.antecipadas} antecipadas, ${contagem.emAndamento} em andamento na Prudent, ${contagem.aAntecipar} a antecipar, ${contagem.vencidas} vencidas sem antecipação. Ver parcelas`}
          // Sempre os quatro números, na ordem da legenda do "?" do cabeçalho: a
          // posição e a cor dizem o que cada um conta. Tints opacos com a família -text
          // (policiados pela catraca de contraste). 44px de alvo no celular.
          className={cn("-mr-1.5 h-11 gap-1 px-1.5 tabular-nums md:h-8", estado.fixo && "bg-muted")}
        >
          <span className="text-sm font-bold text-foreground">{parcelas.quantidade}</span>
          <Barra />
          <Contador valor={contagem.antecipadas} classe={SITUACAO.antecipada.classe} />
          <Barra />
          <Contador valor={contagem.emAndamento} classe={SITUACAO.em_andamento.classe} />
          <Barra />
          <Contador valor={contagem.aAntecipar} classe={SITUACAO.a_antecipar.classe} />
          <Barra />
          <Contador valor={contagem.vencidas} classe={SITUACAO.vencida.classe} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-[30rem] p-3 text-left" {...conteudo}>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parcelas da venda</div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            Compra em <strong className="font-semibold tabular-nums">{formatarDataPura(parcelas.dataCompra)}</strong>
          </span>
          <span>
            <strong className="font-semibold">{plural(parcelas.quantidade, "parcela", "parcelas")}</strong>
            {parcelas.valorParcela !== null && (
              <>
                {" "}de <span className="tabular-nums">{formatBRL(parcelas.valorParcela)}</span>
              </>
            )}
          </span>
        </div>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c.texto} className={cn(PILULA, c.classe)}>
                {c.texto}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2.5 [&>div]:max-h-[min(22rem,50dvh)]">
          <Table className="text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                {selecionaveis.length > 0 && <TableHead className="h-8 w-10 px-2"><span className="sr-only">Selecionar para baixa</span></TableHead>}
                <TableHead className="h-8 px-2">Nº</TableHead>
                <TableHead className="h-8 px-2">Vencimento</TableHead>
                <TableHead className="h-8 px-2 text-right">Valor</TableHead>
                <TableHead className="h-8 px-2">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow key={`${p.numero}-${p.vencimento}`} className="hover:bg-transparent">
                  {selecionaveis.length > 0 && (
                    <TableCell className="px-2 py-1.5">
                      {p.situacao === "vencida" && p.id != null ? (
                        <Checkbox
                          checked={selecionadas.includes(p.id)}
                          onCheckedChange={(marcado) => alternar(p.id!, marcado === true)}
                          aria-label={`Selecionar parcela ${p.numero} para dar baixa`}
                          disabled={emAndamento}
                        />
                      ) : null}
                    </TableCell>
                  )}
                  <TableCell className={CELULA}>
                    {p.numero}/{parcelas.quantidade}
                  </TableCell>
                  <TableCell className={CELULA}>{formatarDataPura(p.vencimento)}</TableCell>
                  <TableCell className={cn(CELULA, "text-right whitespace-nowrap")}>{formatBRL(p.valor)}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <span className={cn(PILULA, SITUACAO[p.situacao].classe)}>
                      {p.situacao === "paga" && p.origemPagamento === "manual" ? "Paga manual" : SITUACAO[p.situacao].rotulo}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {selecionadas.length > 0 && (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <label className="space-y-1 text-xs font-medium text-muted-foreground" htmlFor="data-baixa-popover">
              Data do pagamento
              <DateInput
                id="data-baixa-popover"
                value={dataPagamento}
                onChange={setDataPagamento}
                max={hoje}
                className="mt-1 w-40"
                disabled={emAndamento}
              />
            </label>
            <Button type="button" size="sm" loading={emAndamento} onClick={confirmarBaixa}>
              Confirmar baixa · {selecionadas.length} · {formatBRL(valorSelecionado)}
            </Button>
            <p className="pb-1 text-xs text-muted-foreground">Somente as parcelas marcadas serão baixadas.</p>
          </div>
        )}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-success-bg px-2.5 py-2 text-success-text">
            <div className="text-xs font-bold uppercase tracking-wider">Já recebido</div>
            <div className="font-bold tabular-nums">{formatBRL(totais.antecipado)}</div>
          </div>
          <div className="rounded-lg bg-warning-bg px-2.5 py-2 text-warning-text">
            <div className="text-xs font-bold uppercase tracking-wider">Falta antecipar</div>
            <div className="font-bold tabular-nums">{formatBRL(totais.faltaAntecipar)}</div>
          </div>
        </div>
        {!estado.fixo && <p className="mt-2 text-xs text-muted-foreground">Clique nos números para manter aberto.</p>}
      </PopoverContent>
    </Popover>
  );
}

const LEGENDA = [
  { numero: <span className="px-1 text-sm font-bold text-foreground">4</span>, texto: "total de parcelas da venda" },
  { numero: <Contador valor={2} classe={SITUACAO.antecipada.classe} />, texto: "já antecipadas" },
  { numero: <Contador valor={1} classe={SITUACAO.em_andamento.classe} />, texto: "em andamento — enviadas à Prudent, sem retorno" },
  { numero: <Contador valor={1} classe={SITUACAO.a_antecipar.classe} />, texto: "a antecipar — vencem de hoje em diante" },
  { numero: <Contador valor={1} classe={SITUACAO.vencida.classe} />, texto: "venceram sem antecipar" },
];

/**
 * "?" ao lado de "Parcelas" no cabeçalho da fila: o que cada número da célula
 * conta, nas mesmas cores. Num popover para o cabeçalho continuar enxuto
 * (pedido do André, 2026-09-11). Abre no hover, fixa no clique.
 */
export function LegendaParcelas() {
  const { popover, gatilho, conteudo } = usePopoverHover();
  return (
    <Popover {...popover}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          {...gatilho}
          aria-label="O que significam os números da coluna Parcelas"
          // 44px de alvo no celular; no computador cabe no cabeçalho compacto.
          className="h-11 w-11 text-muted-foreground hover:text-foreground md:h-6 md:w-6"
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-[21rem] p-3 text-left text-sm" {...conteudo}>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Coluna Parcelas</div>
        <dl className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
          {LEGENDA.map((item) => (
            <Fragment key={item.texto}>
              <dt className="justify-self-center tabular-nums">{item.numero}</dt>
              <dd>{item.texto}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-2.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
          Ex.: <strong className="tabular-nums text-foreground">4 / 2 / 1 / 1</strong> = 4 parcelas: 2 já antecipadas, 1 a
          antecipar e 1 vencida. Zero fica em cinza.
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">Passe o mouse ou clique nos números da linha para ver parcela a parcela.</p>
      </PopoverContent>
    </Popover>
  );
}
