'use client';

import { useState } from 'react';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, FileSpreadsheet, ImageIcon, Loader2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { FormSelect } from "@/components/form-select";
import AntecipacaoCompradores from "@/components/antecipacao-compradores";
import { TAXA_MENSAL_PADRAO, calcularAntecipacao, parsePeriodoMesAno, titulosDeVenda } from "@/lib/antecipacao";
import type { CompradorAntecipacao, MesAntecipacao, ResumoAntecipacaoCompradores } from "@/lib/antecipacao-compradores";
import { formatarDataPura } from "@/lib/data-pura";

interface ParcelaDetalhe {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
  antecipada?: boolean;
}

interface ItemVenda {
  produtoNome: string;
  quantidade: number;
  subtotal: number;
}

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
  itens?: ItemVenda[];
  parcelas_detalhes?: ParcelaDetalhe[];
  /** Mesma chave do resumo por comprador — liga o "Ver na fila" a esta linha. */
  compradorChave: string;
  /** Parcelas ainda não antecipadas que vencem de hoje em diante. */
  faltamAntecipar: number;
  /** Parcelas não antecipadas já vencidas — ainda entram no lote se a venda for selecionada. */
  vencidasSemAntecipar: number;
}

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<void>;
  vencimentosPorEmpresa: Record<string, number>;
  empresasDisponiveis: string[];
  resumoCompradores: ResumoAntecipacaoCompradores;
  /** Os mesmos baldes do resumo, agrupados pelo mês do vencimento. */
  resumoMeses: MesAntecipacao[];
  /** Dia civil de Manaus (YYYY-MM-DD), o mesmo que o servidor usou no resumo. */
  hoje: string;
}

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
  return (
    <Badge className="bg-warning text-warning-foreground border-0 font-semibold text-xs">
      Pendente
    </Badge>
  );
}

