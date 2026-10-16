"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/currency-input";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { CadastrarFornecedorRapidoDialog } from "@/components/cadastrar-fornecedor-rapido-dialog";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeInicial: string;
  fornecedores: { id: number; nome: string }[];
  categoriasExistentes: string[];
  onCriado: (produto: {
    id: number;
    nome: string;
    valorVenda: number;
    custoPadrao: number;
    qtdEstoque: number;
  }) => void;
}

export function CadastrarProdutoRapidoDialog({
  open,
  onOpenChange,
  nomeInicial,
  fornecedores,
  categoriasExistentes,
  onCriado,
}: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial.toUpperCase());
  const [valorVenda, setValorVenda] = useState(0);
  const [custoPadrao, setCustoPadrao] = useState(0);
  const [qtdEstoque, setQtdEstoque] = useState(0);
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ncm, setNcm] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [dataCompra, setDataCompra] = useState("");
  const [loading, setLoading] = useState(false);
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);
  const [fornecedoresCriados, setFornecedoresCriados] = useState<{ id: number; nome: string }[]>(
    []
  );

  // D-07: junta a prop `fornecedores` (server component, nao se atualiza
  // sozinha) com os fornecedores criados nesta sessao do modal, dedupe por
  // id, ordenado por nome com localeCompare pt-BR.
  const opcoesFornecedor = useMemo(() => {
    const mapa = new Map<number, { id: number; nome: string }>();
    for (const f of fornecedores) mapa.set(f.id, f);
    for (const f of fornecedoresCriados) mapa.set(f.id, f);
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [fornecedores, fornecedoresCriados]);

  const [ncmSuggestions, setNcmSuggestions] = useState<{ codigo: string; descricao: string }[]>([]);
  const [isSearchingNcm, setIsSearchingNcm] = useState(false);
  const ncmTimer = useRef<NodeJS.Timeout | null>(null);
  const categoryListId = `cat-list-${Math.random().toString(36).slice(2)}`;

  // Sync nome when dialog opens
  useEffect(() => {
    if (open) {
      setNome(nomeInicial.toUpperCase());
    }
  }, [open, nomeInicial]);

  // NCM suggestions based on product name
  useEffect(() => {
    if (nome.trim().length < 3) {
      setNcmSuggestions([]);
      return;
    }
    if (ncmTimer.current) clearTimeout(ncmTimer.current);
    ncmTimer.current = setTimeout(async () => {
      setIsSearchingNcm(true);
      try {
        const res = await fetch(`/api/ncm/search?q=${encodeURIComponent(nome)}`);
        const data = await res.json();
        setNcmSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setNcmSuggestions([]);
      } finally {
        setIsSearchingNcm(false);
      }
    }, 600);
    return () => { if (ncmTimer.current) clearTimeout(ncmTimer.current); };
  }, [nome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          valorVenda,
          custoPadrao,
          qtdEstoque,
          marca,
          categoria,
          ncm,
          fornecedorId: fornecedorId || null,
          dataCompra: dataCompra || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao cadastrar produto");
        return;
      }
      const produto = await res.json();
      toast.success(`Produto "${produto.nome}" cadastrado`);
      // Sem isto a lista da tela de tras so mostra o registro novo apos reload.
      router.refresh();
      onCriado(produto);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao cadastrar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nome */}
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

          {/* Valor + Custo */}
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

          {/* Estoque + Fornecedor */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Fornecedor
                </Label>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setFornecedorDialogOpen(true)}
                  className="h-auto p-0 text-xs font-medium"
                >
                  + Novo fornecedor
                </Button>
              </div>
              <FormSelect
                name="fornecedorId"
                value={fornecedorId}
                onValueChange={setFornecedorId}
                placeholder="Selecionar..."
                options={opcoesFornecedor.map((f) => ({ value: String(f.id), label: f.nome }))}
              />
            </div>
          </div>

          {/* Marca + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Marca
              </Label>
              <Input
                value={marca}
                onChange={(e) => setMarca(e.target.value.toUpperCase())}
                placeholder="Ex: Nike"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Categoria
              </Label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value.toUpperCase())}
                placeholder="Ex: Roupas"
                list={categoryListId}
              />
              <datalist id={categoryListId}>
                {categoriasExistentes
                  .filter((c) => c.toUpperCase().includes(categoria.toUpperCase()))
                  .slice(0, 10)
                  .map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* NCM + Data de Compra */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                NCM
              </Label>
              <Input
                value={ncm}
                onChange={(e) => setNcm(e.target.value.toUpperCase())}
                placeholder="8 dígitos"
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Data de compra
              </Label>
              <DateInput
                value={dataCompra}
                onChange={(v) => setDataCompra(v)}
              />
            </div>
          </div>

          {/* Sugestões de NCM */}
          {(ncmSuggestions.length > 0 || isSearchingNcm) && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
              <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground mb-2">
                <Tag className="h-3.5 w-3.5" />
                Sugestões de NCM pelo nome
                {isSearchingNcm && <span className="ml-auto">Buscando...</span>}
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {ncmSuggestions.map((item) => (
                  <Button
                    key={item.codigo}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full items-start justify-start gap-2 whitespace-normal rounded-md px-2 py-1.5 text-left text-xs font-normal"
                    onClick={() => setNcm(item.codigo)}
                  >
                    <span className="rounded bg-background px-2 py-0.5 font-semibold text-foreground shrink-0">
                      {item.codigo}
                    </span>
                    <span className="text-muted-foreground">{item.descricao}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

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

        {/* Dialog aninhado (Radix): o onOpenChange interno so mexe no
            proprio estado — fechar este nao fecha o modal de produto. */}
        <CadastrarFornecedorRapidoDialog
          open={fornecedorDialogOpen}
          onOpenChange={setFornecedorDialogOpen}
          nomeInicial=""
          onCriado={(f) => {
            setFornecedoresCriados((prev) =>
              prev.some((x) => x.id === f.id) ? prev : [...prev, { id: f.id, nome: f.nome }]
            );
            setFornecedorId(String(f.id));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
