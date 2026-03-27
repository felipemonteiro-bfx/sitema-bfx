'use client';

import { History, FileSpreadsheet, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';

interface Batch {
  id: number;
  criadaEm: Date | string;
  vendaIds: string;
  valorTotal: number;
  quantidadeVendas: number;
  periodoDescricao: string | null;
}

interface Props {
  batches: Batch[];
}

export default function HistoricoAntecipacoes({ batches }: Props) {
  const formatData = (d: Date | string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleExcel = (vendaIds: string) => {
    const ids = JSON.parse(vendaIds).join(',');
    window.location.href = `/api/relatorios/antecipacao-xlsx?ids=${ids}`;
  };

  const handleRelatorio = (vendaIds: string) => {
    const ids = JSON.parse(vendaIds).join(',');
    window.open(`/api/relatorios/antecipacao-imagem?ids=${ids}`, '_blank');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          Histórico de Antecipações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma antecipação realizada ainda.</p>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">#{b.id}</span>
                    <span className="text-xs text-muted-foreground">{formatData(b.criadaEm)}</span>
                  </div>
                  {b.periodoDescricao && (
                    <span className="text-sm font-semibold text-foreground">Período: {b.periodoDescricao}</span>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{b.quantidadeVendas} {b.quantidadeVendas === 1 ? 'venda' : 'vendas'}</span>
                    <span className="font-bold text-success text-sm">{formatBRL(b.valorTotal)}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExcel(b.vendaIds)}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Planilha
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleRelatorio(b.vendaIds)}>
                    <ImageIcon className="h-3.5 w-3.5" />
                    Relatório Visual
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
