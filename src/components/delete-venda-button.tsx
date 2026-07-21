'use client';

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  vendaId: number;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function DeleteVendaButton({ vendaId, deleteAction }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', vendaId.toString());
      await deleteAction(formData);
      toast.success("Venda excluida com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Server Action") || msg.includes("older or newer")) {
        toast.error("Pagina desatualizada. Recarregando...");
        window.location.reload();
      } else {
        toast.error("Erro ao excluir venda. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={loading}
          leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        >
          Excluir Venda
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir venda permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A venda e todos os seus itens serão removidos do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
