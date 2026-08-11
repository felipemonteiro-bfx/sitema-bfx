"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trocarMinhaSenha } from "@/lib/senha-actions";

/**
 * Formulario proprio de troca de senha em /perfil (D-03). Independente do
 * formulario de dados pessoais: um erro aqui nao descarta a edicao de nome/
 * email/telefone/endereco, e vice-versa.
 */
export function PerfilSenhaForm() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("atual", atual);
      formData.set("nova", nova);
      formData.set("confirmacao", confirmacao);

      const resultado = await trocarMinhaSenha(formData);

      if (resultado.ok) {
        toast.success("Senha alterada com sucesso.");
        setAtual("");
        setNova("");
        setConfirmacao("");
      } else {
        toast.error(resultado.erro || "Não foi possível trocar a senha.");
      }
    } catch {
      // requireSessionOrThrow lanca quando a sessao expirou.
      toast.error("Sessão expirada. Faça login novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="perfil-senha-atual">Senha atual</Label>
        <Input
          id="perfil-senha-atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="perfil-senha-nova">Nova senha</Label>
        <Input
          id="perfil-senha-nova"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="perfil-senha-confirmacao">Confirmar nova senha</Label>
        <Input
          id="perfil-senha-confirmacao"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        Alterar senha
      </Button>
    </form>
  );
}
