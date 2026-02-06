'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Loader2, User, Package, CheckCircle2, 
  Calendar, ShoppingCart, Calculator, 
  CreditCard, AlertTriangle, Sparkles,
  ArrowRight, Truck, Receipt, Percent
} from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  vendedorOptions: { value: string; label: string; comissaoPct: number }[];
  parcelasOptions: { value: string; label: string }[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function VendaRapidaFormClient({ vendedorOptions, parcelasOptions, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [vendedor, setVendedor] = useState(vendedorOptions[0]?.value || '');
  const [parcelas, setParcelas] = useState('1');
  
  const [clienteQuery, setClienteQuery] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<{id: number, nome: string} | null>(null);
  const [clienteSuggestions, setClienteSuggestions] = useState<{ id: number; nome: string; cpf?: string; cnpj?: string }[]>([]);
  
  const [produtoQuery, setProdutoQuery] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<{id: number, nome: string} | null>(null);
  const [produtoSuggestions, setProdutoSuggestions] = useState<{ id: number; nome: string; marca?: string; valorVenda?: number; custoPadrao?: number; custoProduto?: number; estoqueAtual?: number }[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<{
    upsell: { id: number; nome: string; valorVenda: number; label: string }[], 
    crossSell: { id: number; nome: string; valorVenda: number; label: string }[]
  } | null>(null);
  
  const [custo, setCusto] = useState('');
  const [valor, setValor] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [frete, setFrete] = useState('0');
  const [envio, setEnvio] = useState('0');
  const [temNota, setTemNota] = useState(false);
  const [taxaNota, setTaxaNota] = useState('5.97');
  
  const [limiteData, setLimiteData] = useState<{
    margemTotal: number;
    comprometimentoAtual: number;
    margemDisponivel: number;
    tetoParcelaMax: number;
  } | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Consulta de Limite ao selecionar cliente
  useEffect(() => {
    if (selectedCliente) {
      fetch(`/api/clientes/${selectedCliente.id}/limite`)
        .then(res => res.json())
        .then(data => setLimiteData(data))
        .catch(error => console.error("Erro ao buscar limite:", error));
    } else {
      setLimiteData(null);
    }
  }, [selectedCliente]);

  // Busca Sugestões Inteligentes (Upsell/Cross-sell)
  useEffect(() => {
    if (selectedProduto) {
      const clienteParam = selectedCliente ? `&clienteId=${selectedCliente.id}` : '';
      fetch(`/api/vendas/sugestoes?produtoId=${selectedProduto.id}${clienteParam}`)
        .then(res => res.json())
        .then(data => setAiSuggestions(data))
        .catch(error => console.error("Erro ao buscar sugestões IA:", error));
    } else {
      setAiSuggestions(null);
    }
  }, [selectedProduto, selectedCliente]);

  const selectProduto = (p: { id: number; nome: string; valorVenda?: number; custoPadrao?: number; custoProduto?: number }) => {
    setSelectedProduto(p);
    setProdutoQuery(p.nome);
    setCusto(p.custoPadrao?.toString() || p.custoProduto?.toString() || '');
    setValor(p.valorVenda?.toString() || '');
    setProdutoSuggestions([]);
  };

  // Cálculos em tempo real
  const numValor = Number(valor) || 0;
  const numCusto = Number(custo) || 0;
  const numQuantidade = Number(quantidade) || 1;
  const numFrete = Number(frete) || 0;
  const numEnvio = Number(envio) || 0;
  const numParcelas = Number(parcelas) || 1;
  const numTaxaNota = Number(taxaNota) || 0;

  const subtotal = numValor * numQuantidade;
  const totalVenda = subtotal + numFrete;
  const valorParcela = totalVenda / numParcelas;
  
  const valorDescontoNota = temNota ? (subtotal * numTaxaNota) / 100 : 0;
  const custoTotal = (numCusto * numQuantidade) + numEnvio + valorDescontoNota;
  
  const lucroBruto = totalVenda - custoTotal;
  const margemPct = subtotal > 0 ? (lucroBruto / totalVenda) * 100 : 0;

  const selectedVendedorData = vendedorOptions.find(v => v.value === vendedor);
  const comissaoPct = selectedVendedorData?.comissaoPct || 0;
  const valorComissao = (lucroBruto * comissaoPct) / 100;

  // Verificações de crédito
  const excedeuMargem = limiteData ? valorParcela > (limiteData.margemDisponivel + 1) : false;
  const excedeuTeto = valorParcela > 475.01;
  const showCreditWarning = excedeuMargem || excedeuTeto;

  // Cliente Autocomplete
  useEffect(() => {
    if (clienteQuery.length < 2 || selectedCliente?.nome === clienteQuery) {
      setClienteSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendas/autocomplete/clientes?q=${encodeURIComponent(clienteQuery)}`);
        const data = await res.json();
        setClienteSuggestions(data || []);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [clienteQuery, selectedCliente]);

  // Produto Autocomplete
  useEffect(() => {
    if (produtoQuery.length < 2 || selectedProduto?.nome === produtoQuery) {
      setProdutoSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendas/autocomplete/produtos?q=${encodeURIComponent(produtoQuery)}`);
        const data = await res.json();
        setProdutoSuggestions(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [produtoQuery, selectedProduto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente || !produtoQuery) {
      alert("Por favor, selecione um cliente e informe o produto.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('data', dataVenda);
    formData.append('vendedor', vendedor);
    formData.append('cliente', selectedCliente.id.toString());
    formData.append('produto', produtoQuery);
    formData.append('custo', custo);
    formData.append('valor', valor);
    formData.append('quantidade', quantidade);
    formData.append('frete', frete);
    formData.append('envio', envio);
    formData.append('parcelas', parcelas);
    formData.append('temNota', String(temNota));
    formData.append('taxaNota', taxaNota);

    try {
      await onSubmit(formData);
      // Reset form (except date and vendor)
      setClienteQuery('');
      setSelectedCliente(null);
      setProdutoQuery('');
      setSelectedProduto(null);
      setCusto('');
      setValor('');
      setQuantidade('1');
      setFrete('0');
      setEnvio('0');
      setTemNota(false);
      alert("Venda realizada com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("Erro ao finalizar venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
      {/* Coluna da Esquerda: Inputs do Form */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Seção 1: Contexto da Venda */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-dashed">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" /> Data da Venda
            </Label>
            <DateInput
              value={dataVenda} 
              onChange={(e) => setDataVenda(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-3 w-3" /> Vendedor Responsável
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

        {/* Seção 2: Identificação do Cliente */}
        <Card className="border-none shadow-sm bg-white dark:bg-card overflow-visible">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="relative">
              <div className="relative">
                <Input 
                  value={clienteQuery} 
                  onChange={(e) => setClienteQuery(e.target.value)} 
                  placeholder="Pesquisar por nome ou CPF..."
                  className={`pl-10 h-11 transition-all ${selectedCliente ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-emerald-500/20" : ""}`}
                  required
                />
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${selectedCliente ? "text-emerald-600" : "text-muted-foreground"}`} />
                {selectedCliente && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Selecionado</Badge>
                  </div>
                )}
              </div>
              
              {clienteSuggestions.length > 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-card border rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95">
                  {clienteSuggestions.map((c) => (
                    <div 
                      key={c.id} 
                      className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm flex justify-between items-center border-b last:border-0 transition-colors"
                      onClick={() => {
                        setSelectedCliente(c);
                        setClienteQuery(c.nome);
                        setClienteSuggestions([]);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{c.nome}</span>
                        <span className="text-xs text-muted-foreground">{c.cpf || c.cnpj || 'Sem documento'}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Seleção do Produto */}
        <Card className="border-none shadow-sm bg-white dark:bg-card overflow-visible">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" /> Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid gap-4">
              <div className="relative">
                <div className="relative">
                  <Input 
                    value={produtoQuery} 
                    onChange={(e) => setProdutoQuery(e.target.value)} 
                    placeholder="Pesquisar produto por nome..."
                    className={`pl-10 h-11 transition-all ${selectedProduto ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20" : ""}`}
                    required
                  />
                  <Package className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${selectedProduto ? "text-emerald-600" : "text-muted-foreground"}`} />
                </div>

                {produtoSuggestions.length > 0 && (
                  <div className="absolute z-[90] w-full mt-1 bg-white dark:bg-card border rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95">
                    {produtoSuggestions.map((p) => (
                      <div 
                        key={p.id} 
                        className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm flex justify-between items-center border-b last:border-0 transition-colors"
                        onClick={() => selectProduto(p)}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{p.nome}</span>
                          <span className="text-xs text-muted-foreground">{p.marca || 'Sem marca'} • Estoque: {p.estoqueAtual || 0}</span>
                        </div>
                        <span className="font-bold text-blue-700 dark:text-blue-400">{formatBRL(p.valorVenda || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inteligência Artificial de Vendas */}
              {aiSuggestions && (aiSuggestions.upsell.length > 0 || aiSuggestions.crossSell.length > 0) && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 mt-2">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs uppercase mb-3">
                    <Sparkles className="h-4 w-4" /> BFX Intelligence Sugestões
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...aiSuggestions.upsell, ...aiSuggestions.crossSell].slice(0, 2).map((s) => (
                      <div 
                        key={s.id}
                        onClick={() => {
                          selectProduto(s);
                          setAiSuggestions(null);
                        }}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/80 dark:bg-card/80 hover:bg-white dark:hover:bg-card border border-purple-200 dark:border-purple-800/50 cursor-pointer transition-all hover:shadow-md group"
                      >
                        <div className="flex flex-col overflow-hidden">
                          <Badge variant="secondary" className="w-fit text-[9px] h-4 mb-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100">
                            {s.label || 'Sugestão'}
                          </Badge>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-400">{s.nome}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{formatBRL(s.valorVenda)}</span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                          <ShoppingCart className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seção 4: Valores e Detalhes Financeiros */}
        <Card className="border-none shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" /> Valores e Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Preço Unit.</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                  <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="pl-9 font-bold" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Qtd</Label>
                <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="font-bold" required />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Parcelas</Label>
                <FormSelect name="parcelas" options={parcelasOptions} value={parcelas} onValueChange={setParcelas} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Frete Cobrado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                  <Input type="number" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Custo Unit.</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                  <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} className="pl-9 text-red-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Custo Envio</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                  <Input type="number" step="0.01" value={envio} onChange={(e) => setEnvio(e.target.value)} className="pl-9 text-red-600" />
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 flex items-end">
                <div className="flex items-center space-x-2 border rounded-md h-10 px-3 w-full bg-slate-50/50 dark:bg-slate-900/50">
                  <input 
                    type="checkbox" 
                    id="temNota" 
                    checked={temNota} 
                    onChange={(e) => setTemNota(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="temNota" className="text-sm font-medium leading-none cursor-pointer select-none">
                    Emitir Nota Fiscal
                  </Label>
                </div>
              </div>
              {temNota && (
                <div className="space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Alíquota (%)</Label>
                  <Input type="number" step="0.01" value={taxaNota} onChange={(e) => setTaxaNota(e.target.value)} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coluna da Direita: Resumo Fixo (Sidebar) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="sticky top-6">
          <Card className="border-none shadow-lg bg-blue-900 text-white overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Resumo
                </h3>
                <Badge className="bg-blue-800 text-blue-200 hover:bg-blue-800 border-none">
                  {selectedProduto ? `${quantidade} Item(s)` : 'Vazio'}
                </Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-blue-100 text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between text-blue-100 text-sm">
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Frete</span>
                  <span className="font-semibold">{formatBRL(numFrete)}</span>
                </div>
                {temNota && (
                  <div className="flex justify-between text-blue-100 text-sm">
                    <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Impostos</span>
                    <span className="font-semibold text-red-300">-{formatBRL(valorDescontoNota)}</span>
                  </div>
                )}
                <Separator className="bg-blue-800" />
                <div className="flex justify-between items-end pt-1">
                  <span className="text-sm text-blue-200 uppercase font-bold tracking-widest">Total Geral</span>
                  <span className="text-3xl font-black text-white leading-none">
                    {formatBRL(totalVenda)}
                  </span>
                </div>
                {numParcelas > 1 && (
                  <div className="text-right text-xs text-blue-300 font-medium">
                    {numParcelas}x de {formatBRL(valorParcela)}
                  </div>
                )}
              </div>

              <div className="bg-blue-950/40 rounded-xl p-4 mb-6 border border-blue-800/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-blue-300 uppercase font-bold mb-1">Lucro Líquido</div>
                    <div className={`text-lg font-bold ${lucroBruto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatBRL(lucroBruto)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-blue-300 uppercase font-bold mb-1">Margem %</div>
                    <div className={`text-lg font-bold ${margemPct >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {margemPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-blue-200 border-t border-blue-800/50 pt-2">
                  <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Comissão ({comissaoPct}%)</span>
                  <span className="font-bold text-amber-400">{formatBRL(valorComissao > 0 ? valorComissao : 0)}</span>
                </div>
              </div>

              <Button 
                disabled={loading || !selectedCliente || !produtoQuery} 
                type="submit" 
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black text-lg shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] cursor-pointer"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    FINALIZAR VENDA
                  </div>
                )}
              </Button>
            </div>
          </Card>

          {/* Widgets de Contexto Extra */}
          <div className="mt-4 space-y-4">
            {limiteData && (
              <Card className={`border-2 transition-colors ${showCreditWarning ? 'bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Análise de Crédito
                    </div>
                    {showCreditWarning && (
                      <Badge variant="destructive" className="animate-pulse">Risco Alto</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Saldo Disponível</span>
                      <span className={`font-bold ${limiteData.margemDisponivel > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatBRL(limiteData.margemDisponivel)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${showCreditWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, (limiteData.comprometimentoAtual / limiteData.margemTotal) * 100)}%` }}
                      />
                    </div>
                    {showCreditWarning && (
                      <div className="flex items-start gap-2 text-[10px] text-amber-800 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-900/30 mt-2">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <div>
                          <strong>Limite Excedido:</strong> A parcela de {formatBRL(valorParcela)} supera a margem residual ou o teto de crédito do cliente.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedCliente && (
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center space-y-2 opacity-60">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Nenhum Cliente</div>
                <p className="text-[10px] text-slate-400 px-4">Selecione um cliente para ver o limite de crédito e histórico.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}