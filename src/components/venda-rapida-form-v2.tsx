"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryStates, parseAsString, parseAsFloat, parseAsBoolean, parseAsJson } from "nuqs";
import {
  FORMA_PAGAMENTO,
  FORMAS_PAGAMENTO_LIST,
  formaPagamentoLabel,
  type FormaPagamento,
} from "@/lib/forma-pagamento";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  User,
  Calendar,
  ShoppingCart,
  Plus,
  CreditCard,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { formatBRL, cn } from "@/lib/utils";
import { valorEmReais } from "@/lib/fidelidade";
import { sugerirParcelasDescontoEmFolha } from "@/lib/parcelas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProdutoItemForm } from "@/components/produto-item-form";
import { ParcelasVencimentoForm } from "@/components/parcelas-vencimento-form";
import { Checkbox } from "@/components/ui/checkbox";
import { BFXIntelligencePanel } from "@/components/bfx-intelligence-panel";
import { LinkAssinaturaButton } from "@/components/link-assinatura-button";
import { CurrencyInput } from "@/components/currency-input";
import { Badge } from "@/components/ui/badge";
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

type ClienteSelected = {
  id: number;
  nome: string;
  endereco?: string | null;
  cep?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
};

const DEFAULT_PRODUTO_ITEM: ProdutoItem = {
  id: "new-0",
  produtoNome: "",
  custoProduto: 0,
  valorVenda: 0,
  quantidade: 1,
  subtotal: 0,
};

interface Props {
  vendedorOptions: { value: string; label: string; comissaoPct: number }[];
  parcelasOptions: { value: string; label: string }[];
  fornecedores: { id: number; nome: string }[];
  categoriasExistentes: string[];
  onSubmit: (
    formData: FormData,
  ) => Promise<ActionResponse<{ vendaId: number; boletoUrl?: string; assinaturaToken?: string }>>;
}

