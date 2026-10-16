'use client';

import { useState, startTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

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
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<FornecedorListItem | null>(null);

  const table = useTableFeatures({
    data: fornecedores as (FornecedorListItem & Record<string, unknown>)[],
    searchFields: ["nome", "telefone"] as (keyof FornecedorListItem)[],
    defaultSort: "nome" as keyof FornecedorListItem,
  });
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleAdd = async (formData: FormData) => {
    setSubmittingAdd(true);
    try {
      await onAddAction(formData);
      toast.success("Fornecedor salvo com sucesso!");
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
      toast.success("Fornecedor atualizado com sucesso!");
      setEditingFornecedor(null);
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao atualizar. Tente novamente.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // O cabecalho vale para a pagina visivel, nao para o dataset inteiro.
  const idsVisiveis = useMemo(
    () => (table.paginatedData as unknown as FornecedorListItem[]).map((f) => f.id),
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
          <CardTitle>Novo Fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleAdd} className="grid gap-4 [&_input]:uppercase">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="add-fornecedor-nome" className="normal-case tracking-normal text-sm font-medium">Nome do Fornecedor <span className="text-destructive">*</span></Label>
                <Input id="add-fornecedor-nome" name="nome" placeholder="Razao Social ou Nome" aria-required="true" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-fornecedor-telefone" className="normal-case tracking-normal text-sm font-medium">Telefone/WhatsApp</Label>
                <MaskedInput id="add-fornecedor-telefone" name="telefone" mask="phone" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit" loading={submittingAdd}>Salvar Fornecedor</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Fornecedores Cadastrados</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar fornecedores..."
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
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-interno bg-poco px-4 py-2 mb-2">
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
                    <AlertDialogTitle>Excluir {selectedIds.size} fornecedor(es)</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} fornecedor(es)? Eles saem das
                      listagens e do PDV, mas nao sao apagados do banco — cadastrar o mesmo nome de
                      novo reativa o registro, com o historico preservado.
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
          <div className="overflow-x-auto rounded-interno bg-poco p-2">
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
                        aria-label={`Selecionar ${f.nome}`}
                        checked={selectedIds.has(f.id)}
                        onCheckedChange={(checked) => handleSelectOne(f.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>{f.telefone}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setEditingFornecedor(f)}
                        className={cn(buttonVariants({ variant: "ghost", size: "iconSm" }), "text-muted-foreground hover:text-foreground")}
                        title="Editar"
                        aria-label={`Editar ${f.nome}`}
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
          <TablePagination page={table.page} totalPages={table.totalPages} totalFiltered={table.totalFiltered} totalItems={fornecedores.length} onPageChange={table.setPage} />
        </CardContent>
      </Card>

      <Sheet open={!!editingFornecedor} onOpenChange={(open) => !open && setEditingFornecedor(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar fornecedor #{editingFornecedor?.id}</SheetTitle>
            <SheetDescription>Atualize os dados do fornecedor abaixo.</SheetDescription>
          </SheetHeader>
          {editingFornecedor && (
            <form action={handleUpdate} className="grid gap-4 mt-4 [&_input]:uppercase">
              <input type="hidden" name="id" value={editingFornecedor.id} />
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-fornecedor-nome" className="normal-case tracking-normal text-sm font-medium">Nome do Fornecedor <span className="text-destructive">*</span></Label>
                  <Input id="edit-fornecedor-nome" name="nome" defaultValue={editingFornecedor.nome} placeholder="Razao Social ou Nome" aria-required="true" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-fornecedor-telefone" className="normal-case tracking-normal text-sm font-medium">Telefone/WhatsApp</Label>
                  <MaskedInput id="edit-fornecedor-telefone" name="telefone" mask="phone" defaultValue={editingFornecedor.telefone || ""} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingFornecedor(null)}>Cancelar</Button>
                <Button type="submit" loading={submittingUpdate}>Salvar alteracoes</Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
