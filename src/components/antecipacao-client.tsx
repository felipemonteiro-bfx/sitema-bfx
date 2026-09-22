'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, FileSpreadsheet, ImageIcon, Loader2, X } from "lucide-react";
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

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<void>;
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
  if (status === 'antecipado') {
    return (
      <Badge className="bg-success text-success-foreground border-0 font-semibold text-xs">
        Antecipado
      </Badge>
    );
  }
  if (status === 'parcialmente_antecipado') {
    return (
      <Badge className="bg-status-partial text-status-partial-foreground border-0 font-semibold text-xs">
        Parcial
      </Badge>
    );
  }
  if (status === 'em_andamento') {
    return (
      <Badge className="bg-info text-info-foreground border-0 font-semibold text-xs">
        Em andamento
      </Badge>
    );
  }
  // "A antecipar" (antes "Pendente"): mesma palavra do resumo e das parcelas.
  return (
    <Badge className="bg-warning text-warning-foreground border-0 font-semibold text-xs">
      A antecipar
    </Badge>
  );
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
  }, [selectedIds, periodoInicio, periodoFim, tentativa]);

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

  const toggleSelect = (id: number, isTotalmenteAntecipado: boolean) => {
    if (isTotalmenteAntecipado) return;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const selectableIds = vendasFiltradas.filter(v => v.status !== 'antecipado').map(v => v.id);
    const allSelected = selectableIds.every(id => selectedIds.includes(id));
    if (allSelected && selectableIds.length > 0) {
      setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...selectableIds])]);
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
      toast.error("Nenhuma parcela elegível na seleção — todas já foram antecipadas ou estão fora do período.");
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
      // 1. Gerar e baixar o relatório para a financeira.
      // O CSV agora so lista parcelas com `antecipada = false`, entao ele tem de
      // ser lido ANTES da gravacao. O `setTimeout` de 1s que existia aqui nao era
      // barreira nenhuma: se a requisicao chegasse depois do updateMany, a
      // financeira recebia um arquivo vazio.
      const idsParam = selectedIds.join(',');
      const xlsxParams = new URLSearchParams({ ids: idsParam });
      if (periodoInicio) xlsxParams.set('mesInicio', periodoInicio);
      if (periodoFim) xlsxParams.set('mesFim', periodoFim);

      const resposta = await fetch(`/api/relatorios/antecipacao?${xlsxParams.toString()}`);
      if (!resposta.ok) {
        toast.error("Não foi possível gerar o relatório da financeira. A antecipação não foi executada.");
        return;
      }
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-financeira-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      // 2. Executar a antecipação no banco
      selectedIds.forEach(id => formData.append('id', id.toString()));
      if (periodoInicio) formData.append('mesInicio', periodoInicio);
      if (periodoFim) formData.append('mesFim', periodoFim);
      await onSubmit(formData);
      setSelectedIds([]);
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
      });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`Registrado: ${r.parcelas} ${r.parcelas === 1 ? 'parcela' : 'parcelas'}, ${formatBRL(r.valor)}.`);
      setRegistroAberto(false);
      setSelectedIds([]);
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
  const rotuloFiltro = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  const totalSelecionado = calculo?.valorBruto ?? 0;
  const parcelasSelecionadas = calculo?.parcelas ?? 0;
  const vencidasNaSelecao = calculo?.vencidas ?? 0;

  const fila = (
    <form action={handleAction}>
      {/* Filtros: uma coluna no celular (controles com alvo de 44px); em linha a partir de sm. */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1 sm:w-56">
          <label htmlFor="filtro-empresa" className={rotuloFiltro}>Empresa</label>
          <FormSelect
            id="filtro-empresa"
            name="_filtroEmpresa"
            options={opcoesEmpresa}
            value={filtroEmpresa}
            onValueChange={setFiltroEmpresa}
            searchable={empresasDisponiveis.length > 5}
            className="h-11 sm:h-10"
          />
        </div>
        <div className="flex flex-col gap-1 sm:w-64">
          <label htmlFor="filtro-status" className={rotuloFiltro}>Status</label>
          <FormSelect
            id="filtro-status"
            name="_filtroStatus"
            options={opcoesStatus}
            value={filtroStatus}
            onValueChange={setFiltroStatus}
            searchable={false}
            className="h-11 sm:h-10"
          />
        </div>
        <div className="flex flex-col gap-1">
          {/* O filtro e pelo mes do VENCIMENTO, que o sistema poe no mes seguinte ao
              desconto em folha. O seletor grava MM/AAAA, o formato que parsePeriodoMesAno le. */}
          <label htmlFor="filtro-vencimento" className={rotuloFiltro}>Vencimento</label>
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
            {/* Par info-bg/info-text, policiado pela catraca de contraste: o
                text-primary sobre bg-primary/10 da pilula de empresa mede 4.39:1. */}
            <div className="flex h-11 items-center gap-1 rounded-md bg-info-bg pl-3 pr-1 text-sm font-semibold text-info-text sm:h-10">
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
        <TableHeader sticky>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendasFiltradas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Nenhuma venda encontrada com os filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            vendasFiltradas.map((v) => {
              const isTotalmenteAntecipado = v.status === 'antecipado';
              const isSelected = selectedIds.includes(v.id);
              const variosProdutos = v.produtos.linhas.length > 1;
              const produtoUnico = v.produtos.linhas[0]?.produtoNome ?? v.produtoNome ?? '';
              return (
                <TableRow
                  key={v.id}
                  className={`transition-all duration-200 ${
                    isTotalmenteAntecipado
                      ? 'bg-success-bg opacity-70 cursor-default'
                      : v.status === 'parcialmente_antecipado'
                      ? 'bg-status-partial/10 cursor-pointer hover:bg-status-partial/15'
                      : v.status === 'em_andamento'
                      ? 'bg-info-bg cursor-pointer hover:bg-info/15'
                      : isSelected
                      ? 'bg-warning-bg cursor-pointer'
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
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {v.empresaConveniada}
                      </span>
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
                  <TableCell className="text-right tabular-nums font-bold text-foreground">{formatBRL(v.valorVenda || 0)}</TableCell>
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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {/* Degrau de destaque (D-03): esta e a card principal da tela — total
          selecionado + CTA de antecipar. A card de vencimentos abaixo e
          secundaria e fica no degrau de repouso, para nao ter dois
          "flutuantes" na mesma superficie sem dialogo nem menu. */}
      <Card className="mt-6 overflow-hidden border-2 border-primary/20 shadow-lg dark:shadow-[var(--shadow-lg)]" aria-busy={calculando}>
        {/* Linha 1: Total + Métricas — tudo vindo do servidor (calcularSelecaoAction). */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Total selecionado */}
          <div className="flex-shrink-0 min-w-[140px]">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Total a Antecipar
              {calculando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Calculando" />}
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none mt-0.5">
              {formatBRL(totalSelecionado)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
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
                Nenhuma parcela elegível — já antecipadas ou fora do período.
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

          {/* Separador vertical (só desktop) */}
          <div className="hidden sm:block w-px self-stretch bg-border" />

          {/* 3 métricas em grid compacto */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
            <div className="rounded-lg bg-info-bg border border-info px-3 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-info-text">Prazo médio</div>
              <div className="text-xl font-bold text-info-text tabular-nums leading-tight">
                {(calculo?.prazoMedioDias ?? 0).toFixed(1)}<span className="text-xs font-semibold ml-0.5">d</span>
              </div>
              <div className="text-xs text-info-text font-medium mt-0.5">D+1</div>
            </div>
            <div className="rounded-lg bg-warning-bg border border-warning px-3 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-warning-text">Taxa total</div>
              <div className="text-xl font-bold text-warning-text tabular-nums leading-tight">
                {(calculo?.taxaPercent ?? 0).toFixed(2)}<span className="text-xs font-semibold ml-0.5">%</span>
              </div>
              <div className="text-xs text-warning-text font-medium mt-0.5">Smart</div>
            </div>
            <div className="rounded-lg bg-success-bg border border-success px-3 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-success-text">Líquido</div>
              <div className="text-base sm:text-lg font-bold text-success-text tabular-nums leading-tight truncate">
                {formatBRL(calculo?.valorLiquido ?? 0)}
              </div>
              <div className="text-xs text-success-text font-medium mt-0.5">estimado</div>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Linha 2: Ações */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Secundárias */}
          <div className="flex gap-2 sm:flex-shrink-0">
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isProcessing}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-semibold gap-2 cursor-pointer"
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
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-semibold gap-2 cursor-pointer"
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
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-semibold gap-2 cursor-pointer"
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
            className="w-full sm:w-auto sm:ml-auto h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-bold bg-success hover:bg-success/90 active:bg-success/80 text-success-foreground shadow-md dark:shadow-[var(--shadow-md)] hover:shadow-success/30 transition-all gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Enviar ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'itens'} à Prudent`
            )}
          </Button>
        </div>

        {/* Rodapé informativo */}
        <div className="px-4 sm:px-6 pb-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
          <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-info-bg text-xs font-bold text-info-text">i</span>
          Taxa Smart: {TAXA_MENSAL_PADRAO.toFixed(2)}% a.m. · Juros simples &lt; 30 dias · Compostos a partir de 30 dias.
        </div>
      </Card>

      {/* Degrau de repouso (D-03), colapsado de lg para md: card
          secundaria (vencimentos por empresa) na mesma tela da card
          principal acima — a escala e um degrau por nivel, nunca dois
          "flutuantes" na mesma superficie. */}
      {Object.keys(vencimentosPorEmpresa).length > 0 && (
        <Card className="mt-6 border-2 border-warning/20 bg-gradient-to-br from-card to-card-elevated p-6 shadow-md dark:shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-warning-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">Valores a Vencer no Mês por Empresa</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(vencimentosPorEmpresa)
              .sort((a, b) => b[1] - a[1])
              .map(([empresa, valor]) => (
                <div
                  key={empresa}
                  // Sem sombra (D-03): chip tem borda propria e vive dentro
                  // do Card — mesmo plano.
                  className="group relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-warning/50"
                >
                  <div className="text-xs font-medium text-muted-foreground truncate">{empresa}</div>
                  <div className="text-lg font-bold text-warning-text tabular-nums">{formatBRL(valor)}</div>
                </div>
              ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total a vencer no mês</span>
            <span className="text-xl font-bold text-warning-text tabular-nums">
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
      <Card id="fila-antecipacao" tabIndex={-1} className="border-primary/20 scroll-mt-4 focus:outline-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
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
        <CardContent>{fila}</CardContent>
      </Card>
    </div>
  );
}
