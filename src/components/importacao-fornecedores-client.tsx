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
import type { PlanoImportacao } from "@/lib/fornecedor-import";
import type { ResultadoCommit } from "@/app/(app)/importacao/fornecedores/actions";

interface ImportacaoFornecedoresClientProps {
  /** Recebe `analisarImportacaoFornecedores` (dry-run, so leitura). */
  analisarAction: (texto: string) => Promise<PlanoImportacao>;
  /** Recebe `confirmarImportacaoFornecedores` (aplica a transacao). */
  confirmarAction: (texto: string) => Promise<ResultadoCommit>;
}

export default function ImportacaoFornecedoresClient({
  analisarAction,
  confirmarAction,
}: ImportacaoFornecedoresClientProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanoImportacao | null>(null);
  const [resultado, setResultado] = useState<ResultadoCommit | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPlano(null);
    setResultado(null);
    setAnalisando(true);
    try {
      const conteudo = await file.text();
      setTexto(conteudo);
      const resultadoAnalise = await analisarAction(conteudo);
      setPlano(resultadoAnalise);
    } catch {
      toast.error("Erro ao analisar o arquivo CSV.");
    } finally {
      setAnalisando(false);
    }
  };

  const podeConfirmar =
    plano != null && plano.resumo.criar + plano.resumo.reativar > 0 && texto != null;

  const handleConfirmar = async () => {
    if (!texto) return;
    setConfirmando(true);
    try {
      const resultadoCommit = await confirmarAction(texto);
      setResultado(resultadoCommit);
      setPlano(null);
      toast.success(
        `Importação concluída: ${resultadoCommit.criados} criados, ${resultadoCommit.reativados} reativados, ${resultadoCommit.ignorados} ignorados.`
      );
    } catch {
      toast.error("Erro ao confirmar a importação.");
    } finally {
      setConfirmando(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Confirmar importação de {plano ? plano.resumo.criar + plano.resumo.reativar : 0}{" "}
            fornecedores?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {plano?.resumo.criar ?? 0} serão criados e {plano?.resumo.reativar ?? 0} reativados.
            Fornecedores já cadastrados serão ignorados — rodar este arquivo novamente não duplica
            nada.
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
          <CardTitle>1. Selecionar Arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={analisando}
              className="sr-only"
              aria-label="Selecionar arquivo CSV de fornecedores"
            />
            <Button
              type="button"
              variant="outline"
              disabled={analisando}
              onClick={() => fileInputRef.current?.click()}
            >
              Escolher arquivo
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName ?? "Nenhum arquivo escolhido"}
            </span>
            {analisando && <Loader2 className="h-5 w-5 animate-spin text-info-text" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Colunas: <strong>nome</strong> (obrigatório) e <strong>telefone</strong> (opcional).
            Rodar o mesmo arquivo duas vezes não duplica nenhum fornecedor.
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
              className="bg-primary hover:bg-primary/90"
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
              <Contador label="A criar" valor={plano.resumo.criar} />
              <Contador label="A reativar" valor={plano.resumo.reativar} />
              <Contador label="Ignorados" valor={plano.resumo.ignorar} />
              <Contador label="Com erro" valor={plano.resumo.erros} />
            </div>

            {plano.erros.length > 0 && (
              <ScrollArea className="max-h-64 rounded-md border bg-white">
                <Table>
                  <TableHeader className="bg-muted">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Contador label="Criados" valor={resultado.criados} />
              <Contador label="Reativados" valor={resultado.reativados} />
              <Contador label="Ignorados" valor={resultado.ignorados} />
              <Contador label="Com erro" valor={resultado.erros.length} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}

function Contador({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-center">
      <div className="text-2xl font-black">{valor}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
