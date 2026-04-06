'use client';

import { useState, startTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { formatBRL, cn } from "@/lib/utils";
import { AlertTriangle, Pencil, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useTableFeatures } from "@/hooks/use-table-features";
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
import Link from "next/link";

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
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [similares, setSimilares] = useState<{ id: number; nome: string }[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [editSelectedEmpresaId, setEditSelectedEmpresaId] = useState<string>(
    editClienteData?.empresaParceiraId ? String(editClienteData.empresaParceiraId) : ""
  );

  const empresaOptions = [
    { value: "", label: "Nenhuma" },
    ...empresasParceiras.map(e => ({ value: String(e.id), label: e.nome })),
  ];

  const handleNomeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const nome = e.target.value.trim();
    if (!nome || nome.length < 3) {
      setSimilares([]);
      return;
    }
    try {
      const res = await fetch(`/api/clientes/similar?nome=${encodeURIComponent(nome)}`);
      if (res.ok) {
        const data = (await res.json()) as { similares: { id: number; nome: string }[] };
        setSimilares(data.similares || []);
      }
    } catch {
      setSimilares([]);
    }
  };

  const handleAdd = async (formData: FormData) => {
    setSubmittingAdd(true);
    try {
      await onAddAction(formData);
      toast.success("Cliente salvo com sucesso!");
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
    } catch {
      toast.error("Erro ao atualizar. Tente novamente.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const table = useTableFeatures({
    data: clientes as (ClienteListItem & Record<string, unknown>)[],
    searchFields: ["nome", "cpf", "cnpj", "telefone", "empresa"] as (keyof ClienteListItem)[],
    defaultSort: "nome" as keyof ClienteListItem,
  });

  const buildUrl = (params: Record<string, string | undefined>) => {
    const newParams = { ...sp, ...params };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return `/cadastros?${search.toString()}`;
  };

  const allSelected = clientes.length > 0 && selectedIds.size === clientes.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < clientes.length;

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(new Set(clientes.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean | "indeterminate") => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
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
  };

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
                  <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
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
                <Input id="add-dataNascimento" type="date" name="dataNascimento" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit" loading={submittingAdd}>Salvar Cliente</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-primary">Clientes</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar clientes..."
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              className={cn("pl-9 h-9", table.search && "pr-8")}
            />
            {table.search && (
              <button type="button" onClick={() => table.setSearch("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 mb-2">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedIds.size} cliente(s)</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} cliente(s)? Esta acao nao pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Selecionar todos"
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader label="Nome" field="nome" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} />
                <SortableHeader label="Doc" field="cpf" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} />
                <SortableHeader label="Telefone" field="telefone" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} />
                <SortableHeader label="Renda" field="renda" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof ClienteListItem)} className="text-right" />
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
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
                    <TableCell>{c.cpf || c.cnpj}</TableCell>
                    <TableCell>{c.telefone}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(c.renda || 0)}</TableCell>
                    <TableCell>
                      <Link
                        href={buildUrl({ tab: "clientes", editCliente: String(c.id) })}
                        className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground")}
                        title="Editar"
                        aria-label={`Editar ${c.nome}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={table.page}
            totalPages={table.totalPages}
            totalFiltered={table.totalFiltered}
            totalItems={clientes.length}
            onPageChange={table.setPage}
          />
        </CardContent>
      </Card>

      {editClienteData && (
        <Card id="editar-cliente" className="mt-4 scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-primary">Editando cliente #{editClienteData.id}</CardTitle>
          </CardHeader>
          <CardContent>
            {errorMsg && sp.editCliente && (
              <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMsg}
              </div>
            )}
            <form action={handleUpdate} className="grid gap-4 [&_input]:uppercase">
              <input type="hidden" name="id" value={editClienteData.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-nome">Nome/Razao Social <span className="text-destructive">*</span></Label>
                  <Input id="edit-nome" name="nome" defaultValue={editClienteData.nome} placeholder="Nome/Razao Social" aria-required="true" />
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
                    defaultValue={editClienteData.tipo || "PF"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-doc">CPF/CNPJ</Label>
                  <Input id="edit-doc" name="doc" defaultValue={editClienteData.cpf || editClienteData.cnpj || ""} placeholder="CPF/CNPJ" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-matricula">Matricula</Label>
                  <Input id="edit-matricula" name="matricula" defaultValue={editClienteData.matricula || ""} placeholder="Matricula" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-renda">Renda/Faturamento</Label>
                  <CurrencyInput id="edit-renda" name="renda" defaultValue={editClienteData.renda ?? 0} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-telefone">WhatsApp</Label>
                  <MaskedInput id="edit-telefone" name="telefone" mask="phone" defaultValue={editClienteData.telefone || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-cep">CEP</Label>
                  <MaskedInput id="edit-cep" name="cep" mask="cep" defaultValue={editClienteData.cep || ""} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
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
                  <Input
                    id="edit-dataNascimento"
                    type="date"
                    name="dataNascimento"
                    defaultValue={editClienteData.dataNascimento ? new Date(editClienteData.dataNascimento).toISOString().split("T")[0] : ""}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link href={buildUrl({ tab: "clientes", editCliente: undefined })} className={buttonVariants({ variant: "outline" })}>
                  Cancelar
                </Link>
                <Button type="submit" loading={submittingUpdate}>Salvar alteracoes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
