'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { TICK_EIXO, TooltipGrafico, currency } from "@/components/finance-charts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/** Título de seção do Vantage (sobrepõe o `font-display` do CardTitle). */
const TITULO_SECAO = "font-sans text-lg font-semibold leading-normal tracking-normal";
/** Rótulo de campo em frase normal: o `Label` base ainda vem em caixa-alta. */
const ROTULO = "text-sm font-medium normal-case tracking-normal";

interface Props {
  vendedores: string[];
}

export default function CommissionsDashboardClient({ vendedores: vendedoresFromDb }: Props) {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (vendedorFiltro !== 'all') queryParams.append('vendedor', vendedorFiltro);
      if (dataInicio) queryParams.append('dataInicio', dataInicio);
      if (dataFim) queryParams.append('dataFim', dataFim);

      const [commRes, detailsRes] = await Promise.all([
        fetch(`/api/comissoes?${queryParams.toString()}`),
        fetch(`/api/comissoes/detalhe?${queryParams.toString()}`)
      ]);

      const commData = await commRes.json();
      const detailsData = await detailsRes.json();

      if (!commRes.ok) {
        toast.error(commData?.error ?? "Erro ao buscar comissões.");
      }
      if (!detailsRes.ok) {
        toast.error(detailsData?.error ?? "Erro ao buscar detalhes de comissões.");
      }

      setCommissions(Array.isArray(commData) ? commData : []);
      setDetails(Array.isArray(detailsData) ? detailsData : []);
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
    } finally {
      setLoading(false);
    }
  }, [vendedorFiltro, dataInicio, dataFim]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const totalComissoes = commissions.reduce((sum, item) => sum + item.valorComissao, 0);
  const vendedores = ["all", ...(vendedoresFromDb || [])];
  const vendedoresOptions = vendedores.map((v) => ({
    value: v,
    label: v === "all" ? "Todos os Vendedores" : v,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Comissões"
        description="Visão geral e detalhada das comissões de vendas."
        breadcrumbs={[{ label: "Comissões" }]}
      />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className={TITULO_SECAO}>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={ROTULO}>Vendedor</Label>
              <FormSelect
                name="vendedorFiltro"
                value={vendedorFiltro}
                onValueChange={setVendedorFiltro}
                options={vendedoresOptions}
                placeholder="Selecione um vendedor"
                searchPlaceholder="Pesquisar vendedor..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className={ROTULO}>Data Início</Label>
              <DateInput value={dataInicio} onChange={(v) => setDataInicio(v)} />
            </div>
            <div className="space-y-1.5">
              <Label className={ROTULO}>Data Fim</Label>
              <DateInput value={dataFim} onChange={(v) => setDataFim(v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores: um painel, cartões internos em grade que quebra sozinha. */}
      <section
        aria-label="Resumo das comissões"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
      >
        <KpiCard ordem={0} rotulo="Total de comissões" valor={formatBRL(totalComissoes)} rodape="soma do período filtrado" />
        <KpiCard
          ordem={1}
          rotulo="Total de vendas"
          valor={String(details.length)}
          valorSensivel={false}
          rodape="vendas com comissão"
        />
        <KpiCard
          ordem={2}
          rotulo="Média por vendedor"
          valor={formatBRL(commissions.length > 0 ? totalComissoes / commissions.length : 0)}
          rodape={`${commissions.length} ${commissions.length === 1 ? "vendedor" : "vendedores"}`}
        />
      </section>

      {/* Gráfico de Comissões: poço rebaixado, barras em verde da marca, eixos em mono. */}
      <Card className="p-2 pt-5">
        <CardHeader className="p-0 px-4 pb-4">
          <CardTitle className={TITULO_SECAO}>Comissões por vendedor</CardTitle>
        </CardHeader>
        <CardContent className="rounded-interno bg-poco px-2 pb-3 pt-5 sm:px-4">
          <div className="h-75 min-h-75 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Carregando gráfico...</div>
            ) : commissions.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados para exibir no gráfico.</div>
            ) : (
              <div className="bloco-sensivel h-full w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <BarChart data={commissions} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="var(--grafico-trilha)" />
                    <XAxis dataKey="vendedor" tick={TICK_EIXO} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK_EIXO} tickLine={false} axisLine={false} width={84} tickFormatter={(value) => currency(Number(value))} />
                    <Tooltip content={<TooltipGrafico />} cursor={{ fill: "var(--grafico-trilha)", opacity: 0.45 }} />
                    <Bar dataKey="valorComissao" name="Comissão" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Detalhes */}
      <Card className="p-2 pt-5">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-0 px-4 pb-4">
          <CardTitle className={TITULO_SECAO}>Detalhes das comissões</CardTitle>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {details.length} {details.length === 1 ? "venda" : "vendas"}
            </span>
          )}
        </CardHeader>
        <CardContent className="rounded-interno bg-poco p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando dados...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Comissão (%)</TableHead>
                  <TableHead className="text-right">Valor comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((d) => (
                    <TableRow key={d.vendaId} className="hover:bg-transparent">
                      <TableCell className="font-mono">{new Date(d.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{d.vendedor}</TableCell>
                      <TableCell className="max-w-37.5 truncate">{d.cliente}</TableCell>
                      <TableCell className="max-w-37.5 truncate">{d.produto}</TableCell>
                      <TableCell className="valor-sensivel valor-sensivel-fim text-right font-mono">{formatBRL(d.valorVenda)}</TableCell>
                      <TableCell className="valor-sensivel valor-sensivel-fim text-right font-mono">{formatBRL(d.lucroLiquido)}</TableCell>
                      <TableCell className="text-right font-mono">{d.percentualComissao}%</TableCell>
                      <TableCell className="valor-sensivel valor-sensivel-fim text-right font-semibold font-mono">{formatBRL(d.valorComissao)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
