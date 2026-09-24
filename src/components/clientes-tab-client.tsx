'use client';

import { useState, startTransition, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/form-select";
import { MaskedInput } from "@/components/masked-input";
import { CurrencyInput } from "@/components/currency-input";
import { DateInput } from "@/components/ui/date-input";
import { formatBRL, cn } from "@/lib/utils";
import { AlertTriangle, Pencil, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useTableFeatures } from "@/hooks/use-table-features";
import { alternarSelecaoDaPagina, contarSelecionadosForaDaPagina, estadoCheckboxDaPagina } from "@/lib/selecao-em-massa";
import { TablePagination } from "@/components/table-pagination";
import { SortableHeader } from "@/components/sortable-header";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  formatarPctConsignado,
  OPCOES_FILTRO_FAIXA_CONSIGNADO,
  ROTULO_FAIXA_CONSIGNADO,
  type FaixaConsignado,
} from "@/lib/consignado";

// Bolinha de cor de cada faixa no filtro — mesmo significado das cores do selo.
const INDICADOR_FAIXA: Record<FaixaConsignado, string> = {
  ok: "bg-success",
  alerta: "bg-warning",
  limite: "bg-error",
  renda_pendente: "bg-muted-foreground",
};

type ClienteListItem = {
  id: number;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  renda: number | null;
  empresa: string | null;
  matricula: string | null;
  telefone: string | null;
  cep: string | null;
  tipo: string | null;
  empresaParceiraId: number | null;
  dataNascimento: Date | string | null;
  pctConsignado?: number | null;
  faixaConsignado?: string | null;
};

type EmpresaOption = { id: number; nome: string };

type ClienteEdit = ClienteListItem;

interface Props {
  clientes: ClienteListItem[];
  editClienteData?: ClienteEdit | null;
  searchQuery?: string;
  errorMsg?: string | null;
  searchParams: Record<string, string | undefined>;
  onAddAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onBulkDeleteAction: (ids: number[]) => Promise<void>;
  empresasParceiras?: EmpresaOption[];
}

