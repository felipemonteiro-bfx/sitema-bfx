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
import { Loader2 } from "lucide-react";
import type { PlanoImportacaoClientes } from "@/lib/cliente-import";

type EmpresaParceiraOpcao = { id: number; nome: string };

interface ImportacaoClientesClientProps {
  empresas: EmpresaParceiraOpcao[];
  /** Recebe `analisarImportacaoClientes` (dry-run, so leitura). */
  analisarAction: (texto: string, empresaParceiraId: number) => Promise<PlanoImportacaoClientes>;
}

export default function ImportacaoClientesClient({
  empresas,
  analisarAction,
}: ImportacaoClientesClientProps) {
  const [empresaParceiraId, setEmpresaParceiraId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanoImportacaoClientes | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaParceiraId) return;

    setFileName(file.name);
    setPlano(null);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Empresa e Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="empresaParceiraId" className="text-xs font-medium text-muted-foreground">
              Empresa parceira
            </label>
            <select
              id="empresaParceiraId"
              required
              value={empresaParceiraId ?? ""}
              onChange={(e) => {
                setEmpresaParceiraId(e.target.value ? Number(e.target.value) : null);
                setPlano(null);
                setTexto(null);
                setFileName(null);
              }}
              className="block h-input w-full max-w-md rounded-md border-2 border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione…</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={String(empresa.id)}>
                  {empresa.nome}
                </option>
              ))}
            </select>
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
            {analisando && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
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
        <Card className="border-blue-200 bg-blue-50/10">
          <CardHeader>
            <CardTitle className="text-primary">2. Análise — nada foi gravado ainda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Contador label="A criar" valor={plano.resumo.criar} />
              <Contador label="A vincular" valor={plano.resumo.vincular} />
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
    </div>
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
