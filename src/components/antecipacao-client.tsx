'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronDown, CircleDollarSign, FileSpreadsheet, ImageIcon, Info, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { registrarAntecipacaoConcluidaAction } from "@/app/(app)/prudent/actions";
import { FormSelect } from "@/components/form-select";
import { IntervaloMesesPicker } from "@/components/intervalo-meses-picker";
import { ProdutosVendaPopover, type ProdutosDaVenda } from "@/components/produtos-venda-popover";
import { LegendaParcelas, ParcelasVendaPopover } from "@/components/parcelas-venda-popover";
import { PlanilhaControlePopover } from "@/components/planilha-controle-popover";
import { PlanilhaFolhaPopover } from "@/components/planilha-folha-popover";
import AntecipacaoCompradores, { TABELA_COM_ROLAGEM } from "@/components/antecipacao-compradores";
import { TAXA_MENSAL_PADRAO } from "@/lib/antecipacao";
import type {
  CompradorAntecipacao,
  MesAntecipacao,
  ParcelasDaVenda,
  ResumoAntecipacaoCompradores,
} from "@/lib/antecipacao-compradores";
import type { ContagensFila, ResultadoSelecao } from "@/lib/fila-antecipacao";
import { algumMesNoIntervalo } from "@/lib/periodo-meses";
import { formatarDataPura } from "@/lib/data-pura";
import { calcularSelecaoAction } from "@/app/(app)/prudent/actions";
import { ParcelasLoteFila } from "@/components/parcelas-lote-fila";

interface Venda {
  id: number;
  dataVenda: string | Date;
  produtoNome: string | null;
  valorVenda: number | null;
  parcelas: number | null;
  empresaConveniada: string | null;
  clienteNome?: string | null;
  clienteCpf?: string | null;
  clienteCnpj?: string | null;
  status: 'pendente' | 'em_andamento' | 'antecipado' | 'parcialmente_antecipado';
  /** Mesma chave do resumo por comprador — liga o "Ver na fila" a esta linha. */
  compradorChave: string;
  /** Tabela de produtos pronta do servidor (linhas, preço unitário, totais). */
  produtos: ProdutosDaVenda;
  /** Parcelas prontas do servidor: situação de cada uma, contagens e totais. */
  parcelasInfo: ParcelasDaVenda;
  /** Meses (YYYY-MM) com parcela em aberto; `null` = venda sem parcela cadastrada. */
  mesesEmAberto: string[] | null;
}

/** Resposta do envio à Prudent (`antecipar` em prudent/page.tsx). */
type RespostaAntecipar = { ok: true; parcelas: number; loteId: number } | { ok: false; erro: string };

/**
 * Baixa o CSV da Prudent a partir do lote já gravado: o arquivo lista exatamente as parcelas do
 * lote. Devolve false se falhar (o lote continua aberto; a tela oferece tentar de novo).
 */
