'use client';

import { useState } from 'react';
import { ListFilter, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL } from '@/lib/utils';
import { formatarDataPura } from '@/lib/data-pura';
import type { CompradorAntecipacao, ResumoAntecipacaoCompradores } from '@/lib/antecipacao-compradores';

interface Props {
  resumo: ResumoAntecipacaoCompradores;
  /** Chave do comprador que está filtrando a fila, para destacar a linha. */
  compradorNaFila: string | null;
  /** Liga o filtro da fila neste comprador — ou desliga, se já estiver ligado. */
  onVerNaFila: (comprador: CompradorAntecipacao) => void;
}

/** Linhas visíveis antes do "Mostrar todos": a fila, que é a tarefa do dia, fica logo abaixo. */
const LINHAS_INICIAIS = 10;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Busca sem acento e sem caixa: "jose" acha "JOSÉ LOPES DOLZANE". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/**
 * O que já foi antecipado de cada comprador e quantas parcelas faltam — a visão
 * que a equipe montava na planilha somando `ANTECIPAÇÃO OK` e `PENDENTE DE
 * REPASSE` aba por aba. As regras dos baldes moram em `@/lib/antecipacao-compradores`.
 */
export default function AntecipacaoCompradores({ resumo, compradorNaFila, onVerNaFila }: Props) {
  const [busca, setBusca] = useState('');
  const [soPendentes, setSoPendentes] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const { totais } = resumo;

  const termo = normalizar(busca);
  const filtrados = resumo.compradores.filter((c) => {
    if (soPendentes && c.aAntecipar.qtd === 0) return false;
    if (!termo) return true;
    return normalizar(c.nome).includes(termo) || normalizar(c.empresa ?? '').includes(termo);
  });
  // Com busca digitada o usuário já sabe quem procura: mostra tudo que casou.
  const limitar = !mostrarTodos && !termo && filtrados.length > LINHAS_INICIAIS;
  const visiveis = limitar ? filtrados.slice(0, LINHAS_INICIAIS) : filtrados;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          Antecipação por comprador
        </CardTitle>
        <CardDescription>
          Quanto de cada comprador já foi antecipado na Prudent e quantas parcelas ainda faltam antecipar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-success-bg border border-success px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wider text-success-text">Já antecipado</div>
            <div className="text-xl sm:text-2xl font-bold text-success-text tabular-nums leading-tight mt-0.5">
              {formatBRL(totais.antecipadas.valor)}
            </div>
            <div className="text-xs text-success-text font-medium mt-0.5">
              {plural(totais.antecipadas.qtd, 'parcela', 'parcelas')}
            </div>
          </div>
          <div className="rounded-lg bg-warning-bg border border-warning px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wider text-warning-text">Falta antecipar</div>
            <div className="text-xl sm:text-2xl font-bold text-warning-text tabular-nums leading-tight mt-0.5">
              {formatBRL(totais.aAntecipar.valor)}
            </div>
            <div className="text-xs text-warning-text font-medium mt-0.5">
              {plural(totais.aAntecipar.qtd, 'parcela', 'parcelas')} ·{' '}
              {plural(totais.compradoresComPendencia, 'comprador', 'compradores')}
            </div>
          </div>
          {/* Degrau abaixo dos dois primeiros: nao pede acao, so explica a sobra. */}
          <div className="rounded-lg bg-muted px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vencidas sem antecipação</div>
            <div className="text-lg font-bold text-foreground tabular-nums leading-tight mt-0.5">
              {formatBRL(totais.vencidasSemAntecipar.valor)}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">
              {plural(totais.vencidasSemAntecipar.qtd, 'parcela', 'parcelas')} · desconto em folha já ocorreu
            </div>
          </div>
        </div>

        {/* As definicoes ficam junto dos numeros, nao no pe de uma tabela longa. */}
        <Alert variant="info">
          <div className="space-y-1">
            <p>
              <strong className="font-semibold">Falta antecipar</strong> são as parcelas ainda não antecipadas que
              vencem de hoje em diante. As vencidas ficam de fora, mas a fila abaixo ainda deixa incluí-las num lote.
            </p>
            <p>
              Só conta como antecipado o que foi registrado no sistema, pela fila ou nas vendas antigas marcadas como
              antecipadas. O que foi antecipado apenas na planilha ainda não aparece aqui, então o &ldquo;Falta
              antecipar&rdquo; pode estar maior que o real.
            </p>
          </div>
        </Alert>

        {totais.vendasSemParcelas > 0 && (
          <p className="text-xs font-semibold text-warning-text">
            {plural(totais.vendasSemParcelas, 'venda em folha está', 'vendas em folha estão')} sem parcelas
            cadastradas e fora destes números. Cadastre as parcelas na edição da venda para poder antecipar.
          </p>
        )}

        {resumo.compradores.length === 0 ? (
          <EmptyState
            variant="clients"
            size="sm"
            title="Nenhum comprador em desconto em folha"
            description="Quando houver vendas em desconto em folha, o resumo por comprador aparece aqui."
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar comprador ou empresa"
                aria-label="Buscar comprador ou empresa"
                className="sm:max-w-xs"
              />
              <div className="flex items-center gap-2">
                <Switch id="so-pendentes" checked={soPendentes} onCheckedChange={setSoPendentes} />
                <Label htmlFor="so-pendentes" className="text-sm font-medium">
                  Só quem tem parcela a antecipar
                </Label>
              </div>
            </div>

            {filtrados.length === 0 ? (
              <EmptyState
                variant="search"
                size="sm"
                title="Nenhum comprador encontrado"
                description="Ajuste a busca ou desligue o filtro de pendentes."
              />
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprador</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Já antecipado</TableHead>
                      <TableHead className="text-right">Falta antecipar</TableHead>
                      <TableHead className="hidden md:table-cell">Próximo vencimento</TableHead>
                      <TableHead className="w-px">
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiveis.map((c) => {
                      const naFila = compradorNaFila === c.chave;
                      const semSobra = c.vencidasSemAntecipar.qtd === 0 && c.vendasSemParcelas === 0;
                      const tudoAntecipado = c.aAntecipar.qtd === 0 && c.antecipadas.qtd > 0 && semSobra;
                      return (
                        <TableRow
                          key={c.chave}
                          isSelected={naFila}
                          className={naFila ? 'border-l-4 border-l-primary' : undefined}
                        >
                          <TableCell>
                            <div
                              className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-[260px]"
                              title={c.nome}
                            >
                              {c.nome}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {c.empresa || 'Sem empresa'} · {plural(c.vendas, 'venda', 'vendas')}
                              {c.vendasSemParcelas > 0 && ` (${c.vendasSemParcelas} sem parcelas)`}
                            </div>
                            {/* No celular a coluna "Ja antecipado" some; o valor vem aqui. */}
                            {c.antecipadas.qtd > 0 && (
                              <div className="sm:hidden text-xs font-semibold text-success-text tabular-nums">
                                Antecipado: {formatBRL(c.antecipadas.valor)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right tabular-nums">
                            {c.antecipadas.qtd > 0 ? (
                              <>
                                <div className="font-bold text-success-text">{formatBRL(c.antecipadas.valor)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {plural(c.antecipadas.qtd, 'parcela', 'parcelas')}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.aAntecipar.qtd > 0 ? (
                              <>
                                <div className="font-bold text-warning-text">{formatBRL(c.aAntecipar.valor)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {plural(c.aAntecipar.qtd, 'parcela', 'parcelas')}
                                </div>
                              </>
                            ) : tudoAntecipado ? (
                              <span className="text-xs font-semibold text-success-text">Tudo antecipado</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Nada a antecipar</span>
                            )}
                            {c.vencidasSemAntecipar.qtd > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {plural(c.vencidasSemAntecipar.qtd, 'vencida sem antecipação', 'vencidas sem antecipação')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell tabular-nums text-sm text-foreground">
                            {c.aAntecipar.proximoVencimento ? formatarDataPura(c.aAntecipar.proximoVencimento) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant={naFila ? 'default' : 'outline'}
                              size="sm"
                              aria-pressed={naFila}
                              aria-label={`${naFila ? 'Na fila' : 'Ver na fila'}: ${c.nome}`}
                              onClick={() => onVerNaFila(c)}
                              className="gap-1.5"
                            >
                              <ListFilter className="h-4 w-4" />
                              <span className="hidden sm:inline">{naFila ? 'Na fila' : 'Ver na fila'}</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {(limitar || (mostrarTodos && filtrados.length > LINHAS_INICIAIS && !termo)) && (
              <div className="flex justify-center">
                <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarTodos((v) => !v)}>
                  {limitar ? `Mostrar todos os ${filtrados.length} compradores` : 'Mostrar só os primeiros'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
