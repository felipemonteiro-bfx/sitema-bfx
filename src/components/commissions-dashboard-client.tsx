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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  // Cores usando variáveis CSS para compatibilidade com temas
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.4)',
    'hsl(var(--primary) / 0.25)',
  ];

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
          <CardTitle className="text-lg text-primary">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <FormSelect
                name="vendedorFiltro"
                value={vendedorFiltro}
                onValueChange={setVendedorFiltro}
                options={vendedoresOptions}
                placeholder="Selecione um vendedor"
                searchPlaceholder="Pesquisar vendedor..."
              />
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <DateInput value={dataInicio} onChange={(v) => setDataInicio(v)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <DateInput value={dataFim} onChange={(v) => setDataFim(v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatBRL(totalComissoes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{details.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(commissions.length > 0 ? totalComissoes / commissions.length : 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Comissões por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] min-h-[300px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Carregando gráfico...</div>
            ) : commissions.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados para exibir no gráfico.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <BarChart data={commissions}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="vendedor" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [formatBRL(Number(value)), 'Comissão']}
                  />
                  <Bar dataKey="valorComissao" radius={[4, 4, 0, 0]}>
                    {commissions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Detalhes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Detalhes das Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando dados...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="text-primary font-semibold">Data</TableHead>
                    <TableHead className="text-primary font-semibold">Vendedor</TableHead>
                    <TableHead className="text-primary font-semibold">Cliente</TableHead>
                    <TableHead className="text-primary font-semibold">Produto</TableHead>
                    <TableHead className="text-right text-primary font-semibold">Venda</TableHead>
                    <TableHead className="text-right text-primary font-semibold">Lucro</TableHead>
                    <TableHead className="text-right text-primary font-semibold">Comissão (%)</TableHead>
                    <TableHead className="text-right font-bold text-primary">Valor Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    details.map((d) => (
                      <TableRow key={d.vendaId}>
                        <TableCell>{new Date(d.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{d.vendedor}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{d.cliente}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{d.produto}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(d.valorVenda)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(d.lucroLiquido)}</TableCell>
                        <TableCell className="text-right">{d.percentualComissao}%</TableCell>
                        <TableCell className="text-right font-semibold text-success tabular-nums">{formatBRL(d.valorComissao)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
