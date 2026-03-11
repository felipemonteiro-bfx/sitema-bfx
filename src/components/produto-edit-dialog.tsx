'use client';

import ProdutoFormClient from "@/components/produto-form-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

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

interface Props {
  produto: ProdutoEdit;
  fornecedores: { id: number; nome: string }[];
  cancelHref: string;
  onSuccessAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
}

export default function ProdutoEditDialog({
  produto,
  fornecedores,
  cancelHref,
  onSuccessAction,
  onUpdateAction,
}: Props) {
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push(cancelHref);
      router.refresh();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Editar produto #{produto.id}</DialogTitle>
          <DialogDescription>
            Atualize os dados do produto sem sair da listagem.
          </DialogDescription>
        </DialogHeader>

        <ProdutoFormClient
          produto={produto}
          onSuccessAction={onSuccessAction}
          onUpdateAction={onUpdateAction}
          fornecedores={fornecedores}
          cancelHref={cancelHref}
        />
      </DialogContent>
    </Dialog>
  );
}
