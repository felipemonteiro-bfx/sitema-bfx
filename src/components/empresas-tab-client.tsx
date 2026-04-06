'use client';

import { useState, startTransition } from "react";
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

type EmpresaListItem = {
  id: number;
  nome: string;
  responsavelRh: string | null;
  telefoneRh: string | null;
  emailRh: string | null;
  cnpj: string | null;
  emailsExtras: string | null;
  vinculos?: { vinculada: { id: number; nome: string } }[];
  _count?: { clientes: number };
};

interface Props {
  empresas: EmpresaListItem[];
  editEmpresaData?: EmpresaListItem | null;
  searchQuery?: string;
  searchParams: Record<string, string | undefined>;
  onAddAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onBulkDeleteAction: (ids: number[]) => Promise<void>;
  onVincularAction?: (empresaId: number, vinculadaIds: number[]) => Promise<void>;
}

export default function EmpresasTabClient({
  empresas,
  editEmpresaData,
  searchQuery,
  searchParams: sp,
  onAddAction,
  onUpdateAction,
  onBulkDeleteAction,
  onVincularAction,
}: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [vinculandoId, setVinculandoId] = useState<number | null>(null);
  const [vinculacaoIds, setVinculacaoIds] = useState<Set<number>>(new Set());
  const [savingVinculo, setSavingVinculo] = useState(false);

  const handleAdd = async (formData: FormData) => {
    setSubmittingAdd(true);
    try {
      await onAddAction(formData);
      toast.success("Empresa salva com sucesso!");
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
      toast.success("Empresa atualizada com sucesso!");
    } catch {
      toast.error("Erro ao atualizar. Tente novamente.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const table = useTableFeatures({
    data: empresas as (EmpresaListItem & Record<string, unknown>)[],
    searchFields: ["nome", "cnpj", "responsavelRh", "emailRh", "telefoneRh"] as (keyof EmpresaListItem)[],
    defaultSort: "nome" as keyof EmpresaListItem,
  });

  const buildUrl = (params: Record<string, string | undefined>) => {
    const newParams = { ...sp, ...params };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return `/cadastros?${search.toString()}`;
  };

  const allSelected = empresas.length > 0 && selectedIds.size === empresas.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < empresas.length;

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(new Set(empresas.map((e) => e.id)));
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

  const openVinculos = (empresa: EmpresaListItem) => {
    const currentIds = new Set((empresa.vinculos || []).map((v) => v.vinculada.id));
    setVinculacaoIds(currentIds);
    setVinculandoId(empresa.id);
  };

  const toggleVinculo = (id: number) => {
    const next = new Set(vinculacaoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setVinculacaoIds(next);
  };

  const saveVinculos = async () => {
    if (vinculandoId == null || !onVincularAction) return;
    setSavingVinculo(true);
    try {
      await onVincularAction(vinculandoId, Array.from(vinculacaoIds));
      toast.success("Vinculos atualizados com sucesso!");
      setVinculandoId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Erro ao atualizar vinculos. Tente novamente.");
    } finally {
      setSavingVinculo(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Nova Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleAdd} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="add-empresa-nome">Empresa <span className="text-destructive">*</span></Label>
                <Input id="add-empresa-nome" name="nome" placeholder="Empresa" aria-required="true" className="uppercase" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-empresa-cnpj">CNPJ</Label>
                <Input id="add-empresa-cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-empresa-rh">Responsavel RH</Label>
                <Input id="add-empresa-rh" name="rh" placeholder="Responsavel RH" className="uppercase" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="add-empresa-tel">Telefone RH</Label>
                <MaskedInput id="add-empresa-tel" name="tel" mask="phone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-empresa-email">Email RH</Label>
                <Input id="add-empresa-email" name="email" placeholder="email@empresa.com" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-empresa-emailsExtras">Emails adicionais</Label>
                <Input id="add-empresa-emailsExtras" name="emailsExtras" placeholder="email1@x.com, email2@y.com" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit" loading={submittingAdd}>Salvar Empresa</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-primary">Empresas Parceiras</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar empresas..."
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
                    <AlertDialogTitle>Excluir {selectedIds.size} empresa(s)</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} empresa(s)? Esta acao nao pode ser desfeita.
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
                <SortableHeader label="Nome" field="nome" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="CNPJ" field="cnpj" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="RH" field="responsavelRh" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="Contato" field="emailRh" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <TableHead className="text-xs text-center">Clientes</TableHead>
                <TableHead className="text-xs">Vinculadas</TableHead>
                <SortableHeader label="" field="_" currentDir="asc" onSort={() => {}} className="w-[80px] cursor-default hover:bg-transparent" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState variant="folder" size="sm" title="Nenhuma empresa encontrada" description={table.search ? "Tente outro termo de busca." : "Cadastre a primeira empresa acima."} />
                  </TableCell>
                </TableRow>
              ) : (
                (table.paginatedData as unknown as EmpresaListItem[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${e.nome}`}
                        checked={selectedIds.has(e.id)}
                        onCheckedChange={(checked) => handleSelectOne(e.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{e.cnpj || "—"}</TableCell>
                    <TableCell>{e.responsavelRh}</TableCell>
                    <TableCell>
                      <div>{e.telefoneRh || ""}</div>
                      {e.emailRh && <div className="text-xs text-muted-foreground">{e.emailRh}</div>}
                      {e.emailsExtras && (
                        <div className="text-xs text-muted-foreground">{e.emailsExtras}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", (e._count?.clientes ?? 0) > 0 ? "bg-blue-50 text-blue-800" : "text-muted-foreground opacity-40")}>
                        {e._count?.clientes ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(e.vinculos || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(e.vinculos || []).map((v) => (
                            <span key={v.vinculada.id} className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800 border border-blue-200">
                              {v.vinculada.nome}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground opacity-40">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onVincularAction && (
                          <button
                            type="button"
                            onClick={() => openVinculos(e)}
                            className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground text-xs")}
                            title="Gerenciar vinculos"
                          >
                            Vincular
                          </button>
                        )}
                        <Link
                          href={buildUrl({ tab: "empresas", editEmpresa: String(e.id) })}
                          className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground")}
                          title="Editar"
                          aria-label={`Editar ${e.nome}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination page={table.page} totalPages={table.totalPages} totalFiltered={table.totalFiltered} totalItems={empresas.length} onPageChange={table.setPage} />
        </CardContent>
      </Card>

      {editEmpresaData && (
        <Card id="editar-empresa" className="mt-4 scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-primary">Editando empresa #{editEmpresaData.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleUpdate} className="grid gap-4">
              <input type="hidden" name="id" value={editEmpresaData.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-nome">Empresa <span className="text-destructive">*</span></Label>
                  <Input id="edit-empresa-nome" name="nome" defaultValue={editEmpresaData.nome} placeholder="Empresa" aria-required="true" className="uppercase" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-cnpj">CNPJ</Label>
                  <Input id="edit-empresa-cnpj" name="cnpj" defaultValue={editEmpresaData.cnpj || ""} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-rh">Responsavel RH</Label>
                  <Input id="edit-empresa-rh" name="rh" defaultValue={editEmpresaData.responsavelRh || ""} placeholder="Responsavel RH" className="uppercase" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-tel">Telefone RH</Label>
                  <MaskedInput id="edit-empresa-tel" name="tel" mask="phone" defaultValue={editEmpresaData.telefoneRh || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-email">Email RH</Label>
                  <Input id="edit-empresa-email" name="email" type="email" defaultValue={editEmpresaData.emailRh || ""} placeholder="email@empresa.com" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-emailsExtras">Emails adicionais</Label>
                  <Input id="edit-empresa-emailsExtras" name="emailsExtras" defaultValue={editEmpresaData.emailsExtras || ""} placeholder="email1@x.com, email2@y.com" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link href={buildUrl({ tab: "empresas", editEmpresa: undefined })} className={buttonVariants({ variant: "outline" })}>
                  Cancelar
                </Link>
                <Button type="submit" loading={submittingUpdate}>Salvar alteracoes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vinculos dialog */}
      {vinculandoId !== null && onVincularAction && (
        <Card className="mt-4 border-blue-200">
          <CardHeader>
            <CardTitle className="text-primary text-base">
              Vinculos da empresa #{vinculandoId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione as empresas vinculadas a esta:</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {empresas
                .filter((e) => e.id !== vinculandoId)
                .map((e) => (
                  <label key={e.id} className="flex items-center gap-2 cursor-pointer text-sm rounded border px-3 py-2 hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={vinculacaoIds.has(e.id)}
                      onChange={() => toggleVinculo(e.id)}
                      className="h-4 w-4"
                    />
                    {e.nome}
                  </label>
                ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVinculandoId(null)}
                className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={saveVinculos}
                disabled={savingVinculo}
              >
                {savingVinculo ? "Salvando..." : "Salvar vinculos"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
