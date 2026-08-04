'use client';

import { useMemo, useState, useEffect, startTransition } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ProdutoFormClient from "@/components/produto-form-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, cn } from "@/lib/utils";
import { Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useTableFeatures } from "@/hooks/use-table-features";
import { alternarSelecaoDaPagina, estadoCheckboxDaPagina } from "@/lib/selecao-em-massa";
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

type ProdutoEdit = {
  id: number;
  nome: string;
  custoPadrao: number | null;
  marca: string | null;
  categoria: string | null;
  ncm: string | null;
  valorVenda: number | null;
  qtdEstoque: number | null;
  imagem: string | null;
  fornecedorId: number | null;
  dataCompra: Date | null;
};

type ProdutoListItem = ProdutoEdit & {
  fornecedor?: { id: number; nome: string } | null;
};

interface Props {
  produtos: ProdutoListItem[];
  fornecedores: { id: number; nome: string }[];
  categoriasExistentes?: string[];
  searchQuery?: string;
  initialProduto?: ProdutoEdit | null;
  onCreateAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onDeleteAction: (formData: FormData) => Promise<void>;
  onBulkDeleteAction: (ids: number[]) => Promise<void>;
}

export default function ProdutosTabClient({
  produtos,
  fornecedores,
  categoriasExistentes = [],
  searchQuery,
  initialProduto,
  onCreateAction,
  onUpdateAction,
  onDeleteAction,
  onBulkDeleteAction,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoEdit | null>(initialProduto ?? null);
  const [modalOpen, setModalOpen] = useState(Boolean(initialProduto));
  const [deleting, setDeleting] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const table = useTableFeatures({
    data: produtos as (ProdutoListItem & Record<string, unknown>)[],
    searchFields: ["nome", "marca", "categoria", "ncm"] as (keyof ProdutoListItem)[],
    defaultSort: "nome" as keyof ProdutoListItem,
    defaultSortDir: "asc",
  });

  // Keep backwards compat — these were used throughout
  const sortedProdutos = table.paginatedData as unknown as ProdutoListItem[];
  const sortField = table.sortField;
  const sortDir = table.sortDir;
  const produtosMap = useMemo(
    () => new Map(produtos.map((produto) => [produto.id, produto])),
    [produtos]
  );

  const limparEditProdutoDaUrl = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("editProduto");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleOpenProduto = (produtoId: number) => {
    const produto = produtosMap.get(produtoId);
    if (!produto) return;

    setProdutoSelecionado(produto);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setProdutoSelecionado(null);
    limparEditProdutoDaUrl();
  };

  const handleEditSuccess = () => {
    setModalOpen(false);
    setProdutoSelecionado(null);
    limparEditProdutoDaUrl();

    startTransition(() => {
      router.refresh();
    });
  };

  // O cabecalho vale para a pagina visivel (sortedProdutos), nao para o
  // dataset inteiro.
  const idsVisiveis = useMemo(() => sortedProdutos.map((p) => p.id), [sortedProdutos]);
  const estadoSelecaoCabecalho = estadoCheckboxDaPagina(selectedIds, idsVisiveis);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => alternarSelecaoDaPagina(prev, idsVisiveis, checked === true));
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    table.setSearch(e.target.value);
  };

  const clearSearch = () => {
    table.setSearch("");
  };

  return (
    <>
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-primary">Produtos</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produtos..."
              value={table.search}
              onChange={handleSearchChange}
              className={cn("pl-9 h-9", table.search && "pr-8")}
            />
            {table.search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-sm text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground hover:shadow-none"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 mb-2 mt-2">
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
                <AlertDialogTitle>Excluir {selectedIds.size} produto(s)</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {selectedIds.size} produto(s)? Esta acao nao pode ser desfeita.
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
            <SortableHeader label="Foto" field="_foto" currentDir="asc" onSort={() => {}} className="w-[80px] cursor-default hover:bg-transparent" />
            <SortableHeader label="Nome" field="nome" currentField={sortField as string} currentDir={sortDir} onSort={(f) => table.toggleSort(f as keyof ProdutoListItem)} />
            <SortableHeader label="Categoria" field="categoria" currentField={sortField as string} currentDir={sortDir} onSort={(f) => table.toggleSort(f as keyof ProdutoListItem)} />
            <SortableHeader label="Marca/Fornecedor" field="marca" currentField={sortField as string} currentDir={sortDir} onSort={(f) => table.toggleSort(f as keyof ProdutoListItem)} />
            <SortableHeader label="NCM" field="ncm" currentField={sortField as string} currentDir={sortDir} onSort={(f) => table.toggleSort(f as keyof ProdutoListItem)} />
            <SortableHeader label="Data Compra" field="dataCompra" currentField={sortField as string} currentDir={sortDir} onSort={(f) => table.toggleSort(f as keyof ProdutoListItem)} />
            <SortableHeader label="Valor" field="valorVenda" currentField={sortField as string} currentDir={sortDir} onSort={(f) => table.toggleSort(f as keyof ProdutoListItem)} className="text-right" />
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProdutos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9}>
                <EmptyState variant="products" size="sm" title="Nenhum produto encontrado" description={table.search || searchQuery ? "Tente outro termo de busca." : "Cadastre o primeiro produto acima."} />
              </TableCell>
            </TableRow>
          ) : (
            sortedProdutos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Checkbox
                    aria-label={`Selecionar ${p.nome}`}
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={(checked) => handleSelectOne(p.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  {p.imagem ? (
                    <div className="relative w-10 h-10 border rounded overflow-hidden">
                      <Image
                        src={p.imagem}
                        alt={p.nome}
                        fill
                        className="object-cover"
                        unoptimized={p.imagem.startsWith("http")}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">{p.categoria || "N/A"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold">{p.marca}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.fornecedor?.nome || "Sem fornecedor"}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{p.ncm}</TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {p.dataCompra
                    ? new Date(p.dataCompra).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{formatBRL(p.valorVenda || 0)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          title="Excluir"
                          aria-label={`Excluir ${p.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir produto</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir &quot;{p.nome}&quot;? Esta acao nao pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            disabled={deleting === p.id}
                            onClick={async () => {
                              setDeleting(p.id);
                              try {
                                const fd = new FormData();
                                fd.append("id", String(p.id));
                                await onDeleteAction(fd);
                                startTransition(() => { router.refresh(); });
                              } finally {
                                setDeleting(null);
                              }
                            }}
                          >
                            {deleting === p.id ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-muted-foreground hover:text-foreground")}
                      title="Editar"
                      aria-label={`Editar ${p.nome}`}
                      onClick={() => handleOpenProduto(p.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
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
        totalItems={produtos.length}
        onPageChange={table.setPage}
      />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader className="pr-8">
            <DialogTitle>
              {produtoSelecionado ? `Editar produto #${produtoSelecionado.id}` : "Editar produto"}
            </DialogTitle>
            <DialogDescription>
              Atualize os dados do produto sem sair da listagem.
            </DialogDescription>
          </DialogHeader>

          {produtoSelecionado && (
            <ProdutoFormClient
              produto={produtoSelecionado}
              onSuccessAction={onCreateAction}
              onUpdateAction={onUpdateAction}
              fornecedores={fornecedores}
              categoriasExistentes={categoriasExistentes}
              onCancel={handleCloseModal}
              onEditSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
