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
import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  campanhaId: number;
  campanhaNome: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

/**
 * Excluir campanha com confirmacao (achado ALTA da auditoria visual de
 * 2026-08-11).
 *
 * Antes era um `<button type="submit">` dentro de um `<form>`, com aparencia
 * `ghost`, na MESMA linha do "Disparar agora" primario: um clique errado
 * apagava a campanha sem nenhuma pergunta. O padrao do projeto para acao
 * destrutiva ja existia em `DeleteUserButton` e `DeleteVendaButton` — esta
 * tela era a que faltava.
 *
 * Alem da confirmacao, o botao passa a `variant="destructive"`: a aparencia
 * `ghost` fazia a acao mais perigosa da tela parecer a mais inocente.
 */
export function DeleteCampanhaButton({ campanhaId, campanhaNome, deleteAction }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("campanhaId", String(campanhaId));
      await deleteAction(formData);
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao excluir campanha.");
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
          aria-label={`Excluir campanha ${campanhaNome}`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a campanha &ldquo;{campanhaNome}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            A campanha e o agendamento dela serão removidos. As mensagens já enviadas não são
            afetadas. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? "Excluindo..." : "Excluir campanha"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
