'use client';

import { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { RotuloCampo } from "@/components/rotulo-campo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DateInput } from "@/components/ui/date-input";
import { Loader2, CheckCircle2, Trash2, Sparkles } from "lucide-react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { lerErroDoCorpo } from "@/lib/importacao-erro";
import {
  camposDestacados,
  linhasInvalidasDaPrevia,
  mensagemAvisoDaPrevia,
  normalizarCelulasDaPrevia,
} from "@/lib/validations/importacao";

// Valor-sentinela da opção vazia dos Selects: o Radix proíbe SelectItem com value="".
const SEM_VALOR = "__vazio__";

interface RowData {
  id: string;
  dataVenda: string;
  vendedor: string;
  cliente: string;
  produto: string;
  custo: string;
  valor: string;
  frete: string;
  envio: string;
  parcelas: string;
  antecipada: boolean;
  // Coluna "Entrega (S/N)" da planilha, como veio; a rota interpreta e recusa valor invalido.
  entrega: string;
}

interface EmpresaOption {
  id: number;
  nome: string;
}

interface Props {
  empresasParceiras?: EmpresaOption[];
}

export default function ImportacaoClient({ empresasParceiras = [] }: Props) {
  const router = useRouter();
  const [data, setData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mesma checagem que o servidor faz antes de gravar (frete real e coluna Entrega): a tela
  // so adianta o aviso e bloqueia o botao; a rota continua recusando o lote se algo escapar.
  const invalidas = useMemo(() => linhasInvalidasDaPrevia(data), [data]);
  const motivoPorLinha = new Map(invalidas.map((l) => [l.linha, l.motivo]));
  const [jaTeveProblema, setJaTeveProblema] = useState(false);
  useEffect(() => {
    if (invalidas.length > 0) setJaTeveProblema(true);
  }, [invalidas]);

  const empresaNome = empresasParceiras.find((e) => String(e.id) === empresaId)?.nome ?? "";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setJaTeveProblema(false);
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Comum no Excel brasileiro
      complete: (results) => {
        const mapped = (results.data as Record<string, string | undefined>[]).map((row) => normalizarCelulasDaPrevia({
          id: Math.random().toString(36).substr(2, 9),
          dataVenda: row["Data (AAAA-MM-DD)"] || row["Data"] || new Date().toISOString().slice(0, 10),
          vendedor: row["Vendedor"] || "",
          cliente: row["Cliente"] || "",
          produto: row["Produto"] || "",
          custo: row["Custo Produto"] || row["Custo"] || "0",
          valor: row["Valor Venda"] || row["Valor"] || "0",
          frete: row["Frete Cobrado"] || row["Frete"] || "0",
          envio: row["Custo Envio"] || row["Envio"] || "0",
          parcelas: row["Parcelas"] || "1",
          antecipada: String(row["Antecipada (S/N)"]).toUpperCase().startsWith("S"),
          entrega: row["Entrega (S/N)"] || row["Entrega"] || "",
        }));
        setData(mapped);
        setLoading(false);
      },
      error: () => {
        toast.error("Erro ao ler arquivo CSV.");
        setLoading(false);
      }
    });
  };

  const updateCell = (id: string, field: keyof RowData, value: string | boolean) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeRow = (id: string) => {
    setData(prev => prev.filter(row => row.id !== id));
  };

  const sugerirComIA = async () => {
    if (data.length === 0) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/importacao/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const { data: suggested } = await res.json();
        if (Array.isArray(suggested) && suggested.length > 0) {
          setData(suggested.map((r: RowData & { id?: string }) => ({
            ...r,
            id: r.id ?? Math.random().toString(36).substr(2, 9),
          })).map(normalizarCelulasDaPrevia));
          toast.success("IA aplicou sugestões. Revise os dados antes de confirmar.");
        }
      } else {
        toast.error("Não foi possível processar com IA. Verifique a chave Gemini em Configurações.");
      }
    } catch {
      toast.error("Erro de conexão ao processar com IA.");
    } finally {
      setSuggesting(false);
    }
  };

  const finalizeImport = async () => {
    if (data.length === 0) return;
    
    // Validação básica
    const invalid = data.some(row => !row.cliente || !row.produto || isNaN(Number(row.valor)));
    if (invalid) {
      toast.warning("Existem campos obrigatórios vazios ou valores numéricos inválidos na tabela. Por favor, corrija antes de subir.");
      return;
    }

    if (invalidas.length > 0) {
      toast.warning(mensagemAvisoDaPrevia(invalidas));
      return;
    }

    if (empresasParceiras.length > 0 && !empresaId) {
      toast.warning("Selecione a empresa dos clientes antes de importar.");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/importacao/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaParceiraId: empresaId ? Number(empresaId) : null,
          rows: data,
        })
      });

      if (res.ok) {
        toast.success("Importação concluída com sucesso!");
        setData([]);
        // Era window.location.reload(). Com a revalidacao no route handler,
        // o refresh basta e nao pisca a tela inteira.
        router.refresh();
      } else {
        // O servidor explica o que recusou (ex.: linhas sem custo de envio); sem corpo legivel
        // cai no texto generico.
        const erroServidor = lerErroDoCorpo(await res.json().catch(() => null));
        toast.error(erroServidor ?? "Erro ao salvar dados no servidor.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar importação de {data.length} vendas?</AlertDialogTitle>
          <AlertDialogDescription>
            Os dados serão salvos permanentemente no sistema. Certifique-se de que as informações estão corretas antes de confirmar.
            {empresaNome && <> Clientes novos serão vinculados a <strong>{empresaNome}</strong>.</>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmImport}>
            Importar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading || saving}
              className="sr-only"
              aria-label="Selecionar arquivo CSV"
            />
            <Button
              type="button"
              variant="outline"
              disabled={loading || saving}
              onClick={() => fileInputRef.current?.click()}
            >
              Escolher arquivo
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName ? fileName : "Nenhum arquivo escolhido"}
            </span>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">O sistema aceita ponto e vírgula (;) como separador padrão do Excel.</p>

          {empresasParceiras.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-divisoria pt-4">
              <RotuloCampo htmlFor="importacao-empresa">
                Empresa dos clientes <span className="text-error-text">*</span>
              </RotuloCampo>
              {/* O Radix não aceita SelectItem com value="": a opção "nenhuma" usa um
                  valor-sentinela e o onValueChange o traduz de volta para "". */}
              <Select
                value={empresaId === "" ? SEM_VALOR : empresaId}
                onValueChange={(v) => setEmpresaId(v === SEM_VALOR ? "" : v)}
                disabled={loading || saving}
              >
                <SelectTrigger id="importacao-empresa" className="max-w-sm">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VALOR}>Selecione a empresa</SelectItem>
                  {empresasParceiras.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Aplicada aos clientes criados nesta importação. Clientes que já existem sem empresa
                também são vinculados; quem já tem empresa não é alterado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>2. Validar e editar dados</CardTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">Edite as células abaixo se necessário antes de confirmar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={sugerirComIA}
                disabled={suggesting || saving}
                leftIcon={suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              >
                Sugerir com IA
              </Button>
              <Button onClick={finalizeImport} disabled={saving || invalidas.length > 0} leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}>
                Subir {data.length} Vendas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {invalidas.length > 0 && (
              <Alert variant="error" showIcon>
                {mensagemAvisoDaPrevia(invalidas)}
              </Alert>
            )}
            {invalidas.length === 0 && jaTeveProblema && (
              <Alert variant="success" role="status" showIcon>
                Nenhuma linha com problema de frete ou entrega.
              </Alert>
            )}
            <div className="overflow-hidden rounded-interno bg-poco">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="min-w-37.5">Cliente</TableHead>
                    <TableHead className="min-w-37.5">Produto</TableHead>
                    <TableHead className="w-24 text-right">Valor</TableHead>
                    <TableHead className="w-24 text-right">Frete</TableHead>
                    <TableHead className="w-24 text-right">Envio</TableHead>
                    <TableHead className="w-24">Entrega</TableHead>
                    <TableHead className="w-20 text-right">Parc.</TableHead>
                    <TableHead className="w-16">Antec.</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => {
                    const motivo = motivoPorLinha.get(index + 1);
                    const destaque = motivo ? camposDestacados(motivo) : [];
                    const ruim = (campo: "frete" | "envio" | "entrega") =>
                      destaque.includes(campo) ? " bg-error-bg text-error-text" : "";
                    return (
                    <Fragment key={row.id}>
                    <TableRow>
                      <TableCell className="p-1">
                        <DateInput
                          value={row.dataVenda}
                          onChange={(v) => updateCell(row.id, 'dataVenda', v)}
                          variant="celula"
                          className="w-full"
                        />
                      </TableCell>
                      {/* EXCEÇÃO LEGÍTIMA (skill shadcn-bfx): as células de texto e número
                          abaixo são <input> crus de propósito. Um <Input> de 44px dentro de
                          uma célula de grade densa e editável é pior que o campo sem borda
                          (`border-none bg-transparent text-xs p-1`) que já está aqui. */}
                      <TableCell className="p-1">
                        <input 
                          value={row.vendedor} 
                          onChange={(e) => updateCell(row.id, 'vendedor', e.target.value)}
                          className="w-full border-none bg-transparent text-xs focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.cliente} 
                          placeholder="Obrigatório"
                          onChange={(e) => updateCell(row.id, 'cliente', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1 ${!row.cliente ? 'bg-error-bg text-error-text' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          value={row.produto} 
                          placeholder="Obrigatório"
                          onChange={(e) => updateCell(row.id, 'produto', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1 ${!row.produto ? 'bg-error-bg text-error-text' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          type="number" 
                          value={row.valor} 
                          onChange={(e) => updateCell(row.id, 'valor', e.target.value)}
                          className="w-full border-none bg-transparent text-xs text-right focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1 font-semibold"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input
                          type="number"
                          aria-label="Frete cobrado"
                          value={row.frete}
                          onChange={(e) => updateCell(row.id, 'frete', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs text-right focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1${ruim("frete")}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <input
                          type="number"
                          aria-label="Custo de envio"
                          value={row.envio}
                          onChange={(e) => updateCell(row.id, 'envio', e.target.value)}
                          className={`w-full border-none bg-transparent text-xs text-right focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1${ruim("envio")}`}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Select
                          value={row.entrega === "" ? SEM_VALOR : row.entrega}
                          onValueChange={(v) => updateCell(row.id, 'entrega', v === SEM_VALOR ? "" : v)}
                        >
                          <SelectTrigger
                            aria-label="Entrega"
                            variant="celula"
                            state={destaque.includes("entrega") ? "error" : "default"}
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM_VALOR}>—</SelectItem>
                            <SelectItem value="S">Sim</SelectItem>
                            <SelectItem value="N">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <input 
                          type="number" 
                          value={row.parcelas} 
                          onChange={(e) => updateCell(row.id, 'parcelas', e.target.value)}
                          className="w-full border-none bg-transparent text-xs text-right focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring rounded p-1"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        {/* Estado da linha da planilha, enviado por JSON — nao
                            passa por FormData. Nao ha "selecionar todas" nesta
                            tabela, entao nao existe estado indeterminado; ainda
                            assim o `=== true` normaliza os tres estados do
                            Radix, porque `"indeterminate"` e truthy e deixaria
                            a linha marcada para sempre. */}
                        <Checkbox
                          checked={row.antecipada}
                          onCheckedChange={(checked) => updateCell(row.id, 'antecipada', checked === true)}
                          aria-label="Parcela antecipada"
                          className="h-3 w-3"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          type="button"
                          variant="sutilErro"
                          size="iconMini"
                          aria-label="Remover linha"
                          onClick={() => removeRow(row.id)}

                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {motivo && (
                      <TableRow>
                        <TableCell tom="erro" tamanho="xs" colSpan={11} className="px-2.5 pb-1.5 pt-0">
                          Linha {index + 1}: {motivo}.
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