export default function VendaRapidaFormV2({
  vendedorOptions,
  parcelasOptions,
  fornecedores,
  categoriasExistentes,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    data?: boolean;
    vendedor?: boolean;
    cliente?: boolean;
    produtoIndices?: number[];
  }>({});

  // Form states persistentes na URL (sobrevivem a refresh/navegação)
  const [formState, setFormState] = useQueryStates(
    {
      dataVenda: parseAsString.withDefault(new Date().toISOString().split("T")[0]),
      vendedor: parseAsString.withDefault(vendedorOptions[0]?.value || ""),
      parcelas: parseAsString.withDefault("1"),
      clienteQuery: parseAsString.withDefault(""),
      selectedCliente: parseAsJson<ClienteSelected>((v) => {
        if (typeof v === "object" && v !== null && "id" in v && "nome" in v)
          return v as ClienteSelected;
        return null;
      }),
      produtos: parseAsJson<ProdutoItem[]>((v) => {
        if (Array.isArray(v) && (v as unknown[]).length > 0) return v as ProdutoItem[];
        return null;
      }),
      frete: parseAsFloat.withDefault(0),
      envio: parseAsFloat.withDefault(0),
      temNota: parseAsBoolean.withDefault(false),
      taxaNota: parseAsString.withDefault("5.97"),
      desconto: parseAsFloat.withDefault(0),
      pontosResgatar: parseAsFloat.withDefault(0),
      formaPagamento: parseAsString.withDefault(""),
    },
    { history: "replace" },
  );

  // Desestrutura para compatibilidade com o restante do código
  const { dataVenda, vendedor, parcelas, clienteQuery, selectedCliente,
          frete, envio, temNota, taxaNota, desconto, pontosResgatar } = formState;
  const formaPagamentoSelected = formState.formaPagamento as FormaPagamento | "";
  // Flags legados sao DERIVADOS da forma canonica para manter backwards-compat com o resto do componente.
  const descontoEmFolha = formaPagamentoSelected === FORMA_PAGAMENTO.DESCONTO_FOLHA;
  const boleto = formaPagamentoSelected === FORMA_PAGAMENTO.BOLETO;
  // produtos pode ser null quando não há param na URL → usa o item padrão
  const produtos: ProdutoItem[] = formState.produtos ?? [DEFAULT_PRODUTO_ITEM];

  // Wrappers com assinatura idêntica aos setState originais
  const setDataVenda = (v: string) => void setFormState({ dataVenda: v });
  const setVendedor = (v: string) => void setFormState({ vendedor: v });
  const setParcelas = (v: string) => void setFormState({ parcelas: v });
  const setClienteQuery = (v: string) => void setFormState({ clienteQuery: v });
  const setSelectedCliente = (v: ClienteSelected | null) => void setFormState({ selectedCliente: v ?? null });
  const setProdutos = (v: ProdutoItem[]) => void setFormState({ produtos: v.length > 0 ? v : null });
  const setFrete = (v: number) => void setFormState({ frete: v });
  const setEnvio = (v: number) => void setFormState({ envio: v });
  const setTemNota = (v: boolean) => void setFormState({ temNota: v });
  const setTaxaNota = (v: string) => void setFormState({ taxaNota: v });
  const setDesconto = (v: number) => void setFormState({ desconto: v });
  const setPontosResgatar = (v: number) => void setFormState({ pontosResgatar: v });
  const setFormaPagamento = (v: FormaPagamento | "") => void setFormState({ formaPagamento: v });

  // Cliente autocomplete suggestions (transient — não persiste)
  const [clienteSuggestions, setClienteSuggestions] = useState<
    {
      id: number;
      nome: string;
      cpf?: string;
      cnpj?: string;
      renda?: number | null;
      endereco?: string | null;
      cep?: string | null;
      telefone?: string | null;
      ultimaVenda?: { data: string; valor: number } | null;
    }[]
  >([]);

  // Parcelas com datas
  const [parcelasVencimento, setParcelasVencimento] = useState<Parcela[]>([]);

  // Uber Direct
  const [uberEnabled, setUberEnabled] = useState(false);
  const [uberPickupAddress, setUberPickupAddress] = useState<{
    street_address: string[];
    city: string;
    state: string;
    zip_code: string;
    country: string;
  } | null>(null);
  const [uberQuoteLoading, setUberQuoteLoading] = useState(false);

  // Produto selecionado para sugestões de upsell/cross-sell
  const [produtoParaSugestoes, setProdutoParaSugestoes] = useState<{
    id: number;
    nome: string;
    valorVenda?: number;
  } | null>(null);

  // Exibir link de assinatura imediatamente após venda com desconto em folha
  const [successAssinaturaToken, setSuccessAssinaturaToken] = useState<string | null>(null);

  // Limite e margem disponível do cliente
  const [limiteData, setLimiteData] = useState<{
    margemTotal: number;
    comprometimentoAtual: number;
    margemDisponivel: number;
    tetoParcelaMax: number;
  } | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const submitLockRef = useRef(false);

  // Limpar erro do campo ao editar
  const selectedClienteId = selectedCliente?.id ?? null;
  const produtosKey = produtos.map((p) => `${p.id}:${p.produtoNome}:${p.quantidade}:${p.valorVenda}`).join("|");
  useEffect(() => {
    setValidationErrors((prev) => {
      const hasClienteOk = selectedClienteId != null;
      const dataOk = !!dataVenda;
      const vendedorOk = !!(vendedor?.trim());
      const nextData = dataOk && prev.data ? false : prev.data;
      const nextVendedor = vendedorOk && prev.vendedor ? false : prev.vendedor;
      const nextCliente = hasClienteOk && prev.cliente ? false : prev.cliente;
      const nextProdutoIndices = prev.produtoIndices?.length
        ? (() => {
            const stillInvalid = prev.produtoIndices.filter((i) => {
              const p = produtos[i];
              if (!p) return false;
              return !(p.produtoNome?.trim() && p.custoProduto >= 0 && p.valorVenda >= 0 && p.quantidade >= 1);
            });
            return stillInvalid.length > 0 ? stillInvalid : undefined;
          })()
        : prev.produtoIndices;
      if (nextData === prev.data && nextVendedor === prev.vendedor && nextCliente === prev.cliente && nextProdutoIndices === prev.produtoIndices) {
        return prev;
      }
      return { ...prev, data: nextData, vendedor: nextVendedor, cliente: nextCliente, produtoIndices: nextProdutoIndices };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVenda, vendedor, selectedClienteId, produtosKey]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteQuery, selectedClienteId]);

  // Uber Direct status
  useEffect(() => {
    fetch("/api/frete/uber/status")
      .then((r) => r.json())
      .then((data) => {
        setUberEnabled(!!data?.enabled);
        setUberPickupAddress(data?.pickupAddress ?? null);
      })
      .catch(() => setUberEnabled(false));
  }, []);

  // Consulta de Limite ao selecionar cliente
  useEffect(() => {
    if (selectedCliente) {
      fetch(`/api/clientes/${selectedCliente.id}/limite`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.margemTotal !== undefined) setLimiteData(data);
          else setLimiteData(null);
        })
        .catch(() => setLimiteData(null));
    } else {
      setLimiteData(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClienteId]);

  // Cálculos totais
  const subtotalProdutos = produtos.reduce((sum, p) => sum + p.subtotal, 0);
  const numFrete = frete;
  const numEnvio = envio;
  const numTaxaNota = Number(taxaNota) || 0;
  const numParcelas = Number(parcelas) || 1;

  const descontoPontos = valorEmReais(pontosResgatar);
  const totalVenda = subtotalProdutos + numFrete - desconto - descontoPontos;
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

  const valorParcela = numParcelas > 0 ? totalVenda / numParcelas : 0;
  const excedeuMargem = limiteData
    ? valorParcela > limiteData.margemDisponivel + 1
    : false;

  // Sugestão automática de parcelas (apenas desconto em folha)
  useEffect(() => {
    if (descontoEmFolha && totalVenda > 0) {
      const sugerido = sugerirParcelasDescontoEmFolha(totalVenda);
      setParcelas(String(sugerido));
    }
  }, [descontoEmFolha, totalVenda]);

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

  const cotarFreteUber = async () => {
    if (!selectedCliente) {
      toast.error("Selecione um cliente para cotar o frete.");
      return;
    }
    if (!selectedCliente.endereco?.trim()) {
      toast.error("Cliente sem endereço cadastrado. Cadastre o endereço do cliente.");
      return;
    }
    if (!uberEnabled || !uberPickupAddress) {
      toast.error("Uber Direct não configurado. Configure UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_TOKEN e UBER_PICKUP_ADDRESS_JSON no servidor.");
      return;
    }
    const orderValue = produtos.reduce((s, p) => s + p.subtotal, 0);
    if (orderValue <= 0) {
      toast.error("Adicione ao menos um produto para cotar.");
      return;
    }

    setUberQuoteLoading(true);
    try {
      const zip = (selectedCliente.cep || "").replace(/\D/g, "").slice(0, 8) || "00000000";
      let city = "";
      let state = "";
      if (zip.length === 8) {
        try {
          const viaCep = await fetch(`https://viacep.com.br/ws/${zip}/json/`).then((r) => r.json());
          if (viaCep?.localidade) city = viaCep.localidade;
          if (viaCep?.uf) state = viaCep.uf;
        } catch {
          /* fallback sem cidade/estado */
        }
      }
      const dropoffAddress = {
        street_address: [selectedCliente.endereco!.trim()],
        city: city || "São Paulo",
        state: state || "SP",
        zip_code: zip,
        country: "BR",
      };
      const res = await fetch("/api/frete/uber/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: uberPickupAddress,
          dropoffAddress,
          pickupPhone: undefined,
          dropoffPhone: selectedCliente.telefone || undefined,
          orderValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Erro ao obter cotação Uber.");
        return;
      }
      setFrete(data.fee ?? 0);
      toast.success(`Frete Uber: R$ ${(data.fee ?? 0).toFixed(2)} (${data.duration ?? "?"} min)`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cotar frete Uber.");
    } finally {
      setUberQuoteLoading(false);
    }
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

    // Atualiza o produto para sugestões quando um produto é selecionado
    if (item.produtoNome && !produtoParaSugestoes) {
      // Busca o ID do produto pelo nome
      fetch(`/api/vendas/autocomplete/produtos?q=${encodeURIComponent(item.produtoNome)}`)
        .then(res => res.json())
        .then(data => {
          const produtoEncontrado = data?.find((p: { nome: string }) => 
            p.nome.toLowerCase() === item.produtoNome.toLowerCase()
          );
          if (produtoEncontrado) {
            setProdutoParaSugestoes({
              id: produtoEncontrado.id,
              nome: produtoEncontrado.nome,
              valorVenda: produtoEncontrado.valorVenda,
            });
          }
        })
        .catch(err => console.error("Erro ao buscar produto:", err));
    }
  };

  // Adiciona produto sugerido pela IA
  const addProdutoSugerido = (produto: { id: number; nome: string; valorVenda: number; custoProduto?: number }) => {
    // Busca o custo do produto se não foi fornecido
    fetch(`/api/vendas/autocomplete/produtos?q=${encodeURIComponent(produto.nome)}`)
      .then(res => res.json())
      .then(data => {
        const produtoCompleto = data?.find((p: { id: number }) => p.id === produto.id);
        const custoProduto = produto.custoProduto || produtoCompleto?.custoPadrao || 0;

        // Verifica se o primeiro item está vazio para preencher ou adicionar novo
        const primeiroVazio = produtos.findIndex(p => !p.produtoNome);

        if (primeiroVazio !== -1) {
          // Preenche o item vazio
          const newProdutos = [...produtos];
          newProdutos[primeiroVazio] = {
            id: crypto.randomUUID(),
            produtoNome: produto.nome,
            custoProduto,
            valorVenda: produto.valorVenda,
            quantidade: 1,
            subtotal: produto.valorVenda,
          };
          setProdutos(newProdutos);
        } else {
          // Adiciona novo item
          setProdutos([
            ...produtos,
            {
              id: crypto.randomUUID(),
              produtoNome: produto.nome,
              custoProduto,
              valorVenda: produto.valorVenda,
              quantidade: 1,
              subtotal: produto.valorVenda,
            },
          ]);
        }

        // Atualiza produto para sugestões
        setProdutoParaSugestoes({
          id: produto.id,
          nome: produto.nome,
          valorVenda: produto.valorVenda,
        });

        toast.success(`${produto.nome} adicionado!`);
      })
      .catch(err => {
        console.error("Erro ao adicionar produto:", err);
        toast.error("Erro ao adicionar produto");
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitLockRef.current) return;
    submitLockRef.current = true;

    const errors: typeof validationErrors = {};
    const msgs: string[] = [];

    if (!dataVenda || isNaN(new Date(dataVenda).getTime())) {
      errors.data = true;
      msgs.push("Data da venda");
    }
    if (!vendedor?.trim()) {
      errors.vendedor = true;
      msgs.push("Vendedor");
    }
    if (!selectedCliente) {
      errors.cliente = true;
      msgs.push("Cliente");
    }

    const produtosFiltrados = produtos.filter((p) => p.produtoNome?.trim());
    if (produtosFiltrados.length === 0) {
      setValidationErrors((prev) => ({ ...prev, produtoIndices: produtos.map((_, i) => i) }));
      toast.error("Adicione pelo menos um produto à venda.");
      submitLockRef.current = false;
      return;
    }

    const produtoIndices: number[] = [];
    produtosFiltrados.forEach((p, i) => {
      const custoInvalido = p.custoProduto < 0;
      const valorInvalido = p.valorVenda < 0;
      const qtdInvalida = p.quantidade < 1;
      if (custoInvalido || valorInvalido || qtdInvalida) {
        const idxOriginal = produtos.findIndex((x) => x.id === p.id);
        if (idxOriginal >= 0) produtoIndices.push(idxOriginal);
        msgs.push(`Produto #${i + 1} (preencha valores corretamente)`);
      }
    });
    if (produtoIndices.length) errors.produtoIndices = produtoIndices;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Preencha os campos obrigatórios: " + msgs.join(", "));
      submitLockRef.current = false;
      return;
    }

    setValidationErrors({});
    setLoading(true);

    const subtotalFiltrado = produtosFiltrados.reduce((s, p) => s + p.subtotal, 0);
    const totalFiltrado = subtotalFiltrado + numFrete;
    const valorParcelaFiltrado = numParcelas > 0 ? totalFiltrado / numParcelas : 0;
    const excedeuLimite = limiteData && valorParcelaFiltrado > limiteData.margemDisponivel + 1 ? 1 : 0;

    const formData = new FormData();
    formData.append("data", dataVenda);
    formData.append("vendedor", vendedor);
    formData.append("clienteId", selectedCliente!.id.toString());
    formData.append("frete", String(frete));
    formData.append("envio", String(envio));
    formData.append("parcelas", parcelas);
    formData.append("temNota", String(temNota));
    formData.append("taxaNota", taxaNota);
    formData.append("desconto", String(desconto));
    formData.append("pontosResgatar", String(pontosResgatar));
    formData.append("descontoEmFolha", String(descontoEmFolha));
    formData.append("boleto", String(boleto));
    if (formaPagamentoSelected) formData.append("formaPagamento", formaPagamentoSelected);
    formData.append("excedeuLimite", String(excedeuLimite));
    formData.append("produtos", JSON.stringify(produtosFiltrados));

    if (numParcelas > 1 && parcelasVencimento.length > 0) {
      formData.append("parcelasVencimento", JSON.stringify(parcelasVencimento));
    }

    setSuccessAssinaturaToken(null); // Limpa card anterior ao submeter nova venda
    try {
      const result = await onSubmit(formData);
      if (result.success) {
        // Reset form — null remove o param da URL e reverte ao default
        void setFormState({
          clienteQuery: null,
          selectedCliente: null,
          produtos: null,
          frete: null,
          envio: null,
          parcelas: null,
          temNota: null,
          desconto: null,
          formaPagamento: null,
        });
        setParcelasVencimento([]);
        setProdutoParaSugestoes(null);
        const boletoUrl = result.data?.boletoUrl;
        const assinaturaToken = result.data?.assinaturaToken;
        if (assinaturaToken) setSuccessAssinaturaToken(assinaturaToken);
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const assinaturaLink = assinaturaToken ? `${baseUrl}/assinatura/${assinaturaToken}` : null;
        toast.success(result.message || "Venda realizada com sucesso!", {
          ...((boletoUrl || assinaturaLink) && {
            action: {
              label: boletoUrl ? "Abrir boleto" : "Copiar link assinatura",
              onClick: () => {
                if (boletoUrl) window.open(boletoUrl, "_blank");
                else if (assinaturaLink) {
                  navigator.clipboard.writeText(assinaturaLink);
                  toast.success("Link copiado! Envie ao cliente para assinar.");
                }
              },
            },
          }),
        });
      } else {
        toast.error(result.error || "Erro ao finalizar venda.");
      }
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      toast.error("Erro ao finalizar venda. Tente novamente.");
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successAssinaturaToken && (
        <Card className="border-success/30 bg-success/5 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Venda registrada! Envie o link ao cliente para assinar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O cliente acessa o link, visualiza o documento e assina na tela.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <LinkAssinaturaButton
                  token={successAssinaturaToken}
                  status="pendente"
                  label="Copiar link"
                  showQr
                />
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Segue o link para assinar sua autorização: ${typeof window !== "undefined" ? window.location.origin : ""}/assinatura/${successAssinaturaToken}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "success", size: "sm" }), "text-xs font-bold uppercase")}
                >
                  Enviar WhatsApp
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção 1: Contexto da Venda */}
      <Card
        variant="elevated"
        className={cn(
          "border-primary/20 transition-colors",
          (validationErrors.data || validationErrors.vendedor) && "border-destructive border-2",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Contexto da Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  validationErrors.data ? "text-destructive" : "text-muted-foreground",
                )}
              >
                Data da Venda <span className="text-destructive">*</span> {validationErrors.data && "(obrigatório)"}
              </Label>
              <DateInput
                value={dataVenda}
                onChange={(v) => setDataVenda(v)}
                required
                className={validationErrors.data ? "border-destructive border-2" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  validationErrors.vendedor ? "text-destructive" : "text-muted-foreground",
                )}
              >
                Vendedor Responsável <span className="text-destructive">*</span> {validationErrors.vendedor && "(obrigatório)"}
              </Label>
              <FormSelect
                name="vendedor"
                options={vendedorOptions}
                value={vendedor}
                onValueChange={setVendedor}
                placeholder="Selecione o vendedor"
                className={validationErrors.vendedor ? "border-destructive [&_button]:border-destructive [&_button]:border-2" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Cliente */}
      <Card
        variant="elevated"
        className={cn(
          "border-info/20 transition-colors overflow-visible",
          clienteSuggestions.length > 0 && "relative z-[100]",
          validationErrors.cliente && "border-destructive border-2",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-info" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="relative">
            <Label
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                validationErrors.cliente ? "text-destructive" : "text-muted-foreground",
              )}
            >
              Buscar Cliente <span className="text-destructive">*</span> {validationErrors.cliente && "(obrigatório)"}
            </Label>
            <Input
              value={clienteQuery}
              onChange={(e) => setClienteQuery(e.target.value)}
              placeholder="Digite o nome do cliente"
              required
              className={cn("min-h-[44px] touch-manipulation", validationErrors.cliente ? "border-destructive border-2" : "")}
            />
            {clienteSuggestions.length > 0 && (
              <div role="listbox" className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {clienteSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      void setFormState({
                        selectedCliente: {
                          id: c.id,
                          nome: c.nome,
                          endereco: c.endereco,
                          cep: c.cep,
                          telefone: c.telefone,
                          cpf: c.cpf,
                          cnpj: c.cnpj,
                        },
                        clienteQuery: c.nome,
                      });
                      setClienteSuggestions([]);
                      setProdutoParaSugestoes(null);
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors cursor-pointer text-sm border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{c.nome}</div>
                      {c.renda && c.renda > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 dark:bg-success/20 text-success font-medium">
                          Renda: {formatBRL(c.renda)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {c.cpf || c.cnpj || "Sem documento"}
                      </span>
                      {c.ultimaVenda && (
                        <span className="text-[10px] text-muted-foreground">
                          Última: {formatBRL(c.ultimaVenda.valor)} em {c.ultimaVenda.data.split("-").reverse().join("/")}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção 2.5: Painel de Inteligência BFX */}
      {selectedCliente && (
        <BFXIntelligencePanel
          clienteId={selectedCliente.id}
          produtoSelecionado={produtoParaSugestoes}
          onAddProduto={addProdutoSugerido}
        />
      )}

      {/* Seção 2.6: Limite e Margem Disponível */}
      {selectedCliente && limiteData && (
        <Card
          className={cn(
            "border-2 transition-colors",
            excedeuMargem
              ? "bg-warning/10 border-warning/30"
              : "bg-success/10 border-success/30"
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Limite e Margem
              </span>
              {excedeuMargem && (
                <Badge variant="secondary" className="bg-warning/20 text-warning-foreground dark:text-warning">
                  Excede disponível
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Limite</div>
                <div className="text-sm font-bold text-foreground">{formatBRL(limiteData.margemTotal)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Comprometido</div>
                <div className="text-sm font-bold text-foreground">{formatBRL(limiteData.comprometimentoAtual)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Disponível</div>
                <div
                  className={cn(
                    "text-sm font-bold",
                    limiteData.margemDisponivel > 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatBRL(limiteData.margemDisponivel)}
                </div>
              </div>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", excedeuMargem ? "bg-warning" : "bg-success")}
                style={{
                  width: `${Math.min(100, limiteData.margemTotal > 0 ? (limiteData.comprometimentoAtual / limiteData.margemTotal) * 100 : 0)}%`,
                }}
              />
            </div>
            {excedeuMargem && (
              <div className="flex items-start gap-2 text-xs text-warning-foreground dark:text-warning bg-warning/10 dark:bg-warning/20 p-3 rounded-lg border border-warning/30">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Parcela ({formatBRL(valorParcela)}) excede o valor disponível ({formatBRL(limiteData.margemDisponivel)}).
                  A venda será registrada com indicação de excedeu limite.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            leftIcon={<Plus className="h-4 w-4" />}
          >
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
            hasError={validationErrors.produtoIndices?.includes(index)}
            fornecedores={fornecedores}
            categoriasExistentes={categoriasExistentes}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Frete (Cobrado)
              </Label>
              <div className="flex gap-2">
                <CurrencyInput
                  value={frete}
                  onChange={setFrete}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cotarFreteUber}
                  disabled={uberQuoteLoading || !selectedCliente}
                  title={!selectedCliente ? "Selecione um cliente" : "Cotar frete Uber Direct"}
                >
                  {uberQuoteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Uber"
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Envio (Custo)
              </Label>
              <CurrencyInput value={envio} onChange={setEnvio} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Desconto (R$)
              </Label>
              <CurrencyInput value={desconto} onChange={setDesconto} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resgatar pontos
              </Label>
              <input
                type="number"
                min={0}
                step={1}
                value={pontosResgatar || ""}
                onChange={(e) => setPontosResgatar(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                placeholder="0"
                className="h-input w-full rounded-md border-2 border-input bg-background px-3 text-sm"
              />
              {pontosResgatar > 0 && (
                <p className="text-[11px] text-success">
                  Desconto por pontos: -{formatBRL(descontoPontos)} (limitado ao saldo do cliente)
                </p>
              )}
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
          <div className="mt-4 pt-4 border-t space-y-2">
            <Label htmlFor="forma-pagamento" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Forma de pagamento
            </Label>
            <FormSelect
              id="forma-pagamento"
              name="formaPagamento"
              value={formaPagamentoSelected || ""}
              onValueChange={(v) => setFormaPagamento(v as FormaPagamento | "")}
              placeholder="Selecione a forma de pagamento"
              options={[
                { value: "", label: "— Não informado —" },
                ...FORMAS_PAGAMENTO_LIST.map((f) => ({
                  value: f,
                  label: formaPagamentoLabel(f),
                })),
              ]}
            />
            {boleto && selectedCliente && !selectedCliente.cpf && !selectedCliente.cnpj && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground dark:text-warning text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  O cliente &quot;{selectedCliente.nome}&quot; não tem CPF ou CNPJ cadastrado. Cadastre em Cadastros → Clientes para poder gerar boleto no Asaas.
                </span>
              </div>
            )}
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
        dataVenda={dataVenda}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Subtotal</div>
              <div className="text-base font-bold text-foreground">{formatBRL(subtotalProdutos)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Frete</div>
              <div className="text-base font-bold text-foreground">{formatBRL(numFrete)}</div>
            </div>
            <div className="rounded-lg bg-primary/5 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Venda</div>
              <div className="text-lg font-black text-primary">{formatBRL(totalVenda)}</div>
            </div>
            <div className="rounded-lg bg-info/5 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Parcela</div>
              <div className="text-base font-bold text-info">{formatBRL(totalVenda / numParcelas)}</div>
            </div>
          </div>

          {desconto > 0 && (
            <div className="text-sm text-destructive font-medium">Desconto: -{formatBRL(desconto)}</div>
          )}

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Custo Total</div>
              <div className="text-base font-bold text-foreground">{formatBRL(custoTotal)}</div>
            </div>
            <div className="rounded-lg bg-success/5 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lucro Bruto</div>
              <div className="text-base font-bold text-success">{formatBRL(lucroBruto)}</div>
            </div>
            <div className="rounded-lg bg-success/5 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</div>
              <div className="text-base font-bold text-success">{margemPct.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-warning/5 px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Comissao ({comissaoPct}%)</div>
              <div className="text-base font-bold text-warning">{formatBRL(valorComissao)}</div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="px-12 text-base font-bold"
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
        </CardContent>
      </Card>
    </form>
  );
}
