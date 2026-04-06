'use client';

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskedInput } from "@/components/masked-input";
import { cn } from "@/lib/utils";
import { Pencil, Search, Trash2 } from "lucide-react";
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

type FornecedorListItem = {
  id: number;
  nome: string;
  telefone: string | null;
};

interface Props {
  fornecedores: FornecedorListItem[];
  editFornecedorData?: FornecedorListItem | null;
  searchQuery?: string;
  searchParams: Record<string, string | undefined>;
  onAddAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onBulkDeleteAction: (ids: number[]) => Promise<void>;
}

export default function FornecedoresTabClient({
  fornecedores,
  editFornecedorData,
  searchQuery,
  searchParams: sp,
  onAddAction,
  onUpdateAction,
  onBulkDeleteAction,
}: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const table = useTableFeatures({
    data: fornecedores as (FornecedorListItem & Record<string, unknown>)[],
    searchFields: ["nome", "telefone"] as (keyof FornecedorListItem)[],
    defaultSort: "nome" as keyof FornecedorListItem,
  });
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const newParams = { ...sp, ...params };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return `/cadastros?${search.toString()}`;
  };

  const allSelected = fornecedores.length > 0 && selectedIds.size === fornecedores.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < fornecedores.length;

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(new Set(fornecedores.map((f) => f.id)));
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
          <CardTitle className="text-primary">Novo Fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onAddAction} className="grid gap-4 [&_input]:uppercase">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome do Fornecedor</Label>
                <Input name="nome" placeholder="Razao Social ou Nome" aria-label="Nome" />
              </div>
              <div className="space-y-1">
                <Label>Telefone/WhatsApp</Label>
                <MaskedInput name="telefone" mask="phone" aria-label="Telefone" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit">Salvar Fornecedor</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-primary">Fornecedores Cadastrados</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar fornecedores..."
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
                    <AlertDialogTitle>Excluir {selectedIds.size} fornecedor(es)</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} fornecedor(es)? Esta acao nao pode ser desfeita.
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
                <SortableHeader label="Nome" field="nome" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof FornecedorListItem)} />
                <SortableHeader label="Telefone" field="telefone" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof FornecedorListItem)} />
                <SortableHeader label="" field="_" currentDir="asc" onSort={() => {}} className="w-[80px] cursor-default hover:bg-transparent" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState variant="default" size="sm" title="Nenhum fornecedor encontrado" description={table.search ? "Tente outro termo de busca." : "Cadastre o primeiro fornecedor acima."} />
                  </TableCell>
                </TableRow>
              ) : (
                (table.paginatedData as unknown as FornecedorListItem[]).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(f.id)}
                        onCheckedChange={(checked) => handleSelectOne(f.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>{f.telefone}</TableCell>
                    <TableCell>
                      <Link
                        href={buildUrl({ tab: "fornecedores", editFornecedor: String(f.id) })}
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
          <TablePagination page={table.page} totalPages={table.totalPages} totalFiltered={table.totalFiltered} totalItems={fornecedores.length} onPageChange={table.setPage} />
        </CardContent>
      </Card>

      {editFornecedorData && (
        <Card id="editar-fornecedor" className="mt-4 scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-primary">Editando fornecedor #{editFornecedorData.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={onUpdateAction} className="grid gap-4 [&_input]:uppercase">
              <input type="hidden" name="id" value={editFornecedorData.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome do Fornecedor</Label>
                  <Input name="nome" defaultValue={editFornecedorData.nome} placeholder="Razao Social ou Nome" aria-label="Nome" />
                </div>
                <div className="space-y-1">
                  <Label>Telefone/WhatsApp</Label>
                  <MaskedInput name="telefone" mask="phone" defaultValue={editFornecedorData.telefone || ""} aria-label="Telefone" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link href={buildUrl({ tab: "fornecedores", editFornecedor: undefined })} className={buttonVariants({ variant: "outline" })}>
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
