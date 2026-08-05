"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/form-select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deveConsultarSimilares } from "@/lib/cliente-rapido";

export interface ClienteRapidoCriado {
  id: number;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  cnpj: string | null;
  endereco: string | null;
  cep: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeInicial: string;
  onCriado: (cliente: ClienteRapidoCriado) => void;
}

export function CadastrarClienteRapidoDialog({
  open,
  onOpenChange,
  nomeInicial,
  onCriado,
}: Props) {
  const [nome, setNome] = useState(nomeInicial.toUpperCase());
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [empresaParceiraId, setEmpresaParceiraId] = useState("");
  const [empresasParceiras, setEmpresasParceiras] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [similares, setSimilares] = useState<{ id: number; nome: string }[]>([]);
  const similaresTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync nome when dialog opens
  useEffect(() => {
    if (open) {
      setNome(nomeInicial.toUpperCase());
    }
  }, [open, nomeInicial]);

  // Aviso de nome parecido (D-05) — nunca bloqueia o cadastro, so avisa.
  // Mesmo padrao de atraso do useEffect de NCM do cadastrar-produto-rapido-dialog.tsx.
  useEffect(() => {
    if (!open || !deveConsultarSimilares(nome)) {
      setSimilares([]);
      return;
    }
    if (similaresTimer.current) clearTimeout(similaresTimer.current);
    similaresTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes/similar?nome=${encodeURIComponent(nome)}`);
        const data = await res.json();
        setSimilares(Array.isArray(data.similares) ? data.similares : []);
      } catch {
        setSimilares([]);
      }
    }, 500);
    return () => { if (similaresTimer.current) clearTimeout(similaresTimer.current); };
  }, [nome, open]);

  // Carrega empresas parceiras uma vez quando o modal abre. Falha na
  // requisicao nao bloqueia o cadastro — a lista so fica vazia.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/empresas/autocomplete");
        const data = await res.json().catch(() => ({}));
        setEmpresasParceiras(Array.isArray(data.options) ? data.options : []);
      } catch {
        setEmpresasParceiras([]);
      }
    })();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          telefone: telefone.trim() || null,
          cpf: cpf.trim() || null,
          empresaParceiraId: empresaParceiraId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao cadastrar cliente");
        return;
      }
      const cliente = await res.json();
      toast.success(`Cliente "${cliente.nome}" cadastrado`);
      onCriado(cliente);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nome do cliente *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do cliente"
              required
              autoFocus
            />
          </div>

          {/* Aviso de nome parecido (D-05) — informativo, nunca bloqueia o cadastro */}
          {similares.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-2">
              <div className="flex items-center gap-2 text-xs font-medium text-warning-text">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Ja existe cliente com nome parecido — confira antes de cadastrar
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-6 text-xs text-muted-foreground">
                {similares.map((c) => (
                  <li key={c.id}>{c.nome}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Telefone + CPF */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Telefone
              </Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: (11) 99999-0000"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                CPF <span className="normal-case font-normal">(so p/ boleto)</span>
              </Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Empresa parceira */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Empresa parceira
            </Label>
            <FormSelect
              name="empresaParceiraId"
              value={empresaParceiraId}
              onValueChange={setEmpresaParceiraId}
              placeholder="Selecionar..."
              options={empresasParceiras.map((e) => ({ value: String(e.id), label: e.nome }))}
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