export default function AntecipacaoClient({ vendasIniciais, onSubmit, vencimentosPorEmpresa, empresasDisponiveis, resumoCompradores, resumoMeses, hoje }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [periodoInicio, setPeriodoInicio] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  // Comprador escolhido no resumo ("Ver na fila"). O nome e guardado so para o chip.
  const [filtroComprador, setFiltroComprador] = useState<{ chave: string; nome: string } | null>(null);

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

  // Range em UTC, identico ao que a server action `antecipar` usa para escolher as
  // parcelas. Antes o filtro da tela montava o range em horario local e podia
  // divergir da gravacao em parcelas de borda do mes.
  const periodo = parsePeriodoMesAno(periodoInicio, periodoFim);

  // Periodo digitado que o parser recusa (mes 13, intervalo invertido, formato
  // errado). Sem sinalizar, o filtro seria silenciosamente ignorado e a tela
  // mostraria tudo como se o usuario nao tivesse pedido recorte nenhum.
  const periodoInvalido = Boolean((periodoInicio || periodoFim) && !periodo);

  // Filtrar vendas baseado nos filtros ativos
  const vendasFiltradas = vendasIniciais.filter((v) => {
    const passaEmpresa = filtroEmpresa === "todas" || v.empresaConveniada === filtroEmpresa;
    const passaStatus = filtroStatus === "todas" || v.status === filtroStatus;
    const passaComprador = !filtroComprador || v.compradorChave === filtroComprador.chave;

    // Filtro de periodo: se periodo definido, venda precisa ter parcela no range
    let passaPeriodo = true;
    if (periodo && v.parcelas_detalhes && v.parcelas_detalhes.length > 0) {
      // Parcela ja antecipada nao conta: senao a linha aparece como elegivel e o
      // usuario so descobre que nao e ao clicar em Antecipar.
      passaPeriodo = v.parcelas_detalhes.some((p) => {
        if (p.antecipada) return false;
        const d = new Date(p.dataVencimento);
        return d >= periodo.inicio && d <= periodo.fim;
      });
    }

    return passaEmpresa && passaStatus && passaPeriodo && passaComprador;
  });

  const selectedVendas = vendasIniciais.filter(v => selectedIds.includes(v.id));

  // Os titulos que a server action vai antecipar de fato: parcelas ainda nao
  // antecipadas e dentro do periodo filtrado. O calculo antigo usava o valor cheio
  // da venda e um prazo aproximado de 30 dias por parcela, entao divergia do lote.
  const titulosSelecionados = selectedVendas.flatMap((v) => titulosDeVenda(v, periodo));
  const {
    prazoMedioDias: prazoMedio,
    taxaPercent,
    valorBruto: totalSelecionado,
    valorTaxa,
    valorLiquido,
  } = calcularAntecipacao(titulosSelecionados);

  // Parcelas vencidas que a selecao leva ao lote: `titulosDeVenda` e a action nao
  // tem piso de data, enquanto o resumo por comprador as deixa fora do "falta
  // antecipar". Contar aqui evita que o lote as carregue sem ninguem perceber.
  const vencidasNaSelecao = selectedVendas.reduce(
    (total, v) =>
      total +
      (v.parcelas_detalhes ?? []).filter((p) => {
        if (p.antecipada) return false;
        const venc = new Date(p.dataVencimento);
        if (Number.isNaN(venc.getTime())) return false;
        if (periodo && (venc < periodo.inicio || venc > periodo.fim)) return false;
        return p.dataVencimento.slice(0, 10) < hoje;
      }).length,
    0
  );

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
    if (periodoInvalido) {
      toast.error("Período inválido. Use o formato MM/AAAA, com o mês inicial antes do final.");
      return;
    }
    // A action nao encontra parcela elegivel e retorna em silencio: sem este aviso
    // o usuario clica, nada acontece e a tela nao explica por que.
    if (titulosSelecionados.length === 0) {
      toast.error("Nenhuma parcela elegível na seleção — todas já foram antecipadas ou estão fora do período.");
      return;
    }
    // Venda legada sem parcela cadastrada: a tela estima os titulos, mas a action
    // so enxerga linhas reais e retornaria em silencio, limpando a selecao como se
    // tivesse dado certo.
    if (!selectedVendas.some((v) => v.parcelas_detalhes?.some((p) => !p.antecipada))) {
      toast.error("As vendas selecionadas não têm parcelas cadastradas para antecipar.");
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

  const fila = (
    <form action={handleAction}>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresa</label>
          <FormSelect
            name="_filtroEmpresa"
            options={[
              { value: "todas", label: "Todas as empresas" },
              ...empresasDisponiveis.map((e: string) => ({ value: e, label: e })),
            ]}
            value={filtroEmpresa}
            onValueChange={setFiltroEmpresa}
            searchable={empresasDisponiveis.length > 5}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
          <FormSelect
            name="_filtroStatus"
            options={[
              { value: "todas", label: "Todos os status" },
              { value: "pendente", label: "Pendente" },
              { value: "parcialmente_antecipado", label: "Parcialmente antecipado" },
              { value: "em_andamento", label: "Em andamento" },
              { value: "antecipado", label: "Antecipado" },
            ]}
            value={filtroStatus}
            onValueChange={setFiltroStatus}
            searchable={false}
          />
        </div>
        <div className="flex flex-col gap-1">
          {/* O filtro e pelo mes do VENCIMENTO, que o sistema poe no mes seguinte ao
              desconto em folha — "De mes/ano" levava a pedir 09 querendo o desconto de setembro. */}
          <label htmlFor="filtro-vencimento-de" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vencimento de</label>
          <Input
            id="filtro-vencimento-de"
            type="text"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            placeholder="10/2026"
            maxLength={7}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-vencimento-ate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vencimento até</label>
          <Input
            id="filtro-vencimento-ate"
            type="text"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            placeholder="12/2026"
            maxLength={7}
            className="w-28"
          />
        </div>
        {filtroComprador && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comprador</span>
            {/* Par info-bg/info-text, policiado pela catraca de contraste: o
                text-primary sobre bg-primary/10 da pilula de empresa mede 4.39:1. */}
            <div className="flex h-10 items-center gap-1 rounded-md bg-info-bg pl-3 pr-1 text-sm font-semibold text-info-text">
              <span className="truncate max-w-[220px]" title={filtroComprador.nome}>{filtroComprador.nome}</span>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                aria-label="Remover filtro de comprador"
                onClick={() => setFiltroComprador(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {(filtroEmpresa !== "todas" || filtroStatus !== "todas" || periodoInicio !== "" || periodoFim !== "" || filtroComprador) && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-0">.</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground hover:text-foreground"
              onClick={() => { setFiltroEmpresa("todas"); setFiltroStatus("todas"); setPeriodoInicio(""); setPeriodoFim(""); setFiltroComprador(null); }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
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
            <TableHead>Empresa Conveniada</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Parcelas</TableHead>
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
                      ? 'bg-warning-bg border-l-4 border-warning cursor-pointer'
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
                  <TableCell className="text-foreground text-sm truncate max-w-[150px]">{v.clienteNome || '—'}</TableCell>
                  <TableCell className="text-foreground">
                    {v.empresaConveniada ? (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {v.empresaConveniada}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground max-w-[250px]">
                    {v.itens && v.itens.length > 1 ? (
                      // Popover em vez de <details>: expandir empurrava a linha e as
                      // vizinhas para baixo. stopPropagation porque clicar na linha
                      // seleciona a venda, e evento React atravessa o portal do
                      // conteudo ate o <tr>.
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ml-3 gap-1 font-semibold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {v.itens.length} produtos
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80 p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Produtos da venda
                          </div>
                          <ul className="space-y-1.5 text-sm">
                            {v.itens.map((item, idx) => (
                              <li key={idx} className="flex justify-between gap-3">
                                <span className="min-w-0 truncate" title={item.produtoNome}>
                                  {item.produtoNome} <span className="text-muted-foreground">({item.quantidade}x)</span>
                                </span>
                                <span className="tabular-nums shrink-0 font-medium">{formatBRL(item.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                          <Separator className="my-2.5" />
                          {/* So a soma dos itens: o Valor da linha pode incluir frete e desconto. */}
                          <div className="flex justify-between gap-3 text-sm font-bold">
                            <span>Total dos produtos</span>
                            <span className="tabular-nums shrink-0">
                              {formatBRL(v.itens.reduce((soma, item) => soma + item.subtotal, 0))}
                            </span>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : v.itens && v.itens.length === 1 ? (
                      <span className="block truncate" title={v.itens[0].produtoNome}>
                        {v.itens[0].produtoNome}
                      </span>
                    ) : (
                      <span className="block truncate" title={v.produtoNome || ''}>
                        {v.produtoNome || '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-foreground">{formatBRL(v.valorVenda || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {/* Tint opaco (bg-info-bg), nao um composto com alfa da
                        propria matiz: o composto de 20% escurece o proprio tom e
                        trava o texto em 4.02:1 mesmo com --info-text. O tint
                        opaco da 4.59:1 (fase 16, achado 4). */}
                    <span className="inline-flex items-center justify-center rounded-md bg-info-bg px-2 py-0.5 text-xs font-bold text-info-text">
                      {v.parcelas}x
                    </span>
                    {/* "a antecipar" e o PENDENTE DE REPASSE da planilha. As
                        vencidas ficam fora do resumo, mas ainda entram no lote se
                        a venda for selecionada — por isso aparecem aqui tambem. */}
                    {(v.faltamAntecipar > 0 || v.vencidasSemAntecipar > 0) && (
                      <div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                        {v.faltamAntecipar > 0 && `${v.faltamAntecipar} a antecipar`}
                        {v.faltamAntecipar > 0 && v.vencidasSemAntecipar > 0 && " · "}
                        {v.vencidasSemAntecipar > 0 &&
                          `${v.vencidasSemAntecipar} ${v.vencidasSemAntecipar === 1 ? "vencida" : "vencidas"}`}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Degrau de destaque (D-03): esta e a card principal da tela — total
          selecionado + CTA de antecipar. A card de vencimentos abaixo (linha
          ~534) e secundaria e fica no degrau de repouso, para nao ter dois
          "flutuantes" na mesma superficie sem dialogo nem menu. */}
      <Card className="mt-6 overflow-hidden border-2 border-primary/20 shadow-lg dark:shadow-[var(--shadow-lg)]">
        {/* Linha 1: Total + Métricas */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Total selecionado */}
          <div className="flex-shrink-0 min-w-[140px]">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total a Antecipar</div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none mt-0.5">
              {formatBRL(totalSelecionado)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {selectedIds.length} {selectedIds.length === 1 ? 'venda selecionada' : 'vendas selecionadas'}
              {titulosSelecionados.length > 0 && (
                <> · {titulosSelecionados.length} {titulosSelecionados.length === 1 ? 'parcela' : 'parcelas'}</>
              )}
            </div>
            {periodoInvalido && (
              <div className="text-xs font-semibold text-warning-text mt-1">
                Período inválido — informe MM/AAAA, com o mês inicial antes do final.
              </div>
            )}
            {!periodoInvalido && selectedIds.length > 0 && titulosSelecionados.length === 0 && (
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
                {prazoMedio.toFixed(1)}<span className="text-xs font-semibold ml-0.5">d</span>
              </div>
              <div className="text-xs text-info-text font-medium mt-0.5">D+1</div>
            </div>
            <div className="rounded-lg bg-warning-bg border border-warning px-3 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-warning-text">Taxa total</div>
              <div className="text-xl font-bold text-warning-text tabular-nums leading-tight">
                {taxaPercent.toFixed(2)}<span className="text-xs font-semibold ml-0.5">%</span>
              </div>
              <div className="text-xs text-warning-text font-medium mt-0.5">Smart</div>
            </div>
            <div className="rounded-lg bg-success-bg border border-success px-3 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-success-text">Líquido</div>
              <div className="text-base sm:text-lg font-bold text-success-text tabular-nums leading-tight truncate">
                {formatBRL(valorLiquido)}
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
          </div>

          {/* CTA principal */}
          <Button
            disabled={selectedIds.length === 0 || isProcessing}
            className="w-full sm:w-auto sm:ml-auto h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-bold bg-success hover:bg-success/90 active:bg-success/80 text-success-foreground shadow-md dark:shadow-[var(--shadow-md)] hover:shadow-success/30 transition-all gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Antecipar ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'itens'}`
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
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Vendas — Antecipação
          </CardTitle>
        </CardHeader>
        <CardContent>{fila}</CardContent>
      </Card>
    </div>
  );
}
