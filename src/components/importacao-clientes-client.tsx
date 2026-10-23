"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Badge } from "@/components/ui/badge";
import { RotuloCampo } from "@/components/rotulo-campo";
import { Contador } from "@/components/importacao-ui";
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
import { Loader2, CheckCircle2 } from "lucide-react";
import type { PlanoImportacaoClientes } from "@/lib/cliente-import";
import type { confirmarImportacaoClientes, ResultadoCommitClientes } from "@/app/(app)/importacao/clientes/actions";
import { useRouter } from "next/navigation";

type EmpresaParceiraOpcao = { id: number; nome: string };

interface ImportacaoClientesClientProps {
  empresas: EmpresaParceiraOpcao[];
  /** Recebe `analisarImportacaoClientes` (dry-run, so leitura). */
  analisarAction: (texto: string, empresaParceiraId: number) => Promise<PlanoImportacaoClientes>;
  /** Recebe `confirmarImportacaoClientes` (aplica a transacao). */
  confirmarAction?: typeof confirmarImportacaoClientes;
}

export default function ImportacaoClientesClient({
  empresas,
  analisarAction,
  confirmarAction,
}: ImportacaoClientesClientProps) {
  const router = useRouter();
  const [empresaParceiraId, setEmpresaParceiraId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanoImportacaoClientes | null>(null);
  const [resultado, setResultado] = useState<ResultadoCommitClientes | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaParceiraId) return;

    setFileName(file.name);
    setPlano(null);
    setResultado(null);
    setAnalisando(true);
    try {
      const conteudo = await file.text();
      setTexto(conteudo);
      const resultadoAnalise = await analisarAction(conteudo, empresaParceiraId);
      setPlano(resultadoAnalise);
    } catch {
      toast.error("Erro ao analisar o arquivo CSV.");
    } finally {
      setAnalisando(false);
    }
  };

  const podeConfirmar =
    plano != null &&
    plano.resumo.criar + plano.resumo.vincular > 0 &&
    texto != null &&
    empresaParceiraId != null &&
    confirmarAction != null;

  const handleConfirmar = async () => {
    if (!texto || !empresaParceiraId || !confirmarAction) return;
    setConfirmando(true);
    try {
      const resultadoCommit = await confirmarAction(texto, empresaParceiraId);
      setResultado(resultadoCommit);
      setPlano(null);
      toast.success(
        `Importação concluída: ${resultadoCommit.criados} criados, ${resultadoCommit.vinculados} vinculados, ${resultadoCommit.ignorados} ignorados.`
      );
      // A importacao gravou clientes/fornecedores: sem refresh a lista fica velha.
      router.refresh();
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
            Confirmar importação de {plano ? plano.resumo.criar + plano.resumo.vincular : 0}{" "}
            clientes?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {plano?.resumo.criar ?? 0} serão criados como novo lead e {plano?.resumo.vincular ?? 0}{" "}
            terão o vínculo com a empresa parceira completado. Clientes já vinculados serão
            ignorados — rodar este arquivo novamente não duplica ninguém.
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
          <CardTitle>1. Empresa e arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <RotuloCampo htmlFor="empresaParceiraId">Empresa parceira</RotuloCampo>
            <FormSelect
              id="empresaParceiraId"
              name="empresaParceiraId"
              value={empresaParceiraId != null ? String(empresaParceiraId) : ""}
              onValueChange={(v) => {
                setEmpresaParceiraId(v ? Number(v) : null);
                setPlano(null);
                setTexto(null);
                setFileName(null);
              }}
              placeholder="Selecione…"
              className="max-w-md"
              options={empresas.map((empresa) => ({
                value: String(empresa.id),
                label: empresa.nome,
              }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={analisando || !empresaParceiraId}
              className="sr-only"
              aria-label="Selecionar arquivo CSV de clientes"
            />
            <Button
              type="button"
              variant="outline"
              disabled={analisando || !empresaParceiraId}
              onClick={() => fileInputRef.current?.click()}
            >
              Escolher arquivo
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName ?? "Nenhum arquivo escolhido"}
            </span>
            {analisando && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
          {!empresaParceiraId && (
            <p className="text-xs text-muted-foreground">
              Selecione a empresa parceira antes de escolher o arquivo.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Colunas: <strong>nome</strong> (obrigatório), <strong>cpf</strong>,{" "}
            <strong>telefone</strong>, <strong>matrícula</strong> e <strong>email</strong>{" "}
            (opcionais). O CPF é a chave de idempotência quando existir; sem CPF, o nome
            normalizado assume esse papel. Rodar o mesmo arquivo duas vezes não duplica ninguém.
          </p>
        </CardContent>
      </Card>

      {plano && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>2. Análise</CardTitle>
              <Badge variant="outline">Nada foi gravado ainda</Badge>
            </div>
            {confirmarAction && (
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
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Contador label="A criar" valor={plano.resumo.criar} />
              <Contador label="A vincular" valor={plano.resumo.vincular} />
              <Contador label="Ignorados" valor={plano.resumo.ignorar} />
              <Contador label="Com erro" valor={plano.resumo.erros} erro />
            </div>

            {plano.erros.length > 0 && (
              <div
                tabIndex={0}
                role="region"
                aria-label="Linhas com erro"
                className="max-h-64 overflow-y-auto rounded-interno bg-poco"
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
                        <TableCell mono>{erro.linha}</TableCell>
                        <TableCell>{erro.motivo}</TableCell>
                        <TableCell tamanho="xs" mono>{erro.conteudo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0">
            <CardTitle>Importação concluída</CardTitle>
            <Badge variant="success">Concluída</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Contador label="Criados" valor={resultado.criados} />
              <Contador label="Vinculados" valor={resultado.vinculados} />
              <Contador label="Ignorados" valor={resultado.ignorados} />
              <Contador label="Com erro" valor={resultado.erros.length} erro />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
