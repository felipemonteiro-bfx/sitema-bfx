"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/currency-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeInicial: string;
  onCriado: (produto: {
    id: number;
    nome: string;
    valorVenda: number;
    custoPadrao: number;
    qtdEstoque: number;
  }) => void;
}

export function CadastrarProdutoRapidoDialog({ open, onOpenChange, nomeInicial, onCriado }: Props) {
  const [nome, setNome] = useState(nomeInicial.toUpperCase());
  const [valorVenda, setValorVenda] = useState(0);
  const [custoPadrao, setCustoPadrao] = useState(0);
  const [qtdEstoque, setQtdEstoque] = useState(0);
  const [loading, setLoading] = useState(false);

  // Sync nome when dialog opens with a new nomeInicial
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setNome(nomeInicial.toUpperCase());
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, valorVenda, custoPadrao, qtdEstoque }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao cadastrar produto");
        return;
      }
      const produto = await res.json();
      toast.success(`Produto "${produto.nome}" cadastrado`);
      onCriado(produto);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao cadastrar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar produto rápido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nome do produto *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do produto"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Valor de venda
              </Label>
              <CurrencyInput value={valorVenda} onChange={setValorVenda} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Custo
              </Label>
              <CurrencyInput value={custoPadrao} onChange={setCustoPadrao} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estoque inicial
            </Label>
            <Input
              type="number"
              min="0"
              value={qtdEstoque}
              onChange={(e) => setQtdEstoque(Number(e.target.value))}
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
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar e selecionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
