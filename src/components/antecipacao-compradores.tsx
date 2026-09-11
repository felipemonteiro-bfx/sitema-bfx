'use client';

import { useState } from 'react';
import { ListFilter, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL } from '@/lib/utils';
import { formatarDataPura, formatarMesAnoPuro } from '@/lib/data-pura';
import type {
  CompradorAntecipacao,
  MesAntecipacao,
  ResumoAntecipacaoCompradores,
} from '@/lib/antecipacao-compradores';

interface Props {
  resumo: ResumoAntecipacaoCompradores;
  /** Os mesmos baldes por mês de vencimento — as abas da planilha. */
  meses: MesAntecipacao[];
  /** Dia civil de Manaus (YYYY-MM-DD): separa os meses passados dos que vêm. */
  hoje: string;
  /** Chave do comprador que está filtrando a fila, para destacar a linha. */
  compradorNaFila: string | null;
  /** Liga o filtro da fila neste comprador — ou desliga, se já estiver ligado. */
  onVerNaFila: (comprador: CompradorAntecipacao) => void;
}

/**
 * As tabelas do resumo rolam por dentro, com no máximo 80% da altura da tela e o
 * cabeçalho fixo: dá para correr a lista inteira sem perder de vista os títulos
 * das colunas, e a fila logo abaixo continua a um scroll de distância. O seletor
 * mira o <div> de rolagem que o <Table> cria em volta da <table>.
 */
const TABELA_COM_ROLAGEM = 'rounded-lg border border-border [&>div]:max-h-[80dvh]';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Busca sem acento e sem caixa: "jose" acha "JOSÉ LOPES DOLZANE". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Valor em negrito e a quantidade embaixo — a mesma ordem em toda coluna de dinheiro. */
function CelulaValor({ qtd, valor, tom }: { qtd: number; valor: number; tom: 'success' | 'warning' | 'neutro' }) {
  if (qtd === 0) return <span className="text-muted-foreground">—</span>;
  const cor = tom === 'success' ? 'text-success-text' : tom === 'warning' ? 'text-warning-text' : 'text-foreground';
  return (
    <>
      <div className={`font-bold ${cor}`}>{formatBRL(valor)}</div>
      <div className="text-xs text-muted-foreground">{plural(qtd, 'parcela', 'parcelas')}</div>
    </>
  );
}

/**
 * O que já foi antecipado e o que falta, por comprador e por mês — a visão que a
 * equipe montava na planilha somando `ANTECIPAÇÃO OK` e `PENDENTE DE REPASSE`
 * aba por aba. As regras dos baldes moram em `@/lib/antecipacao-compradores`.
 */
export default function AntecipacaoCompradores({ resumo, meses, hoje, compradorNaFila, onVerNaFila }: Props) {
  const [busca, setBusca] = useState('');
  const [soPendentes, setSoPendentes] = useState(false);
  const [mesesAnteriores, setMesesAnteriores] = useState(false);
  const { totais } = resumo;

  const termo = normalizar(busca);
  // Todos os compradores: a tabela rola por dentro (TABELA_COM_ROLAGEM), sem corte.
  const filtrados = resumo.compradores.filter((c) => {
    if (soPendentes && c.aAntecipar.qtd === 0) return false;
    if (!termo) return true;
    return normalizar(c.nome).includes(termo) || normalizar(c.empresa ?? '').includes(termo);
  });

  const mesAtual = hoje.slice(0, 7);
  const mesesVisiveis = mesesAnteriores ? meses : meses.filter((m) => m.mes >= mesAtual);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          Antecipação: o que já foi e o que falta
        </CardTitle>
        <CardDescription>
          Quanto já foi antecipado na Prudent e quantas parcelas ainda faltam — por comprador ou mês a mês, como
          nas abas da planilha.
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
              As parcelas marcadas como ANTECIPAÇÃO OK na planilha até 11/09/2026 foram registradas aqui quando
              bateram com o sistema (comprador, número da parcela e valor). Parcelas com valor diferente, compras sem
              cadastro e antecipações anotadas só na planilha depois dessa data não aparecem.
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
            description="Quando houver vendas em desconto em folha, o resumo aparece aqui."
          />
        ) : (
          <Tabs defaultValue="comprador" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comprador">Por comprador</TabsTrigger>
              <TabsTrigger value="mes">Por mês</TabsTrigger>
            </TabsList>

            <TabsContent value="comprador" className="space-y-4">
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
                <div className={TABELA_COM_ROLAGEM}>
                  <Table>
                    <TableHeader sticky>
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
                      {filtrados.map((c) => {
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
                              <CelulaValor qtd={c.antecipadas.qtd} valor={c.antecipadas.valor} tom="success" />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {c.aAntecipar.qtd > 0 ? (
                                <CelulaValor qtd={c.aAntecipar.qtd} valor={c.aAntecipar.valor} tom="warning" />
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

            </TabsContent>

            <TabsContent value="mes" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground sm:max-w-xl">
                  O mês aqui é o do <strong className="font-semibold text-foreground">vencimento</strong> no sistema,
                  normalmente o mês seguinte ao do desconto em folha: a aba SETEMBRO da planilha aparece como
                  outubro.
                </p>
                <div className="flex items-center gap-2">
                  <Switch id="meses-anteriores" checked={mesesAnteriores} onCheckedChange={setMesesAnteriores} />
                  <Label htmlFor="meses-anteriores" className="text-sm font-medium">
                    Mostrar meses anteriores
                  </Label>
                </div>
              </div>

              {meses.length === 0 ? (
                <EmptyState
                  variant="calendar"
                  size="sm"
                  title="Nenhuma parcela com vencimento cadastrado"
                  description="As vendas em folha ainda não têm parcelas com data de vencimento."
                />
              ) : mesesVisiveis.length === 0 ? (
                <EmptyState
                  variant="calendar"
                  size="sm"
                  title="Nenhuma parcela a partir deste mês"
                  description="Ligue &ldquo;Mostrar meses anteriores&rdquo; para ver o histórico."
                />
              ) : (
                <div className={TABELA_COM_ROLAGEM}>
                  <Table>
                    <TableHeader sticky>
                      <TableRow>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Já antecipado</TableHead>
                        <TableHead className="text-right">Falta antecipar</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Vencidas sem antecipação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mesesVisiveis.map((m) => (
                        <TableRow key={m.mes} isSelected={m.mes === mesAtual}>
                          <TableCell className="font-semibold text-foreground whitespace-nowrap">
                            {formatarMesAnoPuro(`${m.mes}-01`)}
                            {/* Na linha de baixo: ao lado do mes, a coluna estourava 400px. */}
                            {m.mes === mesAtual && (
                              <div className="text-xs font-medium text-muted-foreground">este mês</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <CelulaValor qtd={m.antecipadas.qtd} valor={m.antecipadas.valor} tom="success" />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <CelulaValor qtd={m.aAntecipar.qtd} valor={m.aAntecipar.valor} tom="warning" />
                            {/* No celular a coluna de vencidas some; sem isto mes passado
                                apareceria so com "—" e as vencidas em lugar nenhum. */}
                            {m.vencidasSemAntecipar.qtd > 0 && (
                              <div className="sm:hidden text-xs text-muted-foreground">
                                {plural(m.vencidasSemAntecipar.qtd, 'vencida', 'vencidas')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right tabular-nums">
                            <CelulaValor
                              qtd={m.vencidasSemAntecipar.qtd}
                              valor={m.vencidasSemAntecipar.valor}
                              tom="neutro"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
