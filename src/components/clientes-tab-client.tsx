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
import { Pencil, Search, Trash2 } from "lucide-react";
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
};

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
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
          <CardTitle className="text-blue-900">Novo Cliente</CardTitle>
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
                <div className="text-xs font-semibold text-muted-foreground">Nome/Razao Social</div>
                <Input name="nome" placeholder="Nome/Razao Social" aria-label="Nome" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Tipo</div>
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
                <div className="text-xs font-semibold text-muted-foreground">CPF/CNPJ</div>
                <Input name="doc" placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Matricula</div>
                <Input name="matricula" placeholder="Matricula" aria-label="Matricula" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Renda/Faturamento</div>
                <CurrencyInput name="renda" aria-label="Renda" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">WhatsApp</div>
                <MaskedInput name="telefone" mask="phone" aria-label="WhatsApp" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">CEP</div>
                <MaskedInput name="cep" mask="cep" aria-label="CEP" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Empresa/Vinculo</div>
                <Input name="empresa" placeholder="Empresa/Vinculo" aria-label="Empresa" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Cliente</button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-blue-900">Clientes</CardTitle>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {table.search ? "Nenhum resultado encontrado." : "Sem clientes cadastrados."}
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
            <CardTitle className="text-blue-900">Editando cliente #{editClienteData.id}</CardTitle>
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
                  <div className="text-xs font-semibold text-muted-foreground">Nome/Razao Social</div>
                  <Input name="nome" defaultValue={editClienteData.nome} placeholder="Nome/Razao Social" aria-label="Nome" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Tipo</div>
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
                  <div className="text-xs font-semibold text-muted-foreground">CPF/CNPJ</div>
                  <Input name="doc" defaultValue={editClienteData.cpf || editClienteData.cnpj || ""} placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Matricula</div>
                  <Input name="matricula" defaultValue={editClienteData.matricula || ""} placeholder="Matricula" aria-label="Matricula" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Renda/Faturamento</div>
                  <CurrencyInput name="renda" defaultValue={editClienteData.renda ?? 0} aria-label="Renda" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">WhatsApp</div>
                  <MaskedInput name="telefone" mask="phone" defaultValue={editClienteData.telefone || ""} aria-label="WhatsApp" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">CEP</div>
                  <MaskedInput name="cep" mask="cep" defaultValue={editClienteData.cep || ""} aria-label="CEP" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Empresa/Vinculo</div>
                  <Input name="empresa" defaultValue={editClienteData.empresa || ""} placeholder="Empresa/Vinculo" aria-label="Empresa" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link href={buildUrl({ tab: "clientes", editCliente: undefined })} className={buttonVariants({ variant: "outline" })}>
                  Cancelar
                </Link>
                <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar alteracoes</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
