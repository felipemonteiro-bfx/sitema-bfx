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
import { UserMinus, Loader2 } from "lucide-react";
import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: number;
  userName: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function DeleteUserButton({ userId, userName, deleteAction }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', userId.toString());
      await deleteAction(formData);
      // Sem isso o vendedor removido continua na tela ate dar F5.
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao remover usuário.");
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
          leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
        >
          Excluir Vendedor
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover &quot;{userName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não poderá ser desfeita. O usuário será removido permanentemente do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
