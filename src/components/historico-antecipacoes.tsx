'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBRL } from '@/lib/utils';

interface AntecipacaoItem {
  id: number;
  dataVenda: string | Date;
  clienteNome: string | null;
  empresaConveniada: string | null;
  produtoNome: string | null;
  valorTotal: number;
  parcelas: number | null;
}

interface Props {
  antecipacoes: AntecipacaoItem[];
}

function getMesAno(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMesAnoLabel(value: string): string {
  const [year, month] = value.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year}`;
}

const formatDateBR = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
};

export default function HistoricoAntecipacoes({ antecipacoes }: Props) {
  const mesesDisponiveis = [...new Set(antecipacoes.map((a) => getMesAno(a.dataVenda)))].sort().reverse();
  const [filtroMes, setFiltroMes] = useState<string>('todos');

  const itens = filtroMes === 'todos'
    ? antecipacoes
    : antecipacoes.filter((a) => getMesAno(a.dataVenda) === filtroMes);

  const totalValor = itens.reduce((sum, a) => sum + a.valorTotal, 0);

  return (
    <Card variant="elevated" className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          Historico de Antecipacoes
          {mesesDisponiveis.length > 0 && (
            <div className="ml-auto">
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px]"
              >
                <option value="todos">Todos os meses</option>
                {mesesDisponiveis.map((m) => (
                  <option key={m} value={m}>{getMesAnoLabel(m)}</option>
                ))}
              </select>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm font-medium">
            Nenhuma antecipacao realizada ainda.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Parcelas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground tabular-nums">
                      {formatDateBR(a.dataVenda)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {a.clienteNome || <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      {a.empresaConveniada ? (
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {a.empresaConveniada}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {a.produtoNome || <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-foreground">
                      {formatBRL(a.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.parcelas != null ? (
                        <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                          {a.parcelas}x
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {itens.length} {itens.length === 1 ? 'antecipacao realizada' : 'antecipacoes realizadas'}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums">
                {formatBRL(totalValor)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
