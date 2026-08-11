"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Sparkles, Copy } from "lucide-react";
import { gerarSenhaForte } from "@/lib/senha-politica";
import { redefinirSenhaDeUsuario } from "@/lib/senha-actions";

interface Props {
  userId: number;
  userName: string;
}

/**
 * Redefinicao de senha por admin (D-02). Fica dentro do <form action={updateMeta}>
 * da aba Detalhes de /gestao-rh — NAO pode conter um <form> proprio (form
 * aninhado e' HTML invalido). O FormData e' montado a mao e a Server Action e'
 * chamada diretamente, igual a DeleteUserButton.
 *
 * A senha gerada vive so no estado do React: nunca em searchParams, nunca em
 * defaultValue vindo do servidor, nunca em console.log (T-CYM-05).
 */
export function ResetSenhaDialog({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const aoMudarAberto = (proximoAberto: boolean) => {
    setOpen(proximoAberto);
    if (!proximoAberto) {
      setNovaSenha("");
    }
  };

  const handleGerar = () => {
    setNovaSenha(gerarSenhaForte());
  };

  const handleCopiar = async () => {
    if (!novaSenha) return;
    try {
      await navigator.clipboard.writeText(novaSenha);
      toast.success("Senha copiada para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o valor manualmente.");
    }
  };

  const handleConfirmar = async () => {
    if (!novaSenha) {
      toast.error("Gere ou digite uma senha antes de confirmar.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("usuarioId", String(userId));
      formData.append("nova", novaSenha);

      const resultado = await redefinirSenhaDeUsuario(formData);

      if (resultado.ok) {
        toast.success(
          "Senha redefinida. Este valor só aparece uma vez — copie agora antes de fechar."
        );
      } else {
        toast.error(resultado.erro || "Não foi possível redefinir a senha.");
      }
    } catch {
      toast.error("Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={aoMudarAberto}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Redefinir senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha de &quot;{userName}&quot;</DialogTitle>
          <DialogDescription>
            Gere uma senha forte, copie e envie para o usuário. O valor só é exibido
            uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`reset-senha-valor-${userId}`}>Nova senha</Label>
            <Input
              id={`reset-senha-valor-${userId}`}
              type="text"
              autoComplete="off"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Gere ou digite uma senha"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGerar}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Gerar senha forte
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopiar}
              disabled={!novaSenha}
              leftIcon={<Copy className="h-4 w-4" />}
            >
              Copiar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => aoMudarAberto(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            loading={loading}
            disabled={!novaSenha}
          >
            Confirmar redefinição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
