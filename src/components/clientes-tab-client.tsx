'use client';

import { useState, startTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  const [similares, setSimilares] = useState<{ id: number; nome: string }[]>([]);
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
  const [editEmpresaSearch, setEditEmpresaSearch] = useState(
    editClienteData?.empresaParceiraId ? "" : (editClienteData?.empresa ?? "")
  );
  const [editSelectedEmpresaId, setEditSelectedEmpresaId] = useState<number | null>(editClienteData?.empresaParceiraId ?? null);
  const [editEmpresaDropdownOpen, setEditEmpresaDropdownOpen] = useState(false);

  const filteredEmpresas = empresasParceiras.filter(e =>
    !empresaSearch || e.nome.toLowerCase().includes(empresaSearch.toLowerCase())
  );
  const editFilteredEmpresas = empresasParceiras.filter(e =>
    !editEmpresaSearch || e.nome.toLowerCase().includes(editEmpresaSearch.toLowerCase())
  );

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
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}
          <form action={onAddAction} className="grid gap-4 [&_input]:uppercase">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Nome/Razao Social</Label>
                <Input
                  name="nome"
                  placeholder="Nome/Razao Social"
                  aria-label="Nome"
                  onBlur={handleNomeBlur}
                  onChange={() => setSimilares([])}
                />
                {similares.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    <span>
                      <strong>Cliente(s) com nome similar:</strong>{" "}
                      {similares.map((s) => s.nome).join(", ")}. Verifique antes de salvar.
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <FormSelect
                  name="tipo"
                  options={[
                    { value: "PF", label: "Pessoa Fisica" },
                    { value: "PJ", label: "Pessoa Juridica" },
                  ]}
                  defaultValue="PF"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF/CNPJ</Label>
                <Input name="doc" placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Matricula</Label>
                <Input name="matricula" placeholder="Matricula" aria-label="Matricula" />
              </div>
              <div className="space-y-1">
                <Label>Renda/Faturamento</Label>
                <CurrencyInput name="renda" aria-label="Renda" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <MaskedInput name="telefone" mask="phone" aria-label="WhatsApp" />
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <MaskedInput name="cep" mask="cep" aria-label="CEP" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 relative">
                <Label>Empresa/Vinculo</Label>
                <input type="hidden" name="empresaParceiraId" value={selectedEmpresaId ?? ""} />
                <input type="hidden" name="empresa" value={empresasParceiras.find(e => e.id === selectedEmpresaId)?.nome ?? empresaSearch} />
                <Input
                  placeholder="Buscar empresa..."
                  aria-label="Empresa"
                  value={empresaSearch}
                  onChange={(e) => { setEmpresaSearch(e.target.value); setEmpresaDropdownOpen(true); setSelectedEmpresaId(null); }}
                  onFocus={() => setEmpresaDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setEmpresaDropdownOpen(false), 200)}
                  className="uppercase"
                />
                {empresaDropdownOpen && filteredEmpresas.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredEmpresas.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                        onMouseDown={(ev) => { ev.preventDefault(); setSelectedEmpresaId(e.id); setEmpresaSearch(e.nome); setEmpresaDropdownOpen(false); }}
                      >
                        {e.nome}
                      </button>
                    ))}
                  </div>
                )}
                {selectedEmpresaId && (
                  <button type="button" onClick={() => { setSelectedEmpresaId(null); setEmpresaSearch(""); }} className="absolute right-2 top-7 text-xs text-muted-foreground hover:text-foreground">✕</button>
                )}
              </div>
              <div className="space-y-1">
                <Label>Data de Nascimento</Label>
                <Input type="date" name="dataNascimento" aria-label="Data de Nascimento" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit">Salvar Cliente</Button>
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
              <button type="button" onClick={() => table.setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm text-muted-foreground hover:text-foreground">
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
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMsg}
              </div>
            )}
            <form action={onUpdateAction} className="grid gap-4 [&_input]:uppercase">
              <input type="hidden" name="id" value={editClienteData.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Nome/Razao Social</Label>
                  <Input name="nome" defaultValue={editClienteData.nome} placeholder="Nome/Razao Social" aria-label="Nome" />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <FormSelect
                    name="tipo"
                    options={[
                      { value: "PF", label: "Pessoa Fisica" },
                      { value: "PJ", label: "Pessoa Juridica" },
                    ]}
                    defaultValue={editClienteData.tipo || "PF"}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CPF/CNPJ</Label>
                  <Input name="doc" defaultValue={editClienteData.cpf || editClienteData.cnpj || ""} placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Matricula</Label>
                  <Input name="matricula" defaultValue={editClienteData.matricula || ""} placeholder="Matricula" aria-label="Matricula" />
                </div>
                <div className="space-y-1">
                  <Label>Renda/Faturamento</Label>
                  <CurrencyInput name="renda" defaultValue={editClienteData.renda ?? 0} aria-label="Renda" />
                </div>
                <div className="space-y-1">
                  <Label>WhatsApp</Label>
                  <MaskedInput name="telefone" mask="phone" defaultValue={editClienteData.telefone || ""} aria-label="WhatsApp" />
                </div>
                <div className="space-y-1">
                  <Label>CEP</Label>
                  <MaskedInput name="cep" mask="cep" defaultValue={editClienteData.cep || ""} aria-label="CEP" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 relative">
                  <Label>Empresa/Vinculo</Label>
                  <input type="hidden" name="empresaParceiraId" value={editSelectedEmpresaId ?? ""} />
                  <input type="hidden" name="empresa" value={empresasParceiras.find(e => e.id === editSelectedEmpresaId)?.nome ?? editEmpresaSearch} />
                  <Input
                    placeholder="Buscar empresa..."
                    aria-label="Empresa"
                    value={editEmpresaSearch || (editSelectedEmpresaId ? (empresasParceiras.find(e => e.id === editSelectedEmpresaId)?.nome ?? editClienteData.empresa ?? "") : editClienteData.empresa || "")}
                    onChange={(e) => { setEditEmpresaSearch(e.target.value); setEditEmpresaDropdownOpen(true); setEditSelectedEmpresaId(null); }}
                    onFocus={() => setEditEmpresaDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setEditEmpresaDropdownOpen(false), 200)}
                    className="uppercase"
                  />
                  {editEmpresaDropdownOpen && editFilteredEmpresas.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {editFilteredEmpresas.map(e => (
                        <button
                          key={e.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                          onMouseDown={(ev) => { ev.preventDefault(); setEditSelectedEmpresaId(e.id); setEditEmpresaSearch(e.nome); setEditEmpresaDropdownOpen(false); }}
                        >
                          {e.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  {editSelectedEmpresaId && (
                    <button type="button" onClick={() => { setEditSelectedEmpresaId(null); setEditEmpresaSearch(""); }} className="absolute right-2 top-7 text-xs text-muted-foreground hover:text-foreground">✕</button>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    name="dataNascimento"
                    defaultValue={editClienteData.dataNascimento ? new Date(editClienteData.dataNascimento).toISOString().split("T")[0] : ""}
                    aria-label="Data de Nascimento"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link href={buildUrl({ tab: "clientes", editCliente: undefined })} className={buttonVariants({ variant: "outline" })}>
                  Cancelar
                </Link>
                <Button type="submit">Salvar alteracoes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