async function baixarCsvDoLote(loteId: number): Promise<boolean> {
  try {
    const resposta = await fetch(`/api/relatorios/antecipacao?loteId=${loteId}`);
    if (!resposta.ok) return false;
    const blob = await resposta.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeira-lote-${loteId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

function avisarCsvFalhou(loteId: number) {
  toast.error(`Lote #${loteId} aberto, mas o arquivo da Prudent não baixou.`, {
    duration: Infinity,
    action: {
      label: 'Baixar de novo',
      onClick: () => {
        void baixarCsvDoLote(loteId).then((ok) => {
          if (!ok) avisarCsvFalhou(loteId);
        });
      },
    },
  });
}

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<RespostaAntecipar>;
  vencimentosPorEmpresa: Record<string, number>;
  empresasDisponiveis: string[];
  resumoCompradores: ResumoAntecipacaoCompradores;
  /** Os mesmos baldes do resumo, agrupados pelo mês do vencimento. */
  resumoMeses: MesAntecipacao[];
  /** Quantas vendas cada opção dos dropdowns traz — contado no servidor. */
  contagens: ContagensFila;
  /** Quanto falta antecipar em cada mês de vencimento (YYYY-MM), para o seletor de meses. */
  valoresPorMes: Record<string, number>;
  /** Dia civil de Manaus (YYYY-MM-DD), o mesmo que o servidor usou no resumo. */
  hoje: string;
}

/** Espera antes de pedir o cálculo da seleção: marcar várias vendas seguidas vira um pedido só. */
const ESPERA_CALCULO_MS = 200;

function StatusBadge({ status }: { status: Venda['status'] }) {
  if (status === 'antecipado') return <Badge variant="success">Antecipado</Badge>;
  if (status === 'parcialmente_antecipado') {
    // Sem variante própria no Badge: ponto na cor do estado parcial, selo neutro.
    return (
      <Badge variant="outline" className="gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-status-partial" />
        Parcial
      </Badge>
    );
  }
  if (status === 'em_andamento') return <Badge variant="info">Em andamento</Badge>;
  // "A antecipar" (antes "Pendente"): mesma palavra do resumo e das parcelas.
  return <Badge variant="warning">A antecipar</Badge>;
}

export default function AntecipacaoClient({
  vendasIniciais,
  onSubmit,
  vencimentosPorEmpresa,
  empresasDisponiveis,
  resumoCompradores,
  resumoMeses,
  contagens,
  valoresPorMes,
  hoje,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Lote por parcela (2026-09-30): parcelas desmarcadas das vendas selecionadas e a venda
  // aberta para escolher parcelas.
  const [excluidas, setExcluidas] = useState<number[]>([]);
  const [expandidas, setExpandidas] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // "Registrar já concluída": antecipação que a Prudent comprou antes de o sistema saber.
  const [registroAberto, setRegistroAberto] = useState(false);
  const [dataRegistro, setDataRegistro] = useState(hoje);
  const [registrando, setRegistrando] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [periodoInicio, setPeriodoInicio] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  // Comprador escolhido no resumo ("Ver na fila"). O nome e guardado so para o chip.
  const [filtroComprador, setFiltroComprador] = useState<{ chave: string; nome: string } | null>(null);
  // Card de selecao: calculado no servidor (calcularSelecaoAction). A tela so mostra.
  const [calculo, setCalculo] = useState<ResultadoSelecao | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erroCalculo, setErroCalculo] = useState<string | null>(null);
  // Refaz o calculo depois de um erro sem exigir mudar a selecao ou o periodo.
  const [tentativa, setTentativa] = useState(0);
  const pedidoAtual = useRef(0);

  const verNaFila = (comprador: CompradorAntecipacao) => {
    // Clicar de novo no comprador que ja filtra a fila desliga o filtro.
    if (filtroComprador?.chave === comprador.chave) {
      setFiltroComprador(null);
      return;
    }
    // Comprador e mais especifico que empresa, status e periodo: manter esses
    // filtros poderia esconder justamente as vendas que o usuario pediu para ver.
    setFiltroComprador({ chave: comprador.chave, nome: comprador.nome });
    setFiltroEmpresa("todas");
    setFiltroStatus("todas");
    setPeriodoInicio("");
    setPeriodoFim("");
    // A rolagem sozinha deixava o foco no botao la em cima: o proximo Tab
    // devolvia a tela ao resumo. O foco vai junto para o card da fila.
    const fila = document.getElementById("fila-antecipacao");
    fila?.scrollIntoView({ behavior: "smooth", block: "start" });
    fila?.focus({ preventScroll: true });
  };

  // Pede ao servidor o card de selecao a cada mudanca de selecao ou periodo.
  // So a resposta do pedido mais recente vale: marcar e desmarcar rapido nao
  // deixa um numero antigo chegar por ultimo.
  useEffect(() => {
    const pedido = ++pedidoAtual.current;
    if (selectedIds.length === 0) {
      setCalculo(null);
      setErroCalculo(null);
      setCalculando(false);
      return;
    }
    setCalculando(true);
    const espera = setTimeout(async () => {
      try {
        const resposta = await calcularSelecaoAction({
          ids: selectedIds,
          mesInicio: periodoInicio || undefined,
          mesFim: periodoFim || undefined,
          excluirParcelaIds: excluidas,
        });
        if (pedido !== pedidoAtual.current) return;
        if (resposta.ok) {
          setCalculo(resposta.resultado);
          setErroCalculo(null);
        } else {
          setCalculo(null);
          setErroCalculo(resposta.erro);
        }
      } catch {
        if (pedido === pedidoAtual.current) {
          setCalculo(null);
          setErroCalculo("Não foi possível calcular a seleção. Tente de novo.");
        }
      } finally {
        if (pedido === pedidoAtual.current) setCalculando(false);
      }
    }, ESPERA_CALCULO_MS);
    return () => clearTimeout(espera);
  }, [selectedIds, excluidas, periodoInicio, periodoFim, tentativa]);

  // Filtrar vendas: so comparacao com o que o servidor mandou, nenhum calculo.
  const vendasFiltradas = vendasIniciais.filter((v) => {
    const passaEmpresa = filtroEmpresa === "todas" || v.empresaConveniada === filtroEmpresa;
    const passaStatus = filtroStatus === "todas" || v.status === filtroStatus;
    const passaComprador = !filtroComprador || v.compradorChave === filtroComprador.chave;
    // Venda sem parcela cadastrada (mesesEmAberto null) nao tem como ser julgada
    // pelo periodo e continua na lista, como antes.
    const passaPeriodo = v.mesesEmAberto === null || algumMesNoIntervalo(v.mesesEmAberto, periodoInicio, periodoFim);
    return passaEmpresa && passaStatus && passaPeriodo && passaComprador;
  });

  // Selecao que os filtros atuais escondem: continua no lote e no card, mas some da
  // tabela — sem este contador o total nao fecha com o que esta a vista.
  const selecionadosOcultos = selectedIds.filter(
    (id) => !vendasFiltradas.some((v) => v.id === id)
  ).length;

  // Desmarcar a venda esquece as parcelas desmarcadas dela: marcar de novo volta com todas.
  const esquecerExclusoes = (vendaIds: number[]) => {
    const ids = new Set(
      vendasIniciais
        .filter((v) => vendaIds.includes(v.id))
        .flatMap((v) => v.parcelasInfo.lista.map((p) => p.id).filter((pid): pid is number => pid !== undefined))
    );
    setExcluidas((prev) => prev.filter((pid) => !ids.has(pid)));
  };

  const toggleParcela = (parcelaId: number) => {
    setExcluidas((prev) => (prev.includes(parcelaId) ? prev.filter((i) => i !== parcelaId) : [...prev, parcelaId]));
  };

  const toggleExpandida = (vendaId: number) => {
    setExpandidas((prev) => (prev.includes(vendaId) ? prev.filter((i) => i !== vendaId) : [...prev, vendaId]));
  };

  const toggleSelect = (id: number, isTotalmenteAntecipado: boolean) => {
    if (isTotalmenteAntecipado) return;
    const venda = vendasIniciais.find((item) => item.id === id);
    if (!venda) return;
    if (selectedIds.includes(id)) esquecerExclusoes([id]);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      const empresaSelecionada = prev
        .map((selectedId) => vendasIniciais.find((item) => item.id === selectedId)?.empresaConveniada ?? "Sem empresa")
        .find(Boolean);
      const empresaNova = venda.empresaConveniada ?? "Sem empresa";
      if (empresaSelecionada && empresaSelecionada !== empresaNova) {
        toast.error("Cada lote deve conter vendas de uma única empresa. Remova a seleção atual ou filtre a empresa.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleAll = () => {
    const selectableIds = vendasFiltradas.filter(v => v.status !== 'antecipado').map(v => v.id);
    const empresasVisiveis = new Set(
      vendasFiltradas.filter((v) => v.status !== 'antecipado').map((v) => v.empresaConveniada ?? "Sem empresa")
    );
    const empresaSelecionada = selectedIds
      .map((selectedId) => vendasIniciais.find((v) => v.id === selectedId)?.empresaConveniada ?? "Sem empresa")
      .find(Boolean);
    if (!empresaSelecionada && empresasVisiveis.size > 1) {
      toast.error("Selecione uma empresa antes de marcar todas as vendas: cada lote pertence a uma única empresa.");
      return;
    }
    const idsDaEmpresa = selectableIds.filter((id) => {
      const empresa = vendasIniciais.find((v) => v.id === id)?.empresaConveniada ?? "Sem empresa";
      return !empresaSelecionada || empresa === empresaSelecionada;
    });
    const allSelected = idsDaEmpresa.length > 0 && idsDaEmpresa.every(id => selectedIds.includes(id));
    if (allSelected) {
      esquecerExclusoes(idsDaEmpresa);
      setSelectedIds(prev => prev.filter(id => !idsDaEmpresa.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...idsDaEmpresa])]);
    }
  };

  const handleAction = async (formData: FormData) => {
    if (selectedIds.length === 0) return;
    if (calculando || (!calculo && !erroCalculo)) {
      toast.info("Aguarde o cálculo da seleção terminar.");
      return;
    }
    if (erroCalculo || !calculo) {
      // Sem refazer, o erro ficava gravado e cada clique so repetia o aviso.
      toast.error("O cálculo da seleção falhou — calculando de novo. Clique em Antecipar quando terminar.");
      setTentativa((n) => n + 1);
      return;
    }
    // A action nao encontra parcela elegivel e retorna em silencio: sem este aviso
    // o usuario clica, nada acontece e a tela nao explica por que.
    if (calculo.parcelas === 0) {
      toast.error("Nenhuma parcela confirmada na seleção — confira as que aguardam o RH, as desmarcadas e o período.");
      return;
    }
    // Nenhum titulo vem de parcela cadastrada (so venda legada, com prazo
    // estimado): a action so enxerga linhas reais e retornaria em silencio,
    // limpando a selecao como se tivesse dado certo.
    if (calculo.parcelasCadastradas === 0) {
      toast.error("As vendas selecionadas não têm parcelas cadastradas em aberto para antecipar.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Abrir o lote no banco. 2. Baixar o arquivo da Prudent a partir do lote gravado
      // (30/09): antes o CSV era gerado da seleção ANTES de gravar, e uma recusa do RH, outra aba
      // ou parcela desmarcada no meio fazia o arquivo divergir do lote.
      selectedIds.forEach(id => formData.append('id', id.toString()));
      excluidas.forEach(id => formData.append('excluir', id.toString()));
      if (periodoInicio) formData.append('mesInicio', periodoInicio);
      if (periodoFim) formData.append('mesFim', periodoFim);
      const r = await onSubmit(formData);
      if (!r.ok) {
        toast.error(`${r.erro} O lote não foi aberto.`);
        return;
      }
      if (!(await baixarCsvDoLote(r.loteId))) avisarCsvFalhou(r.loteId);
      toast.success(`Lote enviado à Prudent: ${r.parcelas} ${r.parcelas === 1 ? 'parcela' : 'parcelas'}.`);
      setSelectedIds([]);
      setExcluidas([]);
    } catch (error) {
      console.error("Erro na antecipação:", error);
      toast.error("Ocorreu um erro ao processar a antecipação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const registrarJaConcluida = async () => {
    if (selectedIds.length === 0) return;
    setRegistrando(true);
    try {
      const r = await registrarAntecipacaoConcluidaAction({
        ids: selectedIds,
        mesInicio: periodoInicio || undefined,
        mesFim: periodoFim || undefined,
        dataRetorno: dataRegistro,
        excluirParcelaIds: excluidas,
      });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      // JSX e nao template string: o toast vive num portal, fora da arvore marcada,
      // e o valor precisa carregar a propria mascara.
      toast.success(
        <span>
          Registrado: {r.parcelas} {r.parcelas === 1 ? 'parcela' : 'parcelas'},{' '}
          <span className="valor-sensivel">{formatBRL(r.valor)}</span>.
        </span>
      );
      setRegistroAberto(false);
      setSelectedIds([]);
      setExcluidas([]);
      router.refresh();
    } catch {
      toast.error('Não foi possível registrar a antecipação.');
    } finally {
      setRegistrando(false);
    }
  };

  const handleGerarPlanilha = () => {
    if (selectedIds.length === 0) return;
    const params = new URLSearchParams({ ids: selectedIds.join(',') });
    if (periodoInicio) params.set('mesInicio', periodoInicio);
    if (periodoFim) params.set('mesFim', periodoFim);
    window.location.assign(`/api/relatorios/antecipacao-xlsx?${params.toString()}`);
  };

  const handleGerarRelatorioVisual = () => {
    if (selectedIds.length === 0) return;
    const params = new URLSearchParams({ ids: selectedIds.join(',') });
    if (periodoInicio) params.set('mesInicio', periodoInicio);
    if (periodoFim) params.set('mesFim', periodoFim);
    window.open(`/api/relatorios/antecipacao-imagem?${params.toString()}`, '_blank');
  };

  const selectableInFiltered = vendasFiltradas.filter(v => v.status !== 'antecipado');
  const allFilteredSelected = selectableInFiltered.length > 0 && selectableInFiltered.every(v => selectedIds.includes(v.id));

  // Vencimento de parcela e data pura — ver src/lib/data-pura.ts
  const formatDateBR = formatarDataPura;

  // Numeros prontos do servidor; aqui so viram texto.
  const n = (valor: number | undefined) => String(valor ?? 0);
  const opcoesEmpresa = [
    { value: "todas", label: "Todas as empresas", hint: n(contagens.total) },
    ...empresasDisponiveis.map((e: string) => ({ value: e, label: e, hint: n(contagens.porEmpresa[e]) })),
  ];
  // A bolinha repete a cor do selo da coluna Status (StatusBadge).
  const opcoesStatus = [
    { value: "todas", label: "Todos os status", hint: n(contagens.total) },
    { value: "pendente", label: "A antecipar", indicador: "bg-warning", hint: n(contagens.porStatus.pendente) },
    { value: "parcialmente_antecipado", label: "Parcialmente antecipado", indicador: "bg-status-partial", hint: n(contagens.porStatus.parcialmente_antecipado) },
    { value: "em_andamento", label: "Em andamento", indicador: "bg-info", hint: n(contagens.porStatus.em_andamento) },
    { value: "antecipado", label: "Antecipado", indicador: "bg-success", hint: n(contagens.porStatus.antecipado) },
  ];
  const temFiltro = filtroEmpresa !== "todas" || filtroStatus !== "todas" || periodoInicio !== "" || periodoFim !== "" || Boolean(filtroComprador);
  const rotuloFiltro = "text-sm font-medium text-muted-foreground";

  const totalSelecionado = calculo?.valorBruto ?? 0;
  const parcelasSelecionadas = calculo?.parcelas ?? 0;
  const vencidasNaSelecao = calculo?.vencidas ?? 0;

  const fila = (
    <form action={handleAction}>
      {/* Filtros: uma coluna no celular (controles com alvo de 44px); em linha a partir de sm. */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1 sm:w-56">
          <Label htmlFor="filtro-empresa">Empresa</Label>
          <FormSelect
            id="filtro-empresa"
            name="_filtroEmpresa"
            options={opcoesEmpresa}
            value={filtroEmpresa}
            onValueChange={setFiltroEmpresa}
            searchable={empresasDisponiveis.length > 5}
            className="h-11 sm:h-10 rounded-controle! border border-input bg-controle dark:bg-controle"
          />
        </div>
        <div className="flex flex-col gap-1 sm:w-64">
          <Label htmlFor="filtro-status">Status</Label>
          <FormSelect
            id="filtro-status"
            name="_filtroStatus"
            options={opcoesStatus}
            value={filtroStatus}
            onValueChange={setFiltroStatus}
            searchable={false}
            className="h-11 sm:h-10 rounded-controle! border border-input bg-controle dark:bg-controle"
          />
        </div>
        <div className="flex flex-col gap-1">
          {/* O filtro e pelo mes do VENCIMENTO, que o sistema poe no mes seguinte ao
              desconto em folha. O seletor grava MM/AAAA, o formato que parsePeriodoMesAno le. */}
          <Label htmlFor="filtro-vencimento">Vencimento</Label>
          <IntervaloMesesPicker
            id="filtro-vencimento"
            inicio={periodoInicio}
            fim={periodoFim}
            onChange={(inicio, fim) => {
              setPeriodoInicio(inicio);
              setPeriodoFim(fim);
            }}
            hoje={hoje}
            valoresPorMes={valoresPorMes}
          />
        </div>
        {filtroComprador && (
          <div className="flex flex-col gap-1">
            <span className={rotuloFiltro}>Comprador</span>
            {/* Chip de marca: par marca-tint/marca-tint-texto, policiado pela catraca de contraste. */}
            <div className="flex h-11 items-center gap-1 rounded-controle bg-marca-tint pl-3 pr-1 text-sm font-medium text-marca-tint-texto sm:h-10">
              <span className="truncate sm:max-w-[220px]" title={filtroComprador.nome}>{filtroComprador.nome}</span>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                aria-label="Remover filtro de comprador"
                className="ml-auto"
                onClick={() => setFiltroComprador(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {temFiltro && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 justify-self-start text-muted-foreground hover:text-foreground sm:h-10"
            onClick={() => { setFiltroEmpresa("todas"); setFiltroStatus("todas"); setPeriodoInicio(""); setPeriodoFim(""); setFiltroComprador(null); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Mesma receita das tabelas do resumo: no maximo 80% da tela, rolagem por
          dentro e cabecalho fixo — a fila passa de cem vendas. O seletor mira o
          div de rolagem que o <Table> cria em volta da <table>. */}
      <div className={TABELA_COM_ROLAGEM}>
      <Table>
        <TableHeader sticky className="bg-poco">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleAll}
                disabled={isProcessing || selectableInFiltered.length === 0}
              />
            </TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Empresa Conveniada</TableHead>
            <TableHead className="hidden md:table-cell">Produto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">
              {/* Legenda da célula "4 / 2 / 1 / 1" no "?": o cabeçalho fica enxuto e
                  a linha não precisa repetir o texto (pedido do André). */}
              <span className="inline-flex items-center justify-end gap-1">
                Parcelas
                <LegendaParcelas />
              </span>
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Escolher parcelas</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendasFiltradas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                Nenhuma venda encontrada com os filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            vendasFiltradas.map((v) => {
              const isTotalmenteAntecipado = v.status === 'antecipado';
              const isSelected = selectedIds.includes(v.id);
              const variosProdutos = v.produtos.linhas.length > 1;
              const produtoUnico = v.produtos.linhas[0]?.produtoNome ?? v.produtoNome ?? '';
              const expandida = expandidas.includes(v.id);
              const temParcelaAberta = v.parcelasInfo.lista.some((p) => p.situacao === 'a_antecipar' || p.situacao === 'vencida');
              return (
                <Fragment key={v.id}>
                <TableRow
                  // O estado da venda mora no Badge da coluna Status; a linha só marca
                  // o que não dá para marcar (já antecipada) e o que está selecionado.
                  className={`transition-colors duration-200 ${
                    isTotalmenteAntecipado
                      ? 'cursor-default opacity-70'
                      : isSelected
                      ? 'cursor-pointer bg-marca-tint'
                      : 'cursor-pointer hover:bg-accent/50'
                  }`}
                  onClick={() => !isProcessing && toggleSelect(v.id, isTotalmenteAntecipado)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(v.id, isTotalmenteAntecipado)}
                      disabled={isProcessing || isTotalmenteAntecipado}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{formatDateBR(v.dataVenda)}</TableCell>
                  <TableCell className="text-foreground text-sm max-w-[180px] md:max-w-[150px]">
                    <span className="block truncate">{v.clienteNome || '—'}</span>
                    {/* No celular Empresa e Produto deixam de ser colunas e vem aqui,
                        com o popover de produtos ainda ao alcance do toque. */}
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 text-xs text-muted-foreground md:hidden">
                      {v.empresaConveniada && <span className="truncate">{v.empresaConveniada}</span>}
                      {variosProdutos ? (
                        <ProdutosVendaPopover produtos={v.produtos} className="h-11" />
                      ) : (
                        <span className="truncate">{produtoUnico}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-foreground md:table-cell">
                    {v.empresaConveniada ? (
                      <Badge variant="marca">{v.empresaConveniada}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden font-semibold text-foreground max-w-[250px] md:table-cell">
                    {variosProdutos ? (
                      // Hover abre, clique fixa, sair sem clicar fecha — e o clique
                      // nunca seleciona a venda (ver use-popover-hover.ts).
                      <ProdutosVendaPopover produtos={v.produtos} />
                    ) : (
                      <span className="block truncate" title={produtoUnico}>
                        {produtoUnico || '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground valor-sensivel valor-sensivel-fim">{formatBRL(v.valorVenda || 0)}</TableCell>
                  <TableCell className="text-right">
                    {/* "total / antecipadas / a antecipar / vencidas", contados no
                        servidor; a legenda fica no "?" do cabecalho da coluna. */}
                    {v.parcelasInfo.lista.length > 0 ? (
                      <ParcelasVendaPopover parcelas={v.parcelasInfo} hoje={hoje} />
                    ) : (
                      <span className="text-sm font-bold tabular-nums" title={v.parcelasInfo.desfeita ? "Venda cancelada ou estornada" : "Venda sem parcelas cadastradas"}>
                        {v.parcelas ?? '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {temParcelaAberta && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        aria-expanded={expandida}
                        aria-controls={`parcelas-lote-${v.id}`}
                        aria-label={`${expandida ? 'Fechar' : 'Escolher'} parcelas da venda V${v.id}`}
                        onClick={() => toggleExpandida(v.id)}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expandida && temParcelaAberta && (
                  <TableRow id={`parcelas-lote-${v.id}`} className="hover:bg-transparent">
                    <TableCell colSpan={9} className="bg-card-elevated px-4 py-4">
                      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-bold text-foreground">
                          V{v.id} · {v.clienteNome || '—'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {isSelected
                            ? 'escolha as parcelas que vão para a Prudent'
                            : 'marque a venda para escolher as parcelas'}
                        </span>
                      </div>
                      <ParcelasLoteFila
                        vendaId={v.id}
                        parcelas={v.parcelasInfo}
                        vendaSelecionada={isSelected}
                        excluidas={excluidas}
                        onToggle={toggleParcela}
                        periodoInicio={periodoInicio}
                        periodoFim={periodoFim}
                        desabilitado={isProcessing}
                      />
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {/* Painel do total selecionado + CTA de antecipar: a ação principal da tela. O estado
          (cálculo, avisos) mora em texto e nos cartões internos neutros, nunca em tint de contêiner. */}
      <Card className="mt-6 overflow-hidden p-2" aria-busy={calculando}>
        {/* Linha 1: Total + Métricas — tudo vindo do servidor (calcularSelecaoAction). */}
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Total selecionado */}
          <div className="min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              Total a antecipar
              {calculando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Calculando" />}
            </div>
            <div className="mt-1 font-mono text-3xl font-medium leading-none tracking-tight text-foreground tabular-nums valor-sensivel sm:text-4xl">
              {formatBRL(totalSelecionado)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? 'venda selecionada' : 'vendas selecionadas'}
              {parcelasSelecionadas > 0 && (
                <> · {parcelasSelecionadas} {parcelasSelecionadas === 1 ? 'parcela' : 'parcelas'}</>
              )}
              {calculando && <> · calculando…</>}
            </div>
            {erroCalculo && (
              <div className="text-xs font-semibold text-warning-text mt-1">{erroCalculo}</div>
            )}
            {!calculando && calculo && selectedIds.length > 0 && calculo.parcelas === 0 && (
              <div className="text-xs font-semibold text-warning-text mt-1">
                Nenhuma parcela confirmada na seleção.
              </div>
            )}
            {vencidasNaSelecao > 0 && (
              <div className="text-xs font-semibold text-warning-text mt-1">
                Inclui {vencidasNaSelecao} {vencidasNaSelecao === 1 ? 'parcela vencida' : 'parcelas vencidas'} — o desconto em folha {vencidasNaSelecao === 1 ? 'dela' : 'delas'} já ocorreu.
              </div>
            )}
            {/* Com o filtro por comprador, trocar de comprador esconde a selecao
                anterior: o aviso precisa ser visto, nao so estar la. */}
            {selecionadosOcultos > 0 && (
              <div className="text-xs font-semibold text-warning-text mt-1">
                {selecionadosOcultos} {selecionadosOcultos === 1 ? 'selecionada não aparece' : 'selecionadas não aparecem'} nos filtros atuais e {selecionadosOcultos === 1 ? 'continua' : 'continuam'} na seleção.
              </div>
            )}
          </div>

          {/* 3 métricas: cartões internos neutros, o rótulo diz o que é. */}
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-interno bg-card-elevated px-3 py-3">
              <div className="text-sm font-medium text-muted-foreground">Prazo médio</div>
              <div className="font-mono text-xl font-medium leading-tight text-foreground tabular-nums">
                {(calculo?.prazoMedioDias ?? 0).toFixed(1)}<span className="ml-0.5 text-xs text-muted-foreground">d</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">D+1</div>
            </div>
            <div className="rounded-interno bg-card-elevated px-3 py-3">
              <div className="text-sm font-medium text-muted-foreground">Taxa total</div>
              <div className="font-mono text-xl font-medium leading-tight text-foreground tabular-nums">
                {(calculo?.taxaPercent ?? 0).toFixed(2)}<span className="ml-0.5 text-xs text-muted-foreground">%</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Smart</div>
            </div>
            <div className="col-span-2 min-w-0 rounded-interno bg-card-elevated px-3 py-3 sm:col-span-1">
              <div className="text-sm font-medium text-muted-foreground">Líquido</div>
              <div className="truncate font-mono text-lg font-medium leading-tight text-foreground tabular-nums valor-sensivel">
                {formatBRL(calculo?.valorLiquido ?? 0)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">estimado</div>
            </div>
          </div>
        </div>

        {/* Linha 2: Ações */}
        <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:gap-3">
          {/* Secundárias */}
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isProcessing}
              variant="outline"
              size="sm"
              className="h-10 flex-1 cursor-pointer gap-2 px-4 text-sm sm:flex-none"
              onClick={handleGerarPlanilha}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Planilha
            </Button>
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isProcessing}
              variant="outline"
              size="sm"
              className="h-10 flex-1 cursor-pointer gap-2 px-4 text-sm sm:flex-none"
              onClick={handleGerarRelatorioVisual}
            >
              <ImageIcon className="h-4 w-4" />
              Relatório Visual
            </Button>
            {/* Antecipação que a Prudent já comprou antes de o sistema saber: registra direto como
                concluída, sem gerar arquivo nenhum (2026-09-17). */}
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isProcessing || registrando}
              variant="outline"
              size="sm"
              className="h-10 flex-1 cursor-pointer gap-2 px-4 text-sm sm:flex-none"
              onClick={() => {
                setDataRegistro(hoje);
                setRegistroAberto(true);
              }}
            >
              <Check className="h-4 w-4" />
              Registrar já concluída
            </Button>
          </div>

          {/* CTA principal — espera o cálculo do servidor para não antecipar no escuro. */}
          <Button
            disabled={selectedIds.length === 0 || isProcessing || calculando}
            className="h-11 w-full cursor-pointer gap-2 px-6 text-sm sm:ml-auto sm:h-12 sm:w-auto sm:px-8 sm:text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Enviar ${parcelasSelecionadas} ${parcelasSelecionadas === 1 ? 'parcela' : 'parcelas'} à Prudent`
            )}
          </Button>
        </div>

        {/* Rodapé informativo: nota neutra. */}
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-interno bg-poco px-4 py-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          Taxa Smart: {TAXA_MENSAL_PADRAO.toFixed(2)}% a.m. · Juros simples &lt; 30 dias · Compostos a partir de 30 dias.
        </div>
      </Card>

      {/* Vencimentos por empresa no mês: painel secundário, cartões internos neutros. */}
      {Object.keys(vencimentosPorEmpresa).length > 0 && (
        <Card className="mt-6 p-2 pt-5">
          <div className="mb-4 flex items-center gap-2 px-4">
            <h3 className="text-lg font-semibold text-foreground">Valores a vencer no mês por empresa</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(vencimentosPorEmpresa)
              .sort((a, b) => b[1] - a[1])
              .map(([empresa, valor]) => (
                <div key={empresa} className="rounded-interno bg-card-elevated px-4 py-3">
                  <div className="truncate text-sm font-medium text-muted-foreground">{empresa}</div>
                  <div className="font-mono text-lg font-medium text-foreground tabular-nums valor-sensivel">{formatBRL(valor)}</div>
                </div>
              ))}
          </div>
          <div className="mx-2 mt-2 flex items-center justify-between rounded-interno bg-poco px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Total a vencer no mês</span>
            <span className="font-mono text-xl font-medium text-foreground tabular-nums valor-sensivel valor-sensivel-fim">
              {formatBRL(Object.values(vencimentosPorEmpresa).reduce((sum, v) => sum + v, 0))}
            </span>
          </div>
        </Card>
      )}
      <Dialog open={registroAberto} onOpenChange={(aberto) => !aberto && setRegistroAberto(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar antecipação já concluída</DialogTitle>
            <DialogDescription>
              Para o que a Prudent já comprou antes: nenhum arquivo é gerado, e as parcelas das{' '}
              {selectedIds.length === 1 ? 'venda marcada' : `${selectedIds.length} vendas marcadas`} passam a contar como
              antecipadas e quitadas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-registro-antecipacao">Data da antecipação</Label>
            <DateInput id="data-registro-antecipacao" value={dataRegistro} onChange={setDataRegistro} max={hoje} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRegistroAberto(false)} disabled={registrando}>
              Cancelar
            </Button>
            <Button type="button" className="gap-2" onClick={registrarJaConcluida} disabled={registrando || !dataRegistro}>
              {registrando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );

  return (
    <div className="space-y-6">
      <AntecipacaoCompradores
        resumo={resumoCompradores}
        meses={resumoMeses}
        hoje={hoje}
        compradorNaFila={filtroComprador?.chave ?? null}
        onVerNaFila={verNaFila}
      />
      {/* Variante padrao, a mesma do card irmao abaixo (Historico de
          Antecipacoes). Antes este era elevado: os dois divergiam em fundo e
          blur nos dois temas, apesar de terem a mesma largura e o mesmo papel
          (fase 16, achado 8). O card saiu da page.tsx quando o resumo por
          comprador passou a dividir o filtro "Ver na fila" com a fila. */}
      {/* tabIndex -1: recebe o foco do "Ver na fila" sem entrar na ordem do Tab. */}
      <Card id="fila-antecipacao" tabIndex={-1} className="scroll-mt-4 p-2 pt-5 focus:outline-none">
        <CardHeader className="p-0 px-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-sans text-lg font-semibold leading-normal tracking-normal">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Vendas — Antecipação
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* A base inteira no formato da planilha da equipe (design v7 aprovado). */}
            <PlanilhaControlePopover empresas={empresasDisponiveis} hoje={hoje} />
            {/* A coluna Desconto de Produto da folha do Domínio (design de 17/09 aprovado). */}
            <PlanilhaFolhaPopover empresas={empresasDisponiveis} hoje={hoje} />
          </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 px-2 pb-2">{fila}</CardContent>
      </Card>
    </div>
  );
}
