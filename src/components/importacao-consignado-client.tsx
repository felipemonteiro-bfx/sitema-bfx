"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { descreverAvisoConsignado, descreverMotivoConsignado } from "@/lib/consignado-import";
import type {
  ResultadoAnaliseConsignado,
  ResultadoCommitConsignado,
} from "@/app/(app)/importacao/consignado/actions";

function Contador({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{valor}</div>
    </div>
  );
}

type Analisar = (formData: FormData) => Promise<ResultadoAnaliseConsignado | { erro: string }>;
type Confirmar = (formData: FormData) => Promise<ResultadoCommitConsignado | { erro: string }>;

export default function ImportacaoConsignadoClient({
  analisarAction,
  confirmarAction,
}: {
  analisarAction: Analisar;
  confirmarAction: Confirmar;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [plano, setPlano] = useState<ResultadoAnaliseConsignado | null>(null);
  const [resultado, setResultado] = useState<ResultadoCommitConsignado | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    arquivoRef.current = file;
    setFileName(file.name);
    setPlano(null);
    setResultado(null);
    setAnalisando(true);
    try {
      const fd = new FormData();
      fd.set("arquivo", file);
      const r = await analisarAction(fd);
      if ("erro" in r) {
        toast.error(r.erro);
        return;
      }
      setPlano(r);
    } catch {
      toast.error("Erro ao analisar o arquivo.");
    } finally {
      setAnalisando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!arquivoRef.current) return;
    setConfirmando(true);
    try {
      const fd = new FormData();
      fd.set("arquivo", arquivoRef.current);
      const r = await confirmarAction(fd);
      if ("erro" in r) {
        toast.error(r.erro);
        return;
      }
      setResultado(r);
      setPlano(null);
      toast.success(
        `Importação concluída: ${r.contratos} contratos, ${r.leadsCriar} leads, ${r.clientesCasados} clientes casados.`,
      );
      router.refresh();
    } catch {
      toast.error("Erro ao confirmar a importação.");
    } finally {
      setConfirmando(false);
      setConfirmOpen(false);
    }
  };

  const podeConfirmar = plano != null && plano.contratos.length > 0;
  // Avisos do parse (duplicata no arquivo) e do casamento (CPF repetido no cadastro).
  const avisos = plano
    ? [...plano.parse.avisos, ...plano.avisos].sort((a, b) => a.linha - b.linha)
    : [];

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação de e-Consignado?</AlertDialogTitle>
            <AlertDialogDescription>
              {plano?.resumo.contratosNovos ?? 0} contratos novos,{" "}
              {plano?.resumo.contratosAtualizados ?? 0} atualizados,{" "}
              {plano?.resumo.leadsCriar ?? 0} leads. Contratos que saíram da planilha
              permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmar} disabled={confirmando}>
              {confirmando ? "Importando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Arquivo Dataprev</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv,.txt"
                onChange={handleFile}
                disabled={analisando}
                className="sr-only"
                aria-label="Selecionar arquivo e-Consignado"
              />
              <Button
                type="button"
                variant="outline"
                disabled={analisando}
                onClick={() => fileRef.current?.click()}
              >
                Escolher arquivo
              </Button>
              <span className="text-sm text-muted-foreground">
                {fileName ?? "Nenhum arquivo escolhido"}
              </span>
              {/* Região viva sempre montada: leitor de tela ignora região que já nasce com texto. */}
              <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                {analisando && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-info-text" aria-hidden />
                    Analisando…
                  </>
                )}
                {!analisando && plano && (
                  <span className="sr-only">
                    Análise pronta: {plano.contratos.length} contratos, {avisos.length} avisos,{" "}
                    {plano.erros.length} linhas recusadas.
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Layout: aba <strong>eConsignadoCLT</strong> (xlsx) ou CSV com as colunas{" "}
              <strong>ifConcessora.codigo</strong>, <strong>contrato</strong>,{" "}
              <strong>cpf</strong>, <strong>valorParcela</strong>, competências de desconto.
            </p>
          </CardContent>
        </Card>

        {plano && (
          <Card className="border-info bg-info-bg">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-primary">2. Análise — nada foi gravado ainda</CardTitle>
              <Button
                type="button"
                disabled={!podeConfirmar || confirmando}
                onClick={() => setConfirmOpen(true)}
                leftIcon={
                  confirmando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
              >
                Confirmar importação
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Contador label="Novos" valor={plano.resumo.contratosNovos} />
                <Contador label="Atualizar" valor={plano.resumo.contratosAtualizados} />
                <Contador label="Clientes" valor={plano.resumo.clientesCasados} />
                <Contador label="Leads" valor={plano.resumo.leadsCriar} />
              </div>
              {avisos.length > 0 && (
                <div className="rounded-md border border-warning/30 bg-warning-bg p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning-text">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    Avisos ({avisos.length}) — não impedem a importação
                  </div>
                  <ul
                    tabIndex={0}
                    aria-label="Avisos da análise"
                    className="max-h-48 space-y-1 overflow-y-auto text-xs text-warning-text"
                  >
                    {avisos.map((aviso, i) => (
                      <li key={i}>{descreverAvisoConsignado(aviso)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plano.erros.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">
                    Linhas recusadas ({plano.erros.length}) — ficam de fora, o resto importa
                  </div>
                  {/* div com overflow, não ScrollArea: o Viewport do Radix (h-full) ignora o
                      max-h do Root e corta as linhas sem barra de rolagem. */}
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Linhas recusadas"
                    className="max-h-64 overflow-y-auto rounded-md border bg-card"
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Linha</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Conteúdo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plano.erros.map((erro, i) => (
                          <TableRow key={i}>
                            <TableCell>{erro.linha}</TableCell>
                            <TableCell>{descreverMotivoConsignado(erro.motivo)}</TableCell>
                            <TableCell className="font-mono text-xs">{erro.conteudo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {resultado && (
          <Card className="border-success bg-success-bg">
            <CardHeader>
              <CardTitle className="text-success-text">Importação concluída</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Contador label="Contratos" valor={resultado.contratos} />
                <Contador label="Clientes" valor={resultado.clientesCasados} />
                <Contador label="Leads" valor={resultado.leadsCriar} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