export default function ClientesTabClient({
  clientes,
  editClienteData,
  searchQuery,
  errorMsg,
  searchParams: sp,
  onAddAction,
  onUpdateAction,
  onBulkDeleteAction,
  empresasParceiras = [],
}: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [similares, setSimilares] = useState<{ id: number; nome: string }[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [editingCliente, setEditingCliente] = useState<ClienteListItem | null>(null);
  const [editSelectedEmpresaId, setEditSelectedEmpresaId] = useState<string>("");

  const empresaOptions = [
    { value: "", label: "Nenhuma" },
    ...empresasParceiras.map(e => ({ value: String(e.id), label: e.nome })),
  ];

  const lastCheckedNome = useRef("");

  const handleNomeBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const nome = e.target.value.trim();
    if (!nome || nome.length < 3 || nome === lastCheckedNome.current) {
      if (!nome || nome.length < 3) setSimilares([]);
      return;
    }
    lastCheckedNome.current = nome;
    try {
      const res = await fetch(`/api/clientes/similar?nome=${encodeURIComponent(nome)}`);
      if (res.ok) {
        const data = (await res.json()) as { similares: { id: number; nome: string }[] };
        setSimilares(data.similares || []);
      }
    } catch {
      setSimilares([]);
    }
  }, []);

  const handleAdd = async (formData: FormData) => {
    setSubmittingAdd(true);
    try {
      await onAddAction(formData);
      toast.success("Cliente salvo com sucesso!");
      // Sem isso a lista so mostra o registro novo depois de F5. handleUpdate e
      // handleBulkDelete ja faziam; o cadastro tinha ficado de fora.
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    setSubmittingUpdate(true);
    try {
      await onUpdateAction(formData);
      toast.success("Cliente atualizado com sucesso!");
      setEditingCliente(null);
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao atualizar. Tente novamente.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const openEditSheet = (c: ClienteListItem) => {
    setEditSelectedEmpresaId(c.empresaParceiraId ? String(c.empresaParceiraId) : "");
    setEditingCliente(c);
  };

  const table = useTableFeatures({
    data: clientes as (ClienteListItem & Record<string, unknown>)[],
    searchFields: ["nome", "cpf", "cnpj", "telefone", "empresa"] as (keyof ClienteListItem)[],
    defaultSort: "nome" as keyof ClienteListItem,
  });

  // O cabecalho vale para a pagina visivel, nao para o dataset inteiro: com 15
  // linhas na tela, marcar "todos" chegava a selecionar os 834 do banco.
  const idsVisiveis = useMemo(
    () => (table.paginatedData as unknown as ClienteListItem[]).map((c) => c.id),
    [table.paginatedData]
  );
  const estadoSelecaoCabecalho = estadoCheckboxDaPagina(selectedIds, idsVisiveis);
  // A selecao sobrevive a troca de pagina e ao filtro; sem avisar, da para
  // confirmar uma exclusao de registros que nao estao na tela.
  const selecionadosForaDaPagina = contarSelecionadosForaDaPagina(selectedIds, idsVisiveis);

  const handleSelectAll = useCallback((checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => alternarSelecaoDaPagina(prev, idsVisiveis, checked === true));
  }, [idsVisiveis]);

  const handleSelectOne = useCallback((id: number, checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleting(true);
    try {
      await onBulkDeleteAction(Array.from(selectedIds));
      setSelectedIds(new Set());
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBulkDeleting(false);
    }
  }, [onBulkDeleteAction, selectedIds, router]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Novo Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMsg && !sp.editCliente && (
            <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}
          <form action={handleAdd} className="grid gap-4 [&_input]:uppercase">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="add-nome">Nome/Razao Social <span className="text-destructive">*</span></Label>
                <Input
                  id="add-nome"
                  name="nome"
                  placeholder="Nome/Razao Social"
                  aria-required="true"
                  onBlur={handleNomeBlur}
                  onChange={() => setSimilares([])}
                />
                {similares.length > 0 && (
                  <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground dark:text-warning">
                    {/* O rotulo ao lado ja fecha nos dois temas (18.16 no claro
                        com o `-foreground` escuro, 8.67 no escuro com o token
                        de preenchimento) — fica como esta. O icone, porem,
                        forcava o preenchimento em AMBOS: 1.92:1 no claro sobre
                        o tint. Com a variante de texto vai a 4.88:1, e no
                        escuro o valor e o mesmo de antes. */}
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning-text" />
                    <span>
                      <strong>Cliente(s) com nome similar:</strong>{" "}
                      {similares.map((s) => s.nome).join(", ")}. Verifique antes de salvar.
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-tipo">Tipo</Label>
                <FormSelect
                  id="add-tipo"
                  name="tipo"
                  options={[
                    { value: "PF", label: "Pessoa Fisica" },
                    { value: "PJ", label: "Pessoa Juridica" },
                  ]}
                  defaultValue="PF"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-doc">CPF/CNPJ</Label>
                <Input id="add-doc" name="doc" placeholder="CPF/CNPJ" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="add-matricula">Matricula</Label>
                <Input id="add-matricula" name="matricula" placeholder="Matricula" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-renda">Renda/Faturamento</Label>
                <CurrencyInput id="add-renda" name="renda" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-telefone">WhatsApp</Label>
                <MaskedInput id="add-telefone" name="telefone" mask="phone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-cep">CEP</Label>
                <MaskedInput id="add-cep" name="cep" mask="cep" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="add-empresa">Empresa/Vinculo</Label>
                <input type="hidden" name="empresaParceiraId" value={selectedEmpresaId} />
                <input type="hidden" name="empresa" value={empresasParceiras.find(e => String(e.id) === selectedEmpresaId)?.nome ?? ""} />
                <FormSelect
                  id="add-empresa"
                  name="_empresa_display"
                  options={empresaOptions}
                  value={selectedEmpresaId}
                  onValueChange={setSelectedEmpresaId}
                  placeholder="Selecione a empresa"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-dataNascimento">Data de Nascimento</Label>
                <DateInput id="add-dataNascimento" name="dataNascimento" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit" loading={submittingAdd}>Salvar Cliente</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-primary">Clientes</CardTitle>
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
          <div className="w-full sm:w-44">
            <Label htmlFor="filtro-faixa-consignado" className="sr-only">
              Faixa de consignado
            </Label>
            <FormSelect
              id="filtro-faixa-consignado"
              name="faixa_consignado"
              options={[
                { value: "todas", label: "Todas as faixas" },
                ...OPCOES_FILTRO_FAIXA_CONSIGNADO.map((o) => ({ ...o, indicador: INDICADOR_FAIXA[o.value] })),
              ]}
              value={sp.faixa_consignado || "todas"}
              onValueChange={(v) => {
                const params = new URLSearchParams();
                params.set("tab", "clientes");
                if (sp.q_clientes) params.set("q_clientes", sp.q_clientes);
                if (v && v !== "todas") params.set("faixa_consignado", v);
                if (sp.empresa_parceira) params.set("empresa_parceira", sp.empresa_parceira);
                router.push(`/cadastros?${params.toString()}`);
              }}
              placeholder="Faixa consignado"
            />
          </div>
          <div className="w-full sm:w-48">
            <Label htmlFor="filtro-empresa-consignado" className="sr-only">
              Empresa parceira
            </Label>
            <FormSelect
              id="filtro-empresa-consignado"
              name="empresa_parceira"
              options={[
                { value: "todas", label: "Todas as empresas" },
                ...empresasParceiras.map((e) => ({ value: String(e.id), label: e.nome })),
              ]}
              value={sp.empresa_parceira || "todas"}
              onValueChange={(v) => {
                const params = new URLSearchParams();
                params.set("tab", "clientes");
                if (sp.q_clientes) params.set("q_clientes", sp.q_clientes);
                if (sp.faixa_consignado) params.set("faixa_consignado", sp.faixa_consignado);
                if (v && v !== "todas") params.set("empresa_parceira", v);
                router.push(`/cadastros?${params.toString()}`);
              }}
              placeholder="Empresa parceira"
            />
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar clientes..."
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              className={cn("pl-9 h-9", table.search && "pr-8")}
            />
            {table.search && (
              <Button type="button" variant="ghost" size="icon" onClick={() => table.setSearch("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-sm text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground hover:shadow-none">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 mb-2">
              <span className="text-sm font-medium">
                {selectedIds.size} selecionado(s)
                {selecionadosForaDaPagina > 0 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({selecionadosForaDaPagina} fora desta pagina)
                  </span>
                )}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                    <Trash2 className="h-4 w-4" />
                    Excluir selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedIds.size} cliente(s)</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} cliente(s)? Esta acao nao pode ser desfeita.
                      {selecionadosForaDaPagina > 0 && (
                        <strong className="block mt-2 font-medium text-foreground">
                          {selecionadosForaDaPagina} deles nao estao nesta pagina.
                        </strong>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={bulkDeleting}
                      onClick={handleBulkDelete}
                    >
                      {bulkDeleting ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Limpar selecao
              </Button>
            </div>
          )}
          <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-11">
                  <Checkbox
                    aria-label="Selecionar todos"
                    checked={estadoSelecaoCabecalho}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader label="Nome" field="nome" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} />
                <SortableHeader label="Doc" field="cpf" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} />
                <SortableHeader label="Telefone" field="telefone" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} />
                <SortableHeader label="Renda" field="renda" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} className="text-right" />
                <TableHead>Consignado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState variant="clients" size="sm" title="Nenhum cliente encontrado" description={table.search ? "Tente outro termo de busca." : "Cadastre o primeiro cliente acima."} />
                  </TableCell>
                </TableRow>
              ) : (
                (table.paginatedData as unknown as ClienteListItem[]).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${c.nome}`}
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={(checked) => handleSelectOne(c.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="valor-sensivel">{c.cpf || c.cnpj}</TableCell>
                    <TableCell className="valor-sensivel">{c.telefone}</TableCell>
                    <TableCell className="text-right tabular-nums valor-sensivel valor-sensivel-fim">{formatBRL(c.renda || 0)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="tabular-nums text-sm valor-sensivel">
                          {formatarPctConsignado(c.faixaConsignado === "renda_pendente" ? null : c.pctConsignado)}
                        </span>
                        {c.faixaConsignado === "alerta" && (
                          <Badge variant="warning">{ROTULO_FAIXA_CONSIGNADO.alerta}</Badge>
                        )}
                        {c.faixaConsignado === "limite" && (
                          <Badge variant="error">{ROTULO_FAIXA_CONSIGNADO.limite}</Badge>
                        )}
                        {c.faixaConsignado === "renda_pendente" && (
                          <Badge variant="outline">{ROTULO_FAIXA_CONSIGNADO.renda_pendente}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openEditSheet(c)}
                        className={cn(buttonVariants({ variant: "ghost", size: "iconSm" }), "text-muted-foreground hover:text-foreground")}
                        title="Editar"
                        aria-label={`Editar ${c.nome}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          <TablePagination
            page={table.page}
            totalPages={table.totalPages}
            totalFiltered={table.totalFiltered}
            totalItems={clientes.length}
            onPageChange={table.setPage}
          />
        </CardContent>
      </Card>

      <Sheet open={!!editingCliente} onOpenChange={(open) => !open && setEditingCliente(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar cliente #{editingCliente?.id}</SheetTitle>
            <SheetDescription>Atualize os dados do cliente abaixo.</SheetDescription>
          </SheetHeader>
          {editingCliente && (
            <form action={handleUpdate} className="grid gap-4 mt-4 [&_input]:uppercase">
              <input type="hidden" name="id" value={editingCliente.id} />
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-nome">Nome/Razao Social <span className="text-destructive">*</span></Label>
                  <Input id="edit-nome" name="nome" defaultValue={editingCliente.nome} placeholder="Nome/Razao Social" aria-required="true" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-tipo">Tipo</Label>
                  <FormSelect
                    id="edit-tipo"
                    name="tipo"
                    options={[
                      { value: "PF", label: "Pessoa Fisica" },
                      { value: "PJ", label: "Pessoa Juridica" },
                    ]}
                    defaultValue={editingCliente.tipo || "PF"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-doc">CPF/CNPJ</Label>
                  <Input id="edit-doc" name="doc" defaultValue={editingCliente.cpf || editingCliente.cnpj || ""} placeholder="CPF/CNPJ" />
                </div>
              </div>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-matricula">Matricula</Label>
                  <Input id="edit-matricula" name="matricula" defaultValue={editingCliente.matricula || ""} placeholder="Matricula" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-renda">Renda/Faturamento</Label>
                  <CurrencyInput id="edit-renda" name="renda" defaultValue={editingCliente.renda ?? 0} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-telefone">WhatsApp</Label>
                  <MaskedInput id="edit-telefone" name="telefone" mask="phone" defaultValue={editingCliente.telefone || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-cep">CEP</Label>
                  <MaskedInput id="edit-cep" name="cep" mask="cep" defaultValue={editingCliente.cep || ""} />
                </div>
              </div>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa">Empresa/Vinculo</Label>
                  <input type="hidden" name="empresaParceiraId" value={editSelectedEmpresaId} />
                  <input type="hidden" name="empresa" value={empresasParceiras.find(e => String(e.id) === editSelectedEmpresaId)?.nome ?? ""} />
                  <FormSelect
                    id="edit-empresa"
                    name="_edit_empresa_display"
                    options={empresaOptions}
                    value={editSelectedEmpresaId}
                    onValueChange={setEditSelectedEmpresaId}
                    placeholder="Selecione a empresa"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dataNascimento">Data de Nascimento</Label>
                  <DateInput
                    id="edit-dataNascimento"
                    name="dataNascimento"
                    defaultValue={editingCliente.dataNascimento ? new Date(editingCliente.dataNascimento).toISOString().split("T")[0] : ""}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingCliente(null)}>Cancelar</Button>
                <Button type="submit" loading={submittingUpdate}>Salvar alteracoes</Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
