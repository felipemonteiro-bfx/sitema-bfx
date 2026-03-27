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

type EmpresaListItem = {
  id: number;
  nome: string;
  responsavelRh: string | null;
  telefoneRh: string | null;
  emailRh: string | null;
  cnpj: string | null;
  emailsExtras: string | null;
};

interface Props {
  empresas: EmpresaListItem[];
  editEmpresaData?: EmpresaListItem | null;
  searchQuery?: string;
  searchParams: Record<string, string | undefined>;
  onAddAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onBulkDeleteAction: (ids: number[]) => Promise<void>;
}

export default function EmpresasTabClient({
  empresas,
  editEmpresaData,
  searchQuery,
  searchParams: sp,
  onAddAction,
  onUpdateAction,
  onBulkDeleteAction,
}: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">Nova Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onAddAction} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Empresa</div>
                <Input name="nome" placeholder="Empresa" aria-label="Nome" className="uppercase" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">CNPJ</div>
                <Input name="cnpj" placeholder="00.000.000/0000-00" aria-label="CNPJ" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Responsavel RH</div>
                <Input name="rh" placeholder="Responsavel RH" aria-label="Responsavel RH" className="uppercase" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Telefone RH</div>
                <MaskedInput name="tel" mask="phone" aria-label="Telefone RH" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Email RH</div>
                <Input name="email" placeholder="email@empresa.com" aria-label="Email RH" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Emails adicionais</div>
                <Input name="emailsExtras" placeholder="email1@x.com, email2@y.com" aria-label="Emails adicionais" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Empresa</button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-blue-900">Empresas Parceiras</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar empresas..."
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
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader label="Nome" field="nome" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="CNPJ" field="cnpj" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="RH" field="responsavelRh" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="Contato" field="emailRh" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="" field="_" currentDir="asc" onSort={() => {}} className="w-[80px] cursor-default hover:bg-transparent" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {table.search ? "Nenhum resultado encontrado." : "Sem empresas cadastradas."}
                  </TableCell>
                </TableRow>
              ) : (
                (table.paginatedData as unknown as EmpresaListItem[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Checkbox
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
                    <TableCell>
                      <Link
                        href={buildUrl({ tab: "empresas", editEmpresa: String(e.id) })}
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
          <TablePagination page={table.page} totalPages={table.totalPages} totalFiltered={table.totalFiltered} totalItems={empresas.length} onPageChange={table.setPage} />
        </CardContent>
      </Card>

      {editEmpresaData && (
        <Card id="editar-empresa" className="mt-4 scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-blue-900">Editando empresa #{editEmpresaData.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={onUpdateAction} className="grid gap-4">
              <input type="hidden" name="id" value={editEmpresaData.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Empresa</div>
                  <Input name="nome" defaultValue={editEmpresaData.nome} placeholder="Empresa" aria-label="Nome" className="uppercase" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">CNPJ</div>
                  <Input name="cnpj" defaultValue={editEmpresaData.cnpj || ""} placeholder="00.000.000/0000-00" aria-label="CNPJ" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Responsavel RH</div>
                  <Input name="rh" defaultValue={editEmpresaData.responsavelRh || ""} placeholder="Responsavel RH" aria-label="Responsavel RH" className="uppercase" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Telefone RH</div>
                  <MaskedInput name="tel" mask="phone" defaultValue={editEmpresaData.telefoneRh || ""} aria-label="Telefone RH" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Email RH</div>
                  <Input name="email" type="email" defaultValue={editEmpresaData.emailRh || ""} placeholder="email@empresa.com" aria-label="Email RH" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Emails adicionais</div>
                  <Input name="emailsExtras" defaultValue={editEmpresaData.emailsExtras || ""} placeholder="email1@x.com, email2@y.com" aria-label="Emails adicionais" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link href={buildUrl({ tab: "empresas", editEmpresa: undefined })} className={buttonVariants({ variant: "outline" })}>
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
