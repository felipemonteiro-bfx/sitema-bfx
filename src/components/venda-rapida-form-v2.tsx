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
import { lerListaDaResposta, MENSAGEM_SESSAO_EXPIRADA } from "@/lib/resposta-autenticada";
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
import { erroCustoEnvio } from "@/lib/validations/venda";
import { valorEmReais } from "@/lib/fidelidade";
import { sugerirParcelasDescontoEmFolha } from "@/lib/parcelas";
import { useRouter } from "next/navigation";
import { mensagemFalhaUber, type MotivoFalhaUber } from "@/lib/uber-quote-result";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProdutoItemForm } from "@/components/produto-item-form";
import { ParcelasVencimentoForm } from "@/components/parcelas-vencimento-form";
import { DataDescontoUnica } from "@/components/data-desconto-unica";
import { dataDaRegraIso, dataDescontoEfetiva } from "@/lib/data-desconto-unica";
import { parseDataIsoUtc } from "@/lib/data-input";
import { Checkbox } from "@/components/ui/checkbox";
import { BFXIntelligencePanel } from "@/components/bfx-intelligence-panel";
import { LinkAssinaturaButton } from "@/components/link-assinatura-button";
import { CurrencyInput } from "@/components/currency-input";
import { Badge } from "@/components/ui/badge";
import { CadastrarClienteRapidoDialog } from "@/components/cadastrar-cliente-rapido-dialog";
import { ResumoVendaPanel } from "@/components/resumo-venda-panel";
import { parcelasParaSimulacao, simularMargemVenda } from "@/lib/simular-margem-venda";
import type { ActionResponse } from "@/lib/action-response";
import {
  decidirConfirmacaoConsignado,
  estadoCardLimite,
  type LimiteClientePayload,
} from "@/lib/consignado-venda";
import { formatarPctConsignado, ROTULO_FAIXA_CONSIGNADO } from "@/lib/consignado";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

/** Item devolvido por GET /api/vendas/autocomplete/clientes. */
type ClienteSugestao = {
  id: number;
  nome: string;
  cpf?: string | null;
  cnpj?: string | null;
  renda?: number | null;
  endereco?: string | null;
  cep?: string | null;
  telefone?: string | null;
  ultimaVenda?: { data: string; valor: number } | null;
};

