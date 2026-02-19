"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  User,
  Calendar,
  ShoppingCart,
  Plus,
  CreditCard,
  Truck,
} from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProdutoItemForm } from "@/components/produto-item-form";
import { ParcelasVencimentoForm } from "@/components/parcelas-vencimento-form";
import { Checkbox } from "@/components/ui/checkbox";
import type { ActionResponse } from "@/lib/action-response";

interface ProdutoItem {
  id: string;
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}

interface Parcela {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
}

interface Props {
  vendedorOptions: { value: string; label: string; comissaoPct: number }[];
  parcelasOptions: { value: string; label: string }[];
  onSubmit: (
    formData: FormData,
  ) => Promise<ActionResponse<{ vendaId: number }>>;
}

export default function VendaRapidaFormV2({
  vendedorOptions,
  parcelasOptions,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);

  // Form states
  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [vendedor, setVendedor] = useState(vendedorOptions[0]?.value || "");
  const [parcelas, setParcelas] = useState("1");

  // Cliente autocomplete
  const [clienteQuery, setClienteQuery] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<{
    id: number;
    nome: string;
  } | null>(null);
  const [clienteSuggestions, setClienteSuggestions] = useState<
    { id: number; nome: string; cpf?: string; cnpj?: string }[]
  >([]);

  // Produtos (múltiplos)
  const [produtos, setProdutos] = useState<ProdutoItem[]>([
    {
      id: crypto.randomUUID(),
      produtoNome: "",
      custoProduto: 0,
      valorVenda: 0,
      quantidade: 1,
      subtotal: 0,
    },
  ]);

  // Outras despesas
  const [frete, setFrete] = useState("0");
  const [envio, setEnvio] = useState("0");
  const [temNota, setTemNota] = useState(false);
  const [taxaNota, setTaxaNota] = useState("5.97");

  // Parcelas com datas
  const [parcelasVencimento, setParcelasVencimento] = useState<Parcela[]>([]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cliente Autocomplete
  useEffect(() => {
    if (clienteQuery.length < 2 || selectedCliente?.nome === clienteQuery) {
      setClienteSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/vendas/autocomplete/clientes?q=${encodeURIComponent(clienteQuery)}`,
        );
        const data = await res.json();
        setClienteSuggestions(data || []);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [clienteQuery, selectedCliente]);

  // Cálculos totais
  const subtotalProdutos = produtos.reduce((sum, p) => sum + p.subtotal, 0);
  const numFrete = Number(frete) || 0;
  const numEnvio = Number(envio) || 0;
  const numTaxaNota = Number(taxaNota) || 0;
  const numParcelas = Number(parcelas) || 1;

  const totalVenda = subtotalProdutos + numFrete;
  const valorDescontoNota = temNota
    ? (subtotalProdutos * numTaxaNota) / 100
    : 0;
  const custoTotal =
    produtos.reduce((sum, p) => sum + p.custoProduto * p.quantidade, 0) +
    numEnvio +
    valorDescontoNota;
  const lucroBruto = totalVenda - custoTotal;
  const margemPct = subtotalProdutos > 0 ? (lucroBruto / totalVenda) * 100 : 0;

  const selectedVendedorData = vendedorOptions.find(
    (v) => v.value === vendedor,
  );
  const comissaoPct = selectedVendedorData?.comissaoPct || 0;
  const valorComissao = (lucroBruto * comissaoPct) / 100;

  // Handlers
  const addProduto = () => {
    setProdutos([
      ...produtos,
      {
        id: crypto.randomUUID(),
        produtoNome: "",
        custoProduto: 0,
        valorVenda: 0,
        quantidade: 1,
        subtotal: 0,
      },
    ]);
  };

  const removeProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
    }
  };

  const updateProduto = (index: number, item: ProdutoItem) => {
    const newProdutos = [...produtos];
    newProdutos[index] = item;
    setProdutos(newProdutos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) {
      toast.warning("Selecione um cliente para continuar.");
      return;
    }

    if (produtos.some((p) => !p.produtoNome)) {
      toast.warning("Preencha o nome de todos os produtos.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("data", dataVenda);
    formData.append("vendedor", vendedor);
    formData.append("clienteId", selectedCliente.id.toString());
    formData.append("frete", frete);
    formData.append("envio", envio);
    formData.append("parcelas", parcelas);
    formData.append("temNota", String(temNota));
    formData.append("taxaNota", taxaNota);

    // Produtos (JSON)
    formData.append("produtos", JSON.stringify(produtos));

    // Parcelas com datas (JSON)
    if (numParcelas > 1 && parcelasVencimento.length > 0) {
      formData.append("parcelasVencimento", JSON.stringify(parcelasVencimento));
    }

    try {
      const result = await onSubmit(formData);
      if (result.success) {
        // Reset form
        setClienteQuery("");
        setSelectedCliente(null);
        setProdutos([
          {
            id: crypto.randomUUID(),
            produtoNome: "",
            custoProduto: 0,
            valorVenda: 0,
            quantidade: 1,
            subtotal: 0,
          },
        ]);
        setFrete("0");
        setEnvio("0");
        setParcelas("1");
        setTemNota(false);
        setParcelasVencimento([]);
        toast.success(result.message || "Venda realizada com sucesso!");
      } else {
        toast.error(result.error || "Erro ao finalizar venda.");
      }
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      toast.error("Erro ao finalizar venda. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seção 1: Contexto da Venda */}
      <Card variant="elevated" className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Contexto da Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Data da Venda
              </Label>
              <DateInput
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Vendedor Responsável
              </Label>
              <FormSelect
                name="vendedor"
                options={vendedorOptions}
                value={vendedor}
                onValueChange={setVendedor}
                placeholder="Selecione o vendedor"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Cliente */}
      <Card
        variant="elevated"
        className={cn(
          "border-info/20",
          clienteSuggestions.length > 0 && "z-10",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-info" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 relative">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Buscar Cliente
            </Label>
            <Input
              value={clienteQuery}
              onChange={(e) => setClienteQuery(e.target.value)}
              placeholder="Digite o nome do cliente"
              required
            />
            {clienteSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {clienteSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCliente(c);
                      setClienteQuery(c.nome);
                      setClienteSuggestions([]);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer text-sm"
                  >
                    <div className="font-medium">{c.nome}</div>
                    {(c.cpf || c.cnpj) && (
                      <div className="text-xs text-muted-foreground">
                        {c.cpf || c.cnpj}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Produtos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Produtos da Venda
          </h3>
          <Button
            type="button"
            onClick={addProduto}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Produto
          </Button>
        </div>

        {produtos.map((produto, index) => (
          <ProdutoItemForm
            key={produto.id}
            item={produto}
            index={index}
            onUpdate={updateProduto}
            onRemove={removeProduto}
            canRemove={produtos.length > 1}
          />
        ))}
      </div>

      {/* Seção 4: Despesas Adicionais */}
      <Card variant="elevated" className="border-warning/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-warning" />
            Despesas Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Frete (Cobrado)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={frete}
                onChange={(e) => setFrete(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Envio (Custo)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={envio}
                onChange={(e) => setEnvio(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={temNota}
                  onCheckedChange={(checked) => setTemNota(checked === true)}
                />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                  Com Nota Fiscal
                </Label>
              </div>
              {temNota && (
                <Input
                  type="number"
                  step="0.01"
                  value={taxaNota}
                  onChange={(e) => setTaxaNota(e.target.value)}
                  placeholder="Taxa %"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 5: Parcelamento */}
      <Card variant="elevated" className="border-success/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-success" />
            Parcelamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Número de Parcelas
            </Label>
            <FormSelect
              name="parcelas"
              options={parcelasOptions}
              value={parcelas}
              onValueChange={setParcelas}
              placeholder="Selecione"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção 6: Datas de Vencimento */}
      <ParcelasVencimentoForm
        numeroParcelas={numParcelas}
        valorTotal={totalVenda}
        parcelas={parcelasVencimento}
        onChange={setParcelasVencimento}
      />

      {/* Seção 7: Resumo Financeiro */}
      <Card
        variant="elevated"
        className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Subtotal Produtos
              </div>
              <div className="text-lg font-bold text-foreground">
                {formatBRL(subtotalProdutos)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Frete
              </div>
              <div className="text-lg font-bold text-foreground">
                {formatBRL(numFrete)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Venda
              </div>
              <div className="text-xl font-black text-primary">
                {formatBRL(totalVenda)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Valor Parcela
              </div>
              <div className="text-lg font-bold text-info">
                {formatBRL(totalVenda / numParcelas)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Custo Total
              </div>
              <div className="text-lg font-bold text-foreground">
                {formatBRL(custoTotal)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Lucro Bruto
              </div>
              <div className="text-lg font-bold text-success">
                {formatBRL(lucroBruto)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Margem
              </div>
              <div className="text-lg font-bold text-success">
                {margemPct.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Comissão ({comissaoPct}%)
              </div>
              <div className="text-lg font-bold text-warning">
                {formatBRL(valorComissao)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Finalizar */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            loading || !selectedCliente || produtos.some((p) => !p.produtoNome)
          }
          variant="success"
          size="lg"
          className="px-12 text-base font-bold shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>Finalizar Venda</>
          )}
        </Button>
      </div>
    </form>
  );
}
