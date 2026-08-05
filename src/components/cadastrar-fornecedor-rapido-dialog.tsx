"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FornecedorCriado {
  id: number;
  nome: string;
  reativado: boolean;
  jaExistia: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeInicial: string;
  onCriado: (fornecedor: FornecedorCriado) => void;
}

export function CadastrarFornecedorRapidoDialog({
  open,
  onOpenChange,
  nomeInicial,
  onCriado,
}: Props) {
  const [nome, setNome] = useState(nomeInicial.toUpperCase());
  const [loading, setLoading] = useState(false);

  // Sync nome quando o dialog abre
  useEffect(() => {
    if (open) {
      setNome(nomeInicial.toUpperCase());
    }
  }, [open, nomeInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao cadastrar fornecedor");
        return;
      }
      const fornecedor: FornecedorCriado = await res.json();
      if (fornecedor.reativado) {
        toast.success(`Fornecedor "${fornecedor.nome}" reativado`);
      } else if (fornecedor.jaExistia) {
        toast.success(`Fornecedor "${fornecedor.nome}" ja cadastrado`);
      } else {
        toast.success(`Fornecedor "${fornecedor.nome}" cadastrado`);
      }
      onCriado(fornecedor);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao cadastrar fornecedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar fornecedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nome do fornecedor *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do fornecedor"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !nome.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cadastrar e selecionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
