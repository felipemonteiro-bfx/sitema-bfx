"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FormSecaoTitulo } from "@/components/form-secao-titulo";
import { Alert } from "@/components/ui/alert";
import { darBaixaParcela, desfazerBaixaParcela } from "@/app/(app)/historico/baixa-actions";
import { linhaRecebimento, resumoRecebimento, temParcelaRepetida, type ParcelaRecebimento } from "@/lib/recebimento-parcelas";
import { formatarDataPura } from "@/lib/data-pura";
import { cn, formatBRL } from "@/lib/utils";


type Props = {
  parcelas: ParcelaRecebimento[];
  /** "YYYY-MM-DD" em Manaus, calculado no servidor (evita divergência de hidratação). */
  hoje: string;
  podeDarBaixa: boolean;
};

/**
 * "Recebimento das parcelas" na ficha da venda. Fica dentro do <form> de edição, mas não participa
 * dele: botões são type="button", campos não têm `name`, e cada baixa é gravada na hora pela
 * própria action. Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md (Telas).
 */
export function RecebimentoParcelas({ parcelas, hoje, podeDarBaixa }: Props) {
  const router = useRouter();
  const [emAndamento, startTransition] = useTransition();
  const [abertaId, setAbertaId] = useState<number | null>(null);
  const [dataBaixa, setDataBaixa] = useState(hoje);
  const { recebido, total } = resumoRecebimento(parcelas);

  function executar(acao: (fd: FormData) => Promise<{ success: boolean; error?: string }>, campos: Record<string, string>, sucesso: string) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, v);
    startTransition(async () => {
      try {
        const r = await acao(fd);
        if (!r.success) {
          toast.error(r.error || "Não foi possível gravar.");
          return;
        }
        toast.success(sucesso);
        setAbertaId(null);
        router.refresh();
      } catch {
        toast.error("Não foi possível gravar. Tente novamente.");
      }
    });
  }

  function abrirBaixa(id: number) {
    setDataBaixa(hoje);
    setAbertaId((atual) => (atual === id ? null : id));
  }

  // min-w-0: sem isso a largura minima da tabela empurra o grid do formulario e o modal inteiro
  // rola na horizontal no celular; a rolagem fica so dentro da tabela.
  return (
    <div className="md:col-span-3 min-w-0 space-y-3">
      <FormSecaoTitulo>
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span>Recebimento das parcelas</span>
          <span className="font-normal text-muted-foreground">
            Recebido <strong className="font-semibold text-foreground tabular-nums valor-sensivel">{formatBRL(recebido)}</strong> de{" "}
            <span className="tabular-nums valor-sensivel">{formatBRL(total)}</span>
          </span>
        </span>
      </FormSecaoTitulo>

      {podeDarBaixa && (
        <p className="text-sm text-muted-foreground text-pretty">
          Boleto pago no Asaas e parcela antecipada na Prudent recebem baixa sozinhos. Use a baixa manual para repasse
          da folha, PIX ou cartão. A baixa é gravada na hora, sem precisar salvar a venda.
        </p>
      )}

      {temParcelaRepetida(parcelas) && (
        <Alert variant="warning" showIcon className="text-xs">
          Esta venda tem parcelas com o mesmo número. O total recebido soma as duas linhas.
        </Alert>
      )}

      <div className="rounded-interno bg-poco overflow-hidden">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Parcela</TableHead>
              <TableHead className="w-28">Vencimento</TableHead>
              <TableHead className="w-28 text-right">Valor</TableHead>
              <TableHead className="w-28">Situação</TableHead>
              <TableHead>Baixa</TableHead>
              {podeDarBaixa && (
                <TableHead className="w-32">
                  <span className="sr-only">Ações</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((p) => {
              const linha = linhaRecebimento(p, hoje);
              const aberta = abertaId === p.id;
              const rotulo = `${p.numeroParcela}/${p.totalParcelas}`;
              return (
                <Fragment key={p.id}>
                  <TableRow semBorda={aberta}>
                    <TableCell mono>{rotulo}</TableCell>
                    <TableCell mono>{formatarDataPura(p.dataVencimento)}</TableCell>
                    <TableCell numeric className="valor-sensivel valor-sensivel-fim">{formatBRL(p.valorParcela)}</TableCell>
                    <TableCell>
                      {linha.situacao === "paga" ? (
                        <Badge variant="success">Paga</Badge>
                      ) : linha.situacao === "vencida" ? (
                        <Badge variant="error">Vencida</Badge>
                      ) : (
                        <Badge variant="outline">Em aberto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {linha.origemTitulo ? (
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold">{linha.origemTitulo}</span>
                          {linha.origemDetalhe && <span className="text-xs text-muted-foreground">{linha.origemDetalhe}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {linha.situacao === "vencida"
                            ? `${linha.diasAtraso} ${linha.diasAtraso === 1 ? "dia" : "dias"} em atraso`
                            : "—"}
                        </span>
                      )}
                    </TableCell>
                    {podeDarBaixa && (
                      <TableCell className="text-right">
                        {!p.paga ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => abrirBaixa(p.id)}
                            disabled={emAndamento}
                            aria-label={aberta ? `Cancelar baixa da parcela ${rotulo}` : `Dar baixa na parcela ${rotulo}`}
                            aria-expanded={aberta}
                            aria-controls={`baixa-parcela-${p.id}`}
                          >
                            {aberta ? "Cancelar" : "Dar baixa"}
                          </Button>
                        ) : !linha.podeDesfazer ? null : linha.desfazerPedeConfirmacao ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" disabled={emAndamento} aria-label={`Desfazer baixa da parcela ${rotulo}`}>
                                Desfazer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {p.origemPagamento === "asaas" ? "Desfazer a baixa do Asaas?" : "Desfazer a baixa da Prudent?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {p.origemPagamento === "asaas"
                                    ? `A parcela ${rotulo} foi quitada por boleto pago no Asaas${p.dataPagamento ? ` em ${formatarDataPura(p.dataPagamento)}` : ""}. Se a cobrança continuar paga lá, a baixa volta na conferência diária.`
                                    : `A parcela ${rotulo} foi antecipada na Prudent. Desfazer deixa a parcela em aberto e fora da antecipação: ela volta à fila da Prudent. Use quando a antecipação não aconteceu (lote concluído por engano).`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() =>
                                    executar(desfazerBaixaParcela, { parcelaId: String(p.id), confirmar: "1" }, `Baixa da parcela ${rotulo} desfeita.`)
                                  }
                                >
                                  Desfazer baixa
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={emAndamento}
                            aria-label={`Desfazer baixa da parcela ${rotulo}`}
                            onClick={() => executar(desfazerBaixaParcela, { parcelaId: String(p.id) }, `Baixa da parcela ${rotulo} desfeita.`)}
                          >
                            Desfazer
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                  {aberta && (
                    <TableRow semHover
                      id={`baixa-parcela-${p.id}`}

                    >
                      <TableCell colSpan={6} className="pt-0">
                        <div className="flex flex-wrap items-end gap-3 md:pl-20">
                          <div className="space-y-1.5">
                            <Label htmlFor={`data-baixa-${p.id}`}>Data do pagamento</Label>
                            <DateInput
                              id={`data-baixa-${p.id}`}
                              value={dataBaixa}
                              onChange={setDataBaixa}
                              required
                              max={hoje}
                              className="w-44"
                            />
                          </div>
                          <Button
                            type="button"
                            loading={emAndamento}
                            leftIcon={<Check className="h-4 w-4" />}
                            aria-label={`Confirmar baixa da parcela ${rotulo}`}
                            onClick={() =>
                              executar(darBaixaParcela, { parcelaId: String(p.id), dataPagamento: dataBaixa }, `Parcela ${rotulo} recebeu baixa.`)
                            }
                          >
                            Confirmar baixa
                          </Button>
                          <span className="pb-3 text-xs text-muted-foreground">Padrão: hoje. Não aceita data futura.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
