'use client';

// Aba "Aguardando RH" de /prudent (2026-09-30, Fase 3). Os títulos que saíram no consolidado
// semanal esperam a resposta do RH; a BFX registra aqui a confirmação (libera para a fila da
// Prudent) ou a recusa, com motivo. Os grupos chegam prontos do servidor (`agruparAguardandoRh`).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatBRL } from '@/lib/utils';
import { formatarDataPura } from '@/lib/data-pura';
import type { GrupoAguardandoRh } from '@/lib/confirmacao-rh';
import { confirmarParcelasRh, recusarParcelasRh } from '@/app/(app)/prudent/confirmacao-actions';

const MOTIVO_MIN = 5;

/** "26/09" — o dia do envio, sem ano: o consolidado é sempre recente. */
function diaMes(dataPura: string): string {
  return formatarDataPura(dataPura).slice(0, 5);
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export default function AguardandoRhClient({ grupos }: { grupos: GrupoAguardandoRh[] }) {
  const router = useRouter();
  const [selecionados, setSelecionados] = useState<number[]>([]);
  // Qual ação está gravando: o spinner aparece só no botão clicado, e todos os grupos travam.
  const [gravando, setGravando] = useState<{ chave: string; acao: 'confirmar' | 'recusar' } | null>(null);
  const salvando = gravando !== null;
  // Grupo cuja seleção está sendo recusada (o dialog é um só para a aba).
  const [recusando, setRecusando] = useState<GrupoAguardandoRh | null>(null);
  const [motivo, setMotivo] = useState('');

  if (grupos.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState
          variant="inbox"
          size="sm"
          title="Nenhum título esperando o RH."
          description="Os títulos do consolidado semanal aparecem aqui até a confirmação ou a recusa do RH."
        />
      </Card>
    );
  }

  const idsDoGrupo = (g: GrupoAguardandoRh) => g.titulos.map((t) => t.id);
  const selecaoDoGrupo = (g: GrupoAguardandoRh) => g.titulos.filter((t) => selecionados.includes(t.id));

  const alternar = (id: number) =>
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const alternarGrupo = (g: GrupoAguardandoRh) => {
    const ids = idsDoGrupo(g);
    const todos = ids.every((id) => selecionados.includes(id));
    setSelecionados((prev) => (todos ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };

  const limparGrupo = (g: GrupoAguardandoRh) => {
    const ids = idsDoGrupo(g);
    setSelecionados((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const confirmar = async (g: GrupoAguardandoRh) => {
    const ids = selecaoDoGrupo(g).map((t) => t.id);
    if (ids.length === 0) return;
    setGravando({ chave: g.chave, acao: 'confirmar' });
    try {
      const r = await confirmarParcelasRh(ids);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`${plural(r.confirmadas, 'título confirmado', 'títulos confirmados')} pelo RH. Já entram na fila da Prudent.`);
      limparGrupo(g);
      router.refresh();
    } catch {
      toast.error('Não foi possível registrar a confirmação.');
    } finally {
      setGravando(null);
    }
  };

  const recusar = async () => {
    if (!recusando) return;
    const ids = selecaoDoGrupo(recusando).map((t) => t.id);
    if (ids.length === 0) return;
    setGravando({ chave: recusando.chave, acao: 'recusar' });
    try {
      const r = await recusarParcelasRh(ids, motivo);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`${plural(r.recusadas, 'título recusado', 'títulos recusados')}. Não entram na fila da Prudent.`);
      limparGrupo(recusando);
      setRecusando(null);
      router.refresh();
    } catch {
      toast.error('Não foi possível registrar a recusa.');
    } finally {
      setGravando(null);
    }
  };

  const motivoValido = motivo.trim().length >= MOTIVO_MIN;
  const qtdRecusa = recusando ? selecaoDoGrupo(recusando).length : 0;

  return (
    <div className="space-y-6">
      {grupos.map((g, indice) => {
        const sel = selecaoDoGrupo(g);
        const valorSel = sel.reduce((s, t) => s + Math.round(t.valor * 100), 0) / 100;
        const todos = sel.length === g.titulos.length;
        // Índice e não a chave: a chave tem o nome da empresa, com espaços, e o aria-labelledby
        // leria cada palavra como um id.
        const tituloId = `aguardando-rh-grupo-${indice}`;
        return (
          <Card key={g.chave} role="region" className="overflow-hidden p-2 pt-5" aria-labelledby={tituloId}>
            <div className="px-4 pb-4">
              <h2 id={tituloId} className="text-lg font-semibold text-foreground">
                {g.empresa}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {g.enviadaEm ? `Consolidado enviado ao RH em ${diaMes(g.enviadaEm)}` : 'Ainda não enviado ao RH'}
                {' · '}
                {plural(g.titulos.length, 'título', 'títulos')}
                {' · '}
                <span className="tabular-nums valor-sensivel">{formatBRL(g.total)}</span>
              </p>
            </div>

            <div
              role="toolbar"
              aria-label={`Ações da seleção — ${g.empresa}`}
              className="mb-2 flex flex-wrap items-center gap-3 rounded-interno bg-poco px-4 py-2.5"
            >
              <span className="text-sm font-semibold tabular-nums text-foreground" aria-live="polite">
                {sel.length === 0 ? (
                  <span className="font-normal text-muted-foreground">Nenhum título selecionado</span>
                ) : (
                  <>
                    {plural(sel.length, 'selecionado', 'selecionados')} ·{' '}
                    <span className="valor-sensivel">{formatBRL(valorSel)}</span>
                  </>
                )}
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outlineErro"

                  disabled={sel.length === 0 || salvando}
                  onClick={() => {
                    setMotivo('');
                    setRecusando(g);
                  }}
                >
                  Recusar…
                </Button>
                <Button type="button" className="gap-2" disabled={sel.length === 0 || salvando} onClick={() => confirmar(g)}>
                  {gravando?.chave === g.chave && gravando.acao === 'confirmar' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Confirmar pelo RH
                </Button>
              </div>
            </div>

            <div className="rounded-interno bg-poco">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={todos ? true : sel.length > 0 ? 'indeterminate' : false}
                      onCheckedChange={() => alternarGrupo(g)}
                      disabled={salvando}
                      aria-label={`Selecionar todos os títulos de ${g.empresa}`}
                    />
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="hidden sm:table-cell">Matrícula</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="pr-4 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.titulos.map((t) => {
                  const marcado = selecionados.includes(t.id);
                  return (
                    <TableRow
                      key={t.id}
                      data-state={marcado ? 'selected' : undefined}
                      className="cursor-pointer"
                      onClick={() => !salvando && alternar(t.id)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={marcado}
                          onCheckedChange={() => alternar(t.id)}
                          disabled={salvando}
                          aria-label={`Selecionar ${t.titulo}`}
                        />
                      </TableCell>
                      <TableCell tom="foreground" peso="forte" mono>{t.titulo}</TableCell>
                      <TableCell tom="foreground" className="max-w-55">
                        <span className="block truncate">{t.colaborador || '—'}</span>
                      </TableCell>
                      <TableCell tom="muted" mono className="hidden sm:table-cell">{t.matricula || '—'}</TableCell>
                      <TableCell tom="foreground" mono>{formatarDataPura(t.vencimento)}</TableCell>
                      <TableCell tom="foreground" numeric className="pr-4 valor-sensivel valor-sensivel-fim">
                        {formatBRL(t.valor)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </Card>
        );
      })}

      <p className="max-w-prose text-sm text-muted-foreground">
        Recusar pede o motivo; a parcela recusada não entra na fila da Prudent. Parcelas anteriores a 30/09/2026
        aparecem na fila como “legado — sem confirmação do RH”.
      </p>

      <AlertDialog open={recusando !== null} onOpenChange={(aberto) => !aberto && !salvando && setRecusando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar {plural(qtdRecusa, 'título', 'títulos')}?</AlertDialogTitle>
            <AlertDialogDescription>
              {recusando?.empresa}: {qtdRecusa === 1 ? 'a parcela recusada não entra' : 'as parcelas recusadas não entram'} na
              fila da Prudent. O motivo fica registrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-recusa-rh">Motivo da recusa</Label>
            <Textarea
              id="motivo-recusa-rh"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: colaborador desligado em setembro"
              aria-describedby="motivo-recusa-rh-ajuda"
            />
            <span id="motivo-recusa-rh-ajuda" className="text-xs text-muted-foreground">
              Mínimo de {MOTIVO_MIN} caracteres.
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
            {/* Button e não AlertDialogAction: a Action fecha o dialog no clique, antes da resposta. */}
            <Button type="button" variant="destructive" className="gap-2" onClick={recusar} disabled={!motivoValido || salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Recusar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
