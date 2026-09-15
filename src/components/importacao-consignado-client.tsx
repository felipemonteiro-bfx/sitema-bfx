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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
              {analisando && <Loader2 className="h-5 w-5 animate-spin text-info-text" />}
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
            <CardHeader className="flex flex-row items-center justify-between">
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
              {plano.erros.length > 0 && (
                <ScrollArea className="max-h-64 rounded-md border bg-card">
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
                          <TableCell>{erro.motivo}</TableCell>
                          <TableCell className="font-mono text-xs">{erro.conteudo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
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
