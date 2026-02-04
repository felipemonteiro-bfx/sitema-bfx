'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, User, Package, CheckCircle2 } from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { formatBRL } from "@/lib/utils";

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
  const [clienteSuggestions, setClienteSuggestions] = useState<any[]>([]);
  
  const [produtoQuery, setProdutoQuery] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<{id: number, nome: string} | null>(null);
  const [produtoSuggestions, setProdutoSuggestions] = useState<any[]>([]);
  
  const [custo, setCusto] = useState('');
  const [valor, setValor] = useState('');
  const [frete, setFrete] = useState('0');
  const [envio, setEnvio] = useState('0');

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // CÃ¡lculos em tempo real
  const numValor = Number(valor) || 0;
  const numCusto = Number(custo) || 0;
  const numFrete = Number(frete) || 0;
  const numEnvio = Number(envio) || 0;
  const numParcelas = Number(parcelas) || 1;

  const totalVenda = numValor + numFrete;
  const valorParcela = totalVenda / numParcelas;
  const lucroBruto = totalVenda - (numCusto + numEnvio);
  const margemPct = numValor > 0 ? (lucroBruto / totalVenda) * 100 : 0;

  const selectedVendedorData = vendedorOptions.find(v => v.value === vendedor);
  const comissaoPct = selectedVendedorData?.comissaoPct || 0;
  const valorComissao = (lucroBruto * comissaoPct) / 100;

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
    formData.append('frete', frete);
    formData.append('envio', envio);
    formData.append('parcelas', parcelas);

    try {
      await onSubmit(formData);
      // Reset form (except date and vendor)
      setClienteQuery('');
      setSelectedCliente(null);
      setProdutoQuery('');
      setSelectedProduto(null);
      setCusto('');
      setValor('');
      setFrete('0');
      setEnvio('0');
      alert("Venda realizada com sucesso!");
    } catch (error) {
      alert("Erro ao finalizar venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Data da venda</Label>
          <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} required />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Vendedor</Label>
          <FormSelect
            name="vendedor"
            options={vendedorOptions}
            value={vendedor}
            onValueChange={setVendedor}
            placeholder="Vendedor"
          />
        </div>

        <div className="space-y-1 relative">
          <Label className="text-xs font-semibold text-muted-foreground">Cliente (Busca)</Label>
          <div className="relative">
            <Input 
              value={clienteQuery} 
              onChange={(e) => setClienteQuery(e.target.value)} 
              placeholder="Digite o nome do cliente..."
              className={selectedCliente ? "border-emerald-500 bg-emerald-50/30" : ""}
              required
            />
            <User className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${selectedCliente ? "text-emerald-600" : "text-muted-foreground"}`} />
          </div>
          
          {clienteSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
              {clienteSuggestions.map((c) => (
                <div 
                  key={c.id} 
                  className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between items-center"
                  onClick={() => {
                    setSelectedCliente(c);
                    setClienteQuery(c.nome);
                    setClienteSuggestions([]);
                  }}
                >
                  <span className="font-medium">{c.nome}</span>
                  <span className="text-[10px] text-muted-foreground">{c.cpf || c.cnpj || 'Sem doc'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 relative">
          <Label className="text-xs font-semibold text-muted-foreground">Produto (Busca)</Label>
          <div className="relative">
            <Input 
              value={produtoQuery} 
              onChange={(e) => setProdutoQuery(e.target.value)} 
              placeholder="Digite o nome do produto..."
              className={selectedProduto ? "border-emerald-500 bg-emerald-50/30" : ""}
              required
            />
            <Package className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${selectedProduto ? "text-emerald-600" : "text-muted-foreground"}`} />
          </div>

          {produtoSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
              {produtoSuggestions.map((p) => (
                <div 
                  key={p.id} 
                  className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex flex-col"
                  onClick={() => {
                    setSelectedProduto(p);
                    setProdutoQuery(p.nome);
                    setCusto(p.custoPadrao?.toString() || '');
                    setValor(p.valorVenda?.toString() || '');
                    setProdutoSuggestions([]);
                  }}
                >
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-[10px] text-muted-foreground">{p.marca} - {formatBRL(p.valorVenda || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Parcelas</Label>
          <FormSelect name="parcelas" options={parcelasOptions} value={parcelas} onValueChange={setParcelas} />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Custo do produto (R$)</Label>
          <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Valor da venda (R$)</Label>
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Frete cobrado (R$)</Label>
          <Input type="number" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0,00" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Custo de envio (R$)</Label>
          <Input type="number" step="0.01" value={envio} onChange={(e) => setEnvio(e.target.value)} placeholder="0,00" />
        </div>
      </div>

      <div className="grid gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Total da Venda</Label>
            <div className="text-lg font-bold text-blue-900">{formatBRL(totalVenda)}</div>
            {numParcelas > 1 && (
              <div className="text-[10px] text-muted-foreground">{numParcelas}x de {formatBRL(valorParcela)}</div>
            )}
          </div>

          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Lucro LÃ­quido</Label>
            <div className={`text-lg font-bold ${lucroBruto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatBRL(lucroBruto)}
            </div>
            <div className="text-[10px] text-muted-foreground">Margem: {margemPct.toFixed(1)}%</div>
          </div>

          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">ComissÃ£o ({comissaoPct}%)</Label>
            <div className="text-lg font-bold text-amber-600">
              {formatBRL(valorComissao > 0 ? valorComissao : 0)}
            </div>
            <div className="text-[10px] text-muted-foreground">Para: {vendedor}</div>
          </div>

          <div className="flex items-end justify-end">
            <Button disabled={loading || !selectedCliente || !produtoQuery} type="submit" className="w-full h-12 bg-blue-900 hover:bg-blue-800">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Finalizar Venda
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
