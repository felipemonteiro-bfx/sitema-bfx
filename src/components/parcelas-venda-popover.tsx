"use client";

import { Label } from "@/components/ui/label";
import { Fragment, useState, useTransition } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// O estado mora no Badge (variantes success/info/warning/error do design system), nunca no contêiner.
type VarianteSelo = "success" | "info" | "warning" | "error";
const SITUACAO: Record<SituacaoParcela, { rotulo: string; variante: VarianteSelo }> = {
  antecipada: { rotulo: "Antecipada", variante: "success" },
  em_andamento: { rotulo: "Em andamento na Prudent", variante: "info" },
  paga: { rotulo: "Paga", variante: "success" },
  a_antecipar: { rotulo: "A antecipar", variante: "warning" },
  vencida: { rotulo: "Venceu sem antecipar", variante: "error" },
};

const CELULA = "px-2 py-1.5";
const PILULA = "whitespace-nowrap";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Um número da célula "total / antecipadas / a antecipar / vencidas": zero fica apagado, sem tint. */
function Contador({ valor, variante }: { valor: number; variante: VarianteSelo }) {
  if (valor === 0) return <span className="px-1 text-xs font-medium text-muted-foreground">0</span>;
  return (
    <Badge variant={variante} size="sm" className="px-1.5 font-medium tabular-nums">
      {valor}
    </Badge>
  );
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
    { n: contagem.antecipadas, texto: plural(contagem.antecipadas, "antecipada", "antecipadas"), variante: SITUACAO.antecipada.variante },
    { n: contagem.emAndamento, texto: `${contagem.emAndamento} em andamento`, variante: SITUACAO.em_andamento.variante },
    { n: contagem.aAntecipar, texto: `${contagem.aAntecipar} a antecipar`, variante: SITUACAO.a_antecipar.variante },
    {
      n: contagem.vencidas,
      texto: plural(contagem.vencidas, "vencida sem antecipação", "vencidas sem antecipação"),
      variante: SITUACAO.vencida.variante,
    },
  ].filter((c) => c.n > 0);

  return (
    <Popover {...popover}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant={estado.fixo ? "secondary" : "ghost"}
          size="xs"
          {...gatilho}
          aria-label={`${plural(parcelas.quantidade, "parcela", "parcelas")}: ${contagem.antecipadas} antecipadas, ${contagem.emAndamento} em andamento na Prudent, ${contagem.aAntecipar} a antecipar, ${contagem.vencidas} vencidas sem antecipação. Ver parcelas`}
          // Sempre os quatro números, na ordem da legenda do "?" do cabeçalho: a
          // posição e a cor dizem o que cada um conta. Tints opacos com a família -text
          // (policiados pela catraca de contraste). 44px de alvo no celular.
          className="-mr-1.5 gap-1"
        >
          <span className="text-sm font-bold text-foreground">{parcelas.quantidade}</span>
          <Barra />
          <Contador valor={contagem.antecipadas} variante={SITUACAO.antecipada.variante} />
          <Barra />
          <Contador valor={contagem.emAndamento} variante={SITUACAO.em_andamento.variante} />
          <Barra />
          <Contador valor={contagem.aAntecipar} variante={SITUACAO.a_antecipar.variante} />
          <Barra />
          <Contador valor={contagem.vencidas} variante={SITUACAO.vencida.variante} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-[30rem] p-3 text-left" {...conteudo}>
        <div className="text-sm font-medium text-muted-foreground">Parcelas da venda</div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            Compra em <strong className="font-semibold tabular-nums">{formatarDataPura(parcelas.dataCompra)}</strong>
          </span>
          <span>
            <strong className="font-semibold">{plural(parcelas.quantidade, "parcela", "parcelas")}</strong>
            {parcelas.valorParcela !== null && (
              <>
                {" "}de <span className="tabular-nums valor-sensivel">{formatBRL(parcelas.valorParcela)}</span>
              </>
            )}
          </span>
        </div>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <Badge key={c.texto} variant={c.variante} className={PILULA}>
                {c.texto}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-2.5 [&>div]:max-h-[min(22rem,50dvh)]">
          <Table>
            <TableHeader sticky fundo="popover">
              <TableRow semHover>
                {selecionaveis.length > 0 && <TableHead className="h-8 w-10 px-2"><span className="sr-only">Selecionar para baixa</span></TableHead>}
                <TableHead className="h-8 px-2">Nº</TableHead>
                <TableHead className="h-8 px-2">Vencimento</TableHead>
                <TableHead className="h-8 px-2 text-right">Valor</TableHead>
                <TableHead className="h-8 px-2">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow semHover key={`${p.numero}-${p.vencimento}`}>
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
                  <TableCell mono className={CELULA}>
                    {p.numero}/{parcelas.quantidade}
                  </TableCell>
                  <TableCell mono className={CELULA}>{formatarDataPura(p.vencimento)}</TableCell>
                  <TableCell numeric className={cn(CELULA, "whitespace-nowrap valor-sensivel valor-sensivel-fim")}>{formatBRL(p.valor)}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={SITUACAO[p.situacao].variante} className={PILULA}>
                      {p.situacao === "paga" && p.origemPagamento === "manual" ? "Paga manual" : SITUACAO[p.situacao].rotulo}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {selecionadas.length > 0 && (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <Label size="sm" className="block" htmlFor="data-baixa-popover">
              Data do pagamento
              <DateInput
                id="data-baixa-popover"
                value={dataPagamento}
                onChange={setDataPagamento}
                max={hoje}
                className="mt-1 w-40"
                disabled={emAndamento}
              />
            </Label>
            <Button type="button" size="sm" loading={emAndamento} onClick={confirmarBaixa}>
              {/* Rótulo inteiro num <span>: o `gap` do Button abriria folga em volta do valor. */}
              <span>
                Confirmar baixa · {selecionadas.length} · <span className="valor-sensivel">{formatBRL(valorSelecionado)}</span>
              </span>
            </Button>
            <p className="pb-1 text-xs text-muted-foreground">Somente as parcelas marcadas serão baixadas.</p>
          </div>
        )}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-interno bg-card-elevated px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">Já recebido</div>
            <div className="font-medium tabular-nums text-foreground valor-sensivel">{formatBRL(totais.antecipado)}</div>
          </div>
          <div className="rounded-interno bg-card-elevated px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">Falta antecipar</div>
            <div className="font-medium tabular-nums text-foreground valor-sensivel">{formatBRL(totais.faltaAntecipar)}</div>
          </div>
        </div>
        {!estado.fixo && <p className="mt-2 text-xs text-muted-foreground">Clique nos números para manter aberto.</p>}
      </PopoverContent>
    </Popover>
  );
}

const LEGENDA = [
  { numero: <span className="px-1 text-sm font-bold text-foreground">4</span>, texto: "total de parcelas da venda" },
  { numero: <Contador valor={2} variante={SITUACAO.antecipada.variante} />, texto: "já antecipadas" },
  { numero: <Contador valor={1} variante={SITUACAO.em_andamento.variante} />, texto: "em andamento — enviadas à Prudent, sem retorno" },
  { numero: <Contador valor={1} variante={SITUACAO.a_antecipar.variante} />, texto: "a antecipar — vencem de hoje em diante" },
  { numero: <Contador valor={1} variante={SITUACAO.vencida.variante} />, texto: "venceram sem antecipar" },
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
          variant="discreto"
          size="iconSm"
          {...gatilho}
          aria-label="O que significam os números da coluna Parcelas"
          // 44px de alvo no celular; no computador cabe no cabeçalho compacto.
          className="h-11 w-11 md:h-6 md:w-6"
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-[21rem] p-3 text-left text-sm" {...conteudo}>
        <div className="mb-2 text-sm font-medium text-muted-foreground">Coluna Parcelas</div>
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