/** Item devolvido por GET /api/vendas/autocomplete/produtos. */
type ProdutoAutocomplete = {
  id: number;
  nome: string;
  /** `Float?` no schema — a rota faz `select`, entao chega `null` para produto sem preco. */
  valorVenda: number | null;
  custoPadrao?: number | null;
  marca?: string | null;
  qtdEstoque?: number | null;
};

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    data?: boolean;
    vendedor?: boolean;
    cliente?: boolean;
    envio?: boolean;
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
  const [clienteSuggestions, setClienteSuggestions] = useState<ClienteSugestao[]>([]);
  // Modal de cadastro rapido de cliente pelo PDV (D-04, D-07, PDV-15)
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);

  // Parcelas com datas
  const [parcelasVencimento, setParcelasVencimento] = useState<Parcela[]>([]);
  // Data do desconto em 1x em folha (2026-10-01): `null` acompanha a regra da empresa.
  const [dataDescontoEscolhida, setDataDescontoEscolhida] = useState<string | null>(null);

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
  const [uberMotivo, setUberMotivo] = useState<MotivoFalhaUber | null>(null);
  const [uberMensagem, setUberMensagem] = useState<string>(mensagemFalhaUber("sem_credencial"));

  // Produto selecionado para sugestões de upsell/cross-sell
  const [produtoParaSugestoes, setProdutoParaSugestoes] = useState<{
    id: number;
    nome: string;
    valorVenda?: number;
  } | null>(null);

  // Exibir link de assinatura imediatamente após venda com desconto em folha
  const [successAssinaturaToken, setSuccessAssinaturaToken] = useState<string | null>(null);

  // Limite e margem disponível do cliente
  const [limiteData, setLimiteData] = useState<LimiteClientePayload | null>(null);
  const [confirmConsignadoOpen, setConfirmConsignadoOpen] = useState(false);
  const confirmouConsignadoRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const submitLockRef = useRef(false);
  // O JWT de sessao dura 7 dias e nao renova, e o middleware so cobre `/api/*`: quando ele
  // expira a tela continua de pe e so as chamadas de API morrem com 401. Antes de 2026-08-18
  // isso era invisivel — o corpo do erro entrava no lugar da lista e o vendedor simplesmente
  // nao conseguia mais selecionar cliente. Agora ele e avisado, uma vez so (o autocomplete
  // dispara a cada tecla; um toast por tecla seria pior que o silencio).
  const sessaoExpiradaAvisadaRef = useRef(false);
  const avisarSessaoExpirada = (mensagem?: string) => {
    if (sessaoExpiradaAvisadaRef.current) return;
    sessaoExpiradaAvisadaRef.current = true;
    // Sem botao "Entrar": o rascunho da venda (cliente, produtos, parcelas) vive na query
    // string via nuqs, e navegar para /login apagaria tudo — o login volta fixo para
    // /dashboard, sem `next`. Abrir a aba de login e escolha do vendedor.
    toast.error(mensagem ?? MENSAGEM_SESSAO_EXPIRADA, { duration: 10000 });
  };

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
        const leitura = await lerListaDaResposta<ClienteSugestao>(res);
        setClienteSuggestions(leitura.lista);
        if (leitura.sessaoExpirada) avisarSessaoExpirada(leitura.mensagem);
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
        setUberMotivo(data?.motivo ?? null);
        setUberMensagem(data?.mensagem || mensagemFalhaUber("sem_credencial"));
      })
      .catch(() => {
        setUberEnabled(false);
        setUberMotivo("sem_credencial");
        setUberMensagem(mensagemFalhaUber("sem_credencial"));
      });
  }, []);

  // Consulta de Limite ao selecionar cliente e ao mudar a data da venda: a regra de vencimento
  // que vem no payload é a vigente na data da venda, não a de hoje.
  const clienteDoLimiteRef = useRef<number | null>(null);
  useEffect(() => {
    // Sem isto, durante o fetch a tela (e a regra de vencimento das parcelas) seguia com o
    // limite do cliente anterior. Mudar só a data mantém o limite do mesmo cliente na tela até a
    // resposta chegar. `ativo` descarta a resposta que chega depois de trocar de novo.
    const clienteAtual = selectedCliente?.id ?? null;
    if (clienteDoLimiteRef.current !== clienteAtual) {
      clienteDoLimiteRef.current = clienteAtual;
      setLimiteData(null);
    }
    let ativo = true;
    if (selectedCliente) {
      const dataQs = parseDataIsoUtc(dataVenda) ? `?data=${encodeURIComponent(dataVenda)}` : "";
      fetch(`/api/clientes/${selectedCliente.id}/limite${dataQs}`)
        .then(async (res) => {
          // Endpoint autenticado: em 401 o corpo e `{error:...}`, que antes so virava
          // `setLimiteData(null)` — o vendedor perdia o limite de credito da tela sem
          // nenhuma explicacao. Nao passa por `lerListaDaResposta` porque devolve objeto.
          if (res.status === 401) {
            avisarSessaoExpirada();
            return null;
          }
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (!ativo) return;
          if (data?.margemTotal !== undefined) setLimiteData(data);
          else setLimiteData(null);
        })
        .catch(() => {
          if (ativo) setLimiteData(null);
        });
    }
    return () => {
      ativo = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClienteId, dataVenda]);

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

  // Parcela com desconto manual e de pontos, como o servidor grava. O card e a
  // confirmação no submit usam esta mesma conta; com contas diferentes o diálogo de
  // 30% abria para uma venda que o card mostrava abaixo do limite.
  const parcelaDe = (subtotal: number) =>
    numParcelas > 0 ? (subtotal + numFrete - desconto - descontoPontos) / numParcelas : 0;
  const valorParcela = parcelaDe(subtotalProdutos);
  // Tom e números do card saem de uma função só: em folha sem renda não há trava,
  // e o vermelho só aparece quando o diálogo de confirmação também vai aparecer.
  const cardLimite = limiteData
    ? estadoCardLimite({ descontoEmFolha, limite: limiteData, valorParcela })
    : null;

  // Data do desconto da venda 1x em folha (2026-10-01): a da regra da empresa, ou a escolhida.
  // A simulação abaixo usa a data efetiva; o FormData só leva a escolhida à mão — sem escolha, o
  // servidor calcula pela regra da empresa que ele mesmo lê (a do navegador pode estar velha).
  const dataDescontoRegra = dataDaRegraIso(dataVenda, limiteData?.regraVencimento);
  // Só com a regra da empresa já carregada: antes dela o campo mostraria a regra padrão como se
  // fosse a da empresa. Sem o campo, o servidor usa a própria regra.
  const mostrarDataDesconto =
    numParcelas === 1 && descontoEmFolha && dataDescontoRegra !== null && limiteData?.regraVencimento != null;
  const dataDescontoUnica = mostrarDataDesconto
    ? dataDescontoEfetiva(dataDescontoEscolhida, dataDescontoRegra)
    : null;

  // Resumo da venda (spec 2026-09-30 §7): só simulação, nada disto vai no FormData.
  const simulacao = simularMargemVenda({
    dataVenda,
    formaPagamento: formaPagamentoSelected || null,
    subtotalProdutos,
    custoProdutos: produtos.reduce((sum, p) => sum + p.custoProduto * p.quantidade, 0),
    frete: numFrete,
    envio: numEnvio,
    desconto: desconto + descontoPontos,
    temNota,
    taxaNotaPct: numTaxaNota,
    comissaoPct,
    parcelas: parcelasParaSimulacao({
      numParcelas,
      informadas: parcelasVencimento,
      emFolha: descontoEmFolha,
      dataVenda,
      total: totalVenda,
      regra: limiteData?.regraVencimento,
      dataDescontoUnica,
    }),
    numParcelas,
    repassePct: limiteData?.repassePct ?? null,
    disponivelAntes: cardLimite?.disponivel ?? null,
  });

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
      toast.error(uberMensagem);
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
        toast.error(data?.mensagem || data?.error || "Erro ao obter cotação Uber.");
        return;
      }
      setFrete(data.fee ?? 0);
      toast.success(
        <span>
          Frete Uber: <span className="valor-sensivel">R$ {(data.fee ?? 0).toFixed(2)}</span> ({data.duration ?? "?"} min)
        </span>
      );
    } catch (err) {
      console.error(err);
      toast.error(mensagemFalhaUber("erro_upstream"));
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
        .then((res) => lerListaDaResposta<ProdutoAutocomplete>(res))
        .then(leitura => {
          if (leitura.sessaoExpirada) avisarSessaoExpirada(leitura.mensagem);
          const produtoEncontrado = leitura.lista.find((p) => 
            p.nome.toLowerCase() === item.produtoNome.toLowerCase()
          );
          if (produtoEncontrado) {
            setProdutoParaSugestoes({
              id: produtoEncontrado.id,
              nome: produtoEncontrado.nome,
              valorVenda: produtoEncontrado.valorVenda ?? undefined,
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
      .then((res) => lerListaDaResposta<ProdutoAutocomplete>(res))
      .then(leitura => {
        if (!leitura.ok) {
          if (leitura.sessaoExpirada) avisarSessaoExpirada(leitura.mensagem);
          else toast.error("Erro ao adicionar produto");
          return;
        }
        const produtoCompleto = leitura.lista.find((p) => p.id === produto.id);
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

    if (erroCustoEnvio(frete, envio)) {
      errors.envio = true;
      msgs.push("Envio (custo real, pois há frete cobrado)");
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
      // Valor de venda precisa ser > 0 — impede venda registrada com R$ 0,00.
      const valorInvalido = p.valorVenda <= 0;
      const qtdInvalida = p.quantidade < 1;
      if (custoInvalido || valorInvalido || qtdInvalida) {
        const idxOriginal = produtos.findIndex((x) => x.id === p.id);
        if (idxOriginal >= 0) produtoIndices.push(idxOriginal);
        msgs.push(`Produto #${i + 1} (informe o valor de venda)`);
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
    const valorParcelaFiltrado = parcelaDe(subtotalFiltrado);
    const tomFiltrado = limiteData
      ? estadoCardLimite({ descontoEmFolha, limite: limiteData, valorParcela: valorParcelaFiltrado }).tom
      : null;
    const excedeuLimite = tomFiltrado === "limite" || tomFiltrado === "excede" ? 1 : 0;

    if (descontoEmFolha && limiteData) {
      const decisao = decidirConfirmacaoConsignado({
        formaPagamento: formaPagamentoSelected || FORMA_PAGAMENTO.DESCONTO_FOLHA,
        descontoEmFolha: true,
        renda: limiteData.renda || null,
        tomadoAtual: (limiteData.tomadoConsignado ?? 0) + (limiteData.tomadoFolhaBfx ?? 0),
        valorParcelaNova: valorParcelaFiltrado,
        confirmouLimiteConsignado: confirmouConsignadoRef.current,
      });
      if (!decisao.ok) {
        setLoading(false);
        submitLockRef.current = false;
        setConfirmConsignadoOpen(true);
        return;
      }
    }

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
    formData.append("confirmouLimiteConsignado", confirmouConsignadoRef.current ? "1" : "0");
    formData.append("produtos", JSON.stringify(produtosFiltrados));

    if (numParcelas > 1 && parcelasVencimento.length > 0) {
      formData.append("parcelasVencimento", JSON.stringify(parcelasVencimento));
    }
    if (mostrarDataDesconto && dataDescontoEscolhida !== null) formData.append("dataDescontoUnica", dataDescontoEscolhida);

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
        setDataDescontoEscolhida(null);
        setProdutoParaSugestoes(null);
        confirmouConsignadoRef.current = false;
        // O estoque caiu com a venda: sem refresh a proxima venda na mesma tela
        // ainda enxerga a quantidade antiga.
        router.refresh();
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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
          <CardTitle className="flex items-center gap-2">
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
                  validationErrors.data ? "text-error-text" : "text-muted-foreground",
                )}
              >
                Data da Venda <span className="text-error-text">*</span> {validationErrors.data && "(obrigatório)"}
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
                  validationErrors.vendedor ? "text-error-text" : "text-muted-foreground",
                )}
              >
                Vendedor Responsável <span className="text-error-text">*</span> {validationErrors.vendedor && "(obrigatório)"}
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
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-info-text" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="relative">
            {/* `mb-2`: esta linha e o <Input> abaixo sao irmaos diretos, e sem
                isto o campo de cliente era o UNICO da tela colado no rotulo —
                todos os outros vivem dentro de um `space-y-2`. */}
            <div className="mb-2 flex items-center justify-between gap-2">
              {/* `htmlFor`: o campo mais importante da tela era o que nao tinha
                  nome acessivel — rotulo sem `for`, <Input> sem `id` nem
                  `aria-label`. O clique no rotulo tambem nao levava o foco pro
                  campo. Mesma correcao feita nos tres campos do item de produto. */}
              <Label
                htmlFor="cliente-query"
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  validationErrors.cliente ? "text-error-text" : "text-muted-foreground",
                )}
              >
                Buscar Cliente <span className="text-error-text">*</span> {validationErrors.cliente && "(obrigatório)"}
              </Label>
              {/* <Button>, nao <button> com estilo a mao: era o unico botao cru
                  do projeto e nao herdava padding, raio, hover de superficie nem
                  o anel de foco. A dois cliques daqui, "Adicionar Produto" faz a
                  mesma coisa (adicionar um registro) com `outline`+`sm`+icone —
                  duas linguagens para a mesma acao na mesma tela. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClienteDialogOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
                className="shrink-0"
              >
                Cadastrar cliente
              </Button>
            </div>
            <Input
              id="cliente-query"
              value={clienteQuery}
              onChange={(e) => setClienteQuery(e.target.value)}
              placeholder="Digite o nome do cliente"
              required
              className={cn("min-h-[44px] touch-manipulation", validationErrors.cliente ? "border-destructive border-2" : "")}
            />
            {clienteSuggestions.length > 0 && (
              <div role="listbox" className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border rounded-lg shadow-xl dark:shadow-[var(--shadow-lg)] max-h-60 overflow-y-auto">
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
                        <span className="text-xs px-1.5 py-0.5 rounded bg-success/10 dark:bg-success/20 text-success-text font-medium">
                          Renda: <span className="valor-sensivel">{formatBRL(c.renda)}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground valor-sensivel">
                        {c.cpf || c.cnpj || "Sem documento"}
                      </span>
                      {c.ultimaVenda && (
                        <span className="text-xs text-muted-foreground">
                          Última: <span className="valor-sensivel">{formatBRL(c.ultimaVenda.valor)}</span> em {c.ultimaVenda.data.split("-").reverse().join("/")}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <CadastrarClienteRapidoDialog
              open={clienteDialogOpen}
              onOpenChange={setClienteDialogOpen}
              nomeInicial={clienteQuery}
              onCriado={(cliente) => {
                void setFormState({
                  selectedCliente: {
                    id: cliente.id,
                    nome: cliente.nome,
                    endereco: cliente.endereco,
                    cep: cliente.cep,
                    telefone: cliente.telefone,
                    cpf: cliente.cpf,
                    cnpj: cliente.cnpj,
                  },
                  clienteQuery: cliente.nome,
                });
                setClienteSuggestions([]);
              }}
            />
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
      {selectedCliente && limiteData && cardLimite && (
        <Card
          className={cn(
            "border-2 transition-colors",
            cardLimite.tom === "limite"
              ? "bg-error-bg border-error/30"
              : cardLimite.tom === "alerta" || cardLimite.tom === "excede"
                ? "bg-warning/10 border-warning/30"
                : cardLimite.tom === "renda_pendente"
                  ? "bg-muted/40 border-border"
                  : "bg-success/10 border-success/30"
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Limite e Margem
              </span>
              {cardLimite.tom === "alerta" && (
                <Badge variant="warning">{ROTULO_FAIXA_CONSIGNADO.alerta}</Badge>
              )}
              {cardLimite.tom === "limite" && (
                <Badge variant="error">{ROTULO_FAIXA_CONSIGNADO.limite}</Badge>
              )}
              {cardLimite.tom === "renda_pendente" && (
                <Badge variant="outline">{ROTULO_FAIXA_CONSIGNADO.renda_pendente}</Badge>
              )}
              {cardLimite.tom === "excede" && (
                <Badge variant="warning">Excede disponível</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cardLimite.tom === "renda_pendente" && (
              <p className="text-xs text-muted-foreground">
                {descontoEmFolha
                  ? "Renda pendente — % de consignado não calculada. A venda segue sem trava."
                  : "Sem renda cadastrada — limite de crédito não calculado. A venda segue sem trava."}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Limite</div>
                <div className="text-sm font-bold tabular-nums text-foreground valor-sensivel">
                  {cardLimite.limite == null ? "—" : formatBRL(cardLimite.limite)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Comprometido</div>
                <div className="text-sm font-bold tabular-nums text-foreground valor-sensivel">
                  {formatBRL(cardLimite.comprometido)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Disponível</div>
                <div
                  className={cn(
                    "text-sm font-bold tabular-nums valor-sensivel",
                    cardLimite.disponivel == null
                      ? "text-muted-foreground"
                      : cardLimite.disponivel > 0
                        ? "text-success-text"
                        : "text-error-text"
                  )}
                >
                  {cardLimite.disponivel == null ? "—" : formatBRL(cardLimite.disponivel)}
                </div>
              </div>
            </div>
            {cardLimite.pctBarra != null && (
              /* bloco-sensivel: a barra mostra a faixa de comprometimento que os
                 percentuais abaixo ocultam. */
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden bloco-sensivel">
                <div
                  className={cn(
                    "h-full transition-all",
                    cardLimite.tom === "limite"
                      ? "bg-error"
                      : cardLimite.tom === "alerta" || cardLimite.tom === "excede"
                        ? "bg-warning"
                        : "bg-success"
                  )}
                  style={{ width: `${cardLimite.pctBarra}%` }}
                />
              </div>
            )}
            {cardLimite.pctConsignado != null && (
              <p className="text-xs text-center text-muted-foreground">
                Consignado atual:{" "}
                <span className="valor-sensivel">{formatarPctConsignado(cardLimite.pctConsignado)}</span>
                {valorParcela > 0 && cardLimite.pctPosterior != null && (
                  <>
                    {" "}· com esta venda:{" "}
                    <span className="valor-sensivel">{formatarPctConsignado(cardLimite.pctPosterior)}</span>
                  </>
                )}
              </p>
            )}
            {cardLimite.tom === "alerta" && (
              <div className="flex items-start gap-2 text-xs text-warning-text bg-warning-bg p-3 rounded-lg border border-warning/30">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  {valorParcela > 0 ? "Com esta venda o consignado fica em" : "Consignado em"}{" "}
                  <span className="valor-sensivel">{formatarPctConsignado(cardLimite.pctPosterior)}</span> (alerta a partir de 20%).
                </div>
              </div>
            )}
            {cardLimite.tom === "limite" && (
              <div className="flex items-start gap-2 text-xs text-error-text bg-error-bg p-3 rounded-lg border border-error/30">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  {valorParcela > 0 ? "Com esta venda o consignado chega a" : "Consignado em"}{" "}
                  <span className="valor-sensivel">{formatarPctConsignado(cardLimite.pctPosterior)}</span>. A venda só sai se você confirmar.
                </div>
              </div>
            )}
            {cardLimite.tom === "excede" && (
              <div className="flex items-start gap-2 text-xs text-warning-text bg-warning-bg p-3 rounded-lg border border-warning/30">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Parcela (<span className="valor-sensivel">{formatBRL(valorParcela)}</span>) excede o valor disponível (<span className="valor-sensivel">{formatBRL(cardLimite.disponivel ?? 0)}</span>).
                  A venda será registrada com indicação de excedeu limite.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmConsignadoOpen} onOpenChange={setConfirmConsignadoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Com esta venda o cliente chega a 30% ou mais de consignado. Vender mesmo assim?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda em desconto em folha será gravada com indicação de excedeu limite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { confirmouConsignadoRef.current = false; }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmouConsignadoRef.current = true;
                setConfirmConsignadoOpen(false);
                formRef.current?.requestSubmit();
              }}
            >
              Vender mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seção 3: Produtos */}
      <div className="space-y-4">
        {/* `flex-wrap` + `shrink-0`: em 390px o botao "Adicionar Produto" ao
            lado espremia o titulo, que quebrava em duas linhas e ainda
            comprimia o carrinho — medido `h-5 w-5` declarado, 17.69x20.00
            renderizado. Com a linha podendo quebrar, o titulo fica inteiro. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 shrink-0 text-primary" />
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
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-warning-text" />
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
              {!uberEnabled && (
                <p className="text-xs text-muted-foreground">{uberMensagem}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  validationErrors.envio ? "text-error-text" : "text-muted-foreground",
                )}
              >
                Envio (Custo){frete > 0 && <span className="text-error-text"> *</span>}
                {validationErrors.envio && " (obrigatório com frete)"}
              </Label>
              <CurrencyInput
                value={envio}
                onChange={setEnvio}
                className={validationErrors.envio ? "border-destructive border-2" : ""}
              />
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
              <Input
                type="number"
                min={0}
                step={1}
                value={pontosResgatar || ""}
                onChange={(e) => setPontosResgatar(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                placeholder="0"
              />
              {pontosResgatar > 0 && (
                <p className="text-xs text-success-text">
                  Desconto por pontos: <span className="valor-sensivel">-{formatBRL(descontoPontos)}</span> (limitado ao saldo do cliente)
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
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-success-text" />
            Parcelamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-4", mostrarDataDesconto && "sm:grid-cols-2")}>
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
            {/* Só em 1x com desconto em folha: em 2x ou mais as datas ficam no bloco de vencimentos. */}
            {mostrarDataDesconto && (
              <DataDescontoUnica
                id="data-desconto-unica"
                dataVenda={dataVenda}
                dataRegra={dataDescontoRegra}
                escolhida={dataDescontoEscolhida}
                onEscolhidaChange={setDataDescontoEscolhida}
                labelClassName="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                avisoClassName="sm:col-span-2"
              />
            )}
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
        regra={limiteData?.regraVencimento}
      />

      {/* Seção 7: Resumo Financeiro */}
      <Card
        variant="elevated"
        className="border-primary/30 bg-card-elevated bg-gradient-to-br from-primary/5 to-transparent"
      >
        <CardHeader className="pb-3">
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Os tiles coloridos usam o tint OPACO, nao `bg-<sem>/5`. Este Card
              empilha tres camadas — `bg-card-elevated` (0.96, ja mais escuro
              que o card normal) + o gradiente `from-primary/5` + o tint do
              tile — e sobre essa pilha nem a variante `-text` fechava no tema
              claro: 4.01 (info), 4.04 (success), 4.14 (warning). Com
              `bg-<sem>-bg`: 4.59 / 4.75 / 4.69. Mesma decisao ja tomada no
              icone de /venda-rapida. O escuro passava nos dois casos. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Subtotal</div>
              <div className="text-base font-bold tabular-nums text-foreground valor-sensivel">{formatBRL(subtotalProdutos)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Frete</div>
              <div className="text-base font-bold tabular-nums text-foreground valor-sensivel">{formatBRL(numFrete)}</div>
            </div>
            <div className="rounded-lg bg-primary/5 px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Venda</div>
              <div className="text-lg font-bold tabular-nums text-primary valor-sensivel">{formatBRL(totalVenda)}</div>
            </div>
            <div className="rounded-lg bg-info-bg px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Valor Parcela</div>
              <div className="text-base font-bold tabular-nums text-info-text valor-sensivel">{formatBRL(totalVenda / numParcelas)}</div>
            </div>
          </div>

          {desconto > 0 && (
            <div className="text-sm text-error-text font-medium">Desconto: <span className="valor-sensivel">-{formatBRL(desconto)}</span></div>
          )}

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Custo Total</div>
              <div className="text-base font-bold tabular-nums text-foreground valor-sensivel">{formatBRL(custoTotal)}</div>
            </div>
            <div className="rounded-lg bg-success-bg px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Lucro Bruto</div>
              <div className="text-base font-bold tabular-nums text-success-text valor-sensivel">{formatBRL(lucroBruto)}</div>
            </div>
            <div className="rounded-lg bg-success-bg px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Margem</div>
              <div className="text-base font-bold tabular-nums text-success-text valor-sensivel">{margemPct.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-warning-bg px-3 py-2.5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Comissao ({comissaoPct}%)</div>
              <div className="text-base font-bold tabular-nums text-warning-text valor-sensivel">{formatBRL(valorComissao)}</div>
            </div>
          </div>

          <Separator />

          <ResumoVendaPanel
            simulacao={simulacao}
            barraLimite={
              cardLimite?.limite != null
                ? { teto: cardLimite.limite, comprometido: cardLimite.comprometido }
                : null
            }
            taxaNotaPct={numTaxaNota}
            comissaoPct={comissaoPct}
            regraVencimento={limiteData?.regraVencimento ?? null}
          />

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
