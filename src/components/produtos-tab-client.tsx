'use client';

import { useMemo, useState, startTransition } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
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
import { Pencil, Search, Trash2 } from "lucide-react";
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

  const allSelected = produtos.length > 0 && selectedIds.size === produtos.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < produtos.length;

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(new Set(produtos.map((p) => p.id)));
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
      <form className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q_produtos"
          placeholder="Pesquisar produtos..."
          defaultValue={searchQuery}
          className="pl-9 h-9"
        />
        <input type="hidden" name="tab" value="produtos" />
      </form>

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-[80px]">Foto</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Marca/Fornecedor</TableHead>
            <TableHead>NCM</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Sem produtos cadastrados.
              </TableCell>
            </TableRow>
          ) : (
            produtos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Checkbox
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
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-[10px] text-muted-foreground">
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
