'use client';

import { useState } from 'react';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, ImageIcon, Loader2 } from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { TAXA_MENSAL_PADRAO, calcularAntecipacao, parsePeriodoMesAno, titulosDeVenda } from "@/lib/antecipacao";
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
}

interface Props {
  vendasIniciais: Venda[];
  onSubmit: (formData: FormData) => Promise<void>;
  vencimentosPorEmpresa: Record<string, number>;
  empresasDisponiveis: string[];
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

export default function AntecipacaoClient({ vendasIniciais, onSubmit, vencimentosPorEmpresa, empresasDisponiveis }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [periodoInicio, setPeriodoInicio] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");

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

    return passaEmpresa && passaStatus && passaPeriodo;
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

  return (
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
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">De mês/ano</label>
          <Input
            type="text"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            placeholder="03/2025"
            maxLength={7}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Até mês/ano</label>
          <Input
            type="text"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            placeholder="04/2025"
            maxLength={7}
            className="w-28"
          />
        </div>
        {(filtroEmpresa !== "todas" || filtroStatus !== "todas" || periodoInicio !== "" || periodoFim !== "") && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-0">.</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground hover:text-foreground"
              onClick={() => { setFiltroEmpresa("todas"); setFiltroStatus("todas"); setPeriodoInicio(""); setPeriodoFim(""); }}
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
                      <details className="cursor-pointer">
                        <summary className="truncate text-sm">
                          {v.itens.length} produtos
                        </summary>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {v.itens.map((item, idx) => (
                            <li key={idx} className="flex justify-between gap-2">
                              <span className="truncate">{item.produtoNome} ({item.quantidade}x)</span>
                              <span className="tabular-nums shrink-0">{formatBRL(item.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
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
            {selecionadosOcultos > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
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
}
