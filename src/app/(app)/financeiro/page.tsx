import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { calcularDre, calcularFluxoCaixa } from "@/lib/finance";
import { calcularMetricasEstoque } from "@/lib/estoque-metrics";
import { revalidarDespesa } from "@/lib/revalidacao";
import { redirect } from "next/navigation";
import { FormSelect } from "@/components/form-select";
import { FluxoCharts } from "@/components/finance-charts";
import { QueryTabs } from "@/components/query-tabs";
import { MonthFilter } from "@/components/month-filter";
import { DateInput } from "@/components/ui/date-input";
import { format } from "date-fns";
import Link from "next/link";
import { createAuditLog } from "@/lib/audit";

type Search = { tab?: string; mes?: string; edit?: string };

/** Título de seção do Vantage (sobrepõe o `font-display` do CardTitle). */
const TITULO_SECAO = "font-sans text-lg font-semibold leading-normal tracking-normal";

async function addDespesa(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const descricao = String(formData.get("descricao") || "");
  const valor = Number(formData.get("valor") || 0);
  const tipo = String(formData.get("tipo") || "Fixa");
  const data = String(formData.get("data") || "");
  const mes = String(formData.get("mes") || "");
  if (!descricao || !data) return;
  const despesa = await prisma.despesa.create({
    data: {
      descricao,
      valor,
      tipo,
      dataDespesa: new Date(data),
    },
  });
  await createAuditLog("despesa:create", { despesaId: despesa.id, descricao, valor, tipo });
  revalidarDespesa();
  redirect(`/financeiro?tab=lanc${mes ? `&mes=${mes}` : ""}`);
}

async function updateDespesa(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const id = Number(formData.get("id") || 0);
  const descricao = String(formData.get("descricao") || "");
  const valor = Number(formData.get("valor") || 0);
  const tipo = String(formData.get("tipo") || "Fixa");
  const data = String(formData.get("data") || "");
  const mes = String(formData.get("mes") || "");
  if (!id || !descricao || !data) return;
  await prisma.despesa.update({
    where: { id },
    data: {
      descricao,
      valor,
      tipo,
      dataDespesa: new Date(data),
    },
  });
  await createAuditLog("despesa:update", { despesaId: id, descricao, valor, tipo });
  revalidarDespesa();
  redirect(`/financeiro?tab=lanc${mes ? `&mes=${mes}` : ""}`);
}

async function deleteDespesa(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const id = Number(formData.get("id") || 0);
  const mes = String(formData.get("mes") || "");
  if (!id) return;
  await prisma.despesa.delete({ where: { id } });
  await createAuditLog("despesa:delete", { despesaId: id });
  revalidarDespesa();
  redirect(`/financeiro?tab=lanc${mes ? `&mes=${mes}` : ""}`);
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const formatDate = (d: Date) => new Intl.DateTimeFormat("pt-BR").format(d);
  
  const currentMes = sp.mes || format(new Date(), "yyyy-MM");
  const editId = sp.edit ? Number(sp.edit) : 0;

  const dre = await calcularDre(currentMes);
  const fluxo = await calcularFluxoCaixa(currentMes);
  
  const [ano, mesNum] = currentMes.split("-").map(Number);
  const ini = new Date(Date.UTC(ano, mesNum - 1, 1, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mesNum, 1, 0, 0, 0));

  const despesas = await prisma.despesa.findMany({ 
    where: { dataDespesa: { gte: ini, lt: fim } },
    orderBy: { dataDespesa: "desc" } 
  });

  const editDespesa = editId ? await prisma.despesa.findUnique({ where: { id: editId } }) : null;

  const produtos = await prisma.produto.findMany({
    select: { nome: true, custoPadrao: true, qtdEstoque: true, valorVenda: true },
  });

  const {
    produtosOrdenados,
    estoqueImobilizado,
    estoquePotencialReceita,
    estoqueMargemPct,
    estoqueItensZerados,
  } = calcularMetricasEstoque(produtos);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro & DRE"
        description="Visão consolidada de receitas, despesas e caixa."
        breadcrumbs={[{ label: "Financeiro & DRE" }]}
        actions={<MonthFilter />}
      />

      <QueryTabs
        defaultTab={sp.tab || "dre"}
        tabs={[
          {
            value: "dre",
            label: "DRE Inteligente",
            content: (
              <div className="space-y-6">
                {(() => {
                  const custoTotal = dre.custosVar + dre.fixas;
                  const pontoEqStatus =
                    dre.pontoEq === 0 ? 'zero'
                    : dre.receita >= dre.pontoEq * 1.2 ? 'green'
                    : dre.receita >= dre.pontoEq ? 'yellow'
                    : 'red';
                  return (
                    <>
                      <section
                        aria-label="Indicadores do período"
                        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
                      >
                        <KpiCard
                          ordem={0}
                          rotulo="Receita bruta"
                          valor={formatBRL(dre.receita)}
                          rodape={`${dre.totalVendas ?? "—"} vendas no período`}
                        />
                        {/* A taxa da Prudent faltava nesta lista desde que
                            `finance.ts` passou a soma-la em `custosVar`: o
                            total ja a incluia e a legenda nao, entao o numero
                            nao batia com a decomposicao que o leitor somava
                            de cabeca. */}
                        <KpiCard
                          ordem={1}
                          rotulo="Custos do período"
                          valor={formatBRL(custoTotal)}
                          rodape="CMV + comissões + frete + taxa Prudent + despesas"
                        />
                        {/* Só o prejuízo ganha cor: o valor do lucro é neutro e fica vermelho quando é negativo. */}
                        <KpiCard
                          ordem={2}
                          rotulo="Lucro líquido"
                          valor={formatBRL(dre.lucro)}
                          className={dre.lucro < 0 ? "[&>div]:text-error-text" : undefined}
                          rodape={
                            <span className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  pontoEqStatus === "green" ? "success"
                                  : pontoEqStatus === "yellow" ? "warning"
                                  : pontoEqStatus === "red" ? "error"
                                  : "outline"
                                }
                                className="whitespace-nowrap"
                              >
                                {pontoEqStatus === "green" ? "Acima do ponto" :
                                 pontoEqStatus === "yellow" ? "No limite" :
                                 pontoEqStatus === "red" ? "Abaixo do ponto" :
                                 "Sem custos fixos"}
                              </Badge>
                              {dre.pontoEq > 0 && (
                                <span className="font-mono">
                                  PE: <span className="valor-sensivel">{formatBRL(dre.pontoEq)}</span>
                                </span>
                              )}
                            </span>
                          }
                        />
                      </section>

                      {/* Detalhes de custos: o painel agrupa, cada item é um card interno neutro.
                          "Custo" fica no rótulo, não na cor. */}
                      <Card className="p-2 pt-5">
                        <CardHeader className="space-y-1 p-0 px-4 pb-4">
                          <CardTitle className={TITULO_SECAO}>Composição dos custos</CardTitle>
                          <p className="text-sm text-muted-foreground">De onde vêm os custos do período e o que está parado em estoque.</p>
                        </CardHeader>
                        <CardContent className="space-y-5 p-0 px-2 pb-2">
                          <div>
                            <p className="mb-2 px-2 text-sm font-medium text-muted-foreground">Custos do período</p>
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-2">
                              {[
                                { rotulo: "CMV", valor: dre.detalhe.cmv, nota: "Custo de mercadorias vendidas" },
                                { rotulo: "Comissões", valor: dre.detalhe.comissoes, nota: "Equipe de vendas" },
                                { rotulo: "Frete real", valor: dre.detalhe.freteReal, nota: "Custo logístico" },
                                { rotulo: "Taxa Prudent", valor: dre.detalhe.taxaAntecipacao, nota: "Antecipação do desconto em folha" },
                                { rotulo: "Despesas fixas", valor: dre.fixas, nota: "Operação mensal" },
                              ].map((item) => (
                                <div key={item.rotulo} className="rounded-interno bg-card-elevated p-4">
                                  <div className="text-sm font-medium text-muted-foreground">{item.rotulo}</div>
                                  <div className="valor-sensivel mt-1 text-base font-semibold font-mono text-foreground">{formatBRL(item.valor)}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">{item.nota}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Capital em estoque — separado, não é custo do período */}
                          <div>
                            <p className="mb-2 px-2 text-sm font-medium text-muted-foreground">Capital imobilizado</p>
                            <div className="flex items-start gap-3 rounded-interno bg-card-elevated p-4">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-muted-foreground">Capital em estoque</div>
                                <div className="valor-sensivel mt-1 text-base font-semibold font-mono text-foreground">{formatBRL(estoqueImobilizado)}</div>
                                <div className="mt-1 text-xs text-muted-foreground">Valor de custo da mercadoria parada em estoque</div>
                              </div>
                              <Badge variant="outline" className="shrink-0">não deduzido do lucro</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            ),
          },
          {
            value: "fluxo",
            label: "Fluxo de Caixa",
            content: (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Fluxo de caixa (6 meses)</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Compare entradas, saídas e saldo mês a mês para identificar sazonalidade.
                    </p>
                  </div>
                  <Badge variant="outline">atualizado automaticamente</Badge>
                </div>

                <FluxoCharts rows={fluxo} />

                <section
                  aria-label="Médias do fluxo de caixa"
                  className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
                >
                  <KpiCard
                    ordem={0}
                    rotulo="Entrada média"
                    valor={formatBRL(fluxo.length ? fluxo.reduce((acc, r) => acc + r.entradas, 0) / fluxo.length : 0)}
                    rodape="por mês no período"
                  />
                  <KpiCard
                    ordem={1}
                    rotulo="Saída média"
                    valor={formatBRL(fluxo.length ? fluxo.reduce((acc, r) => acc + r.saidas, 0) / fluxo.length : 0)}
                    rodape="por mês no período"
                  />
                  <KpiCard
                    ordem={2}
                    rotulo="Saldo médio"
                    valor={formatBRL(fluxo.length ? fluxo.reduce((acc, r) => acc + r.saldo, 0) / fluxo.length : 0)}
                    rodape="por mês no período"
                  />
                </section>

                <Card className="p-2 pt-5">
                  <CardHeader className="p-0 px-4 pb-4">
                    <CardTitle className={TITULO_SECAO}>Mês a mês</CardTitle>
                  </CardHeader>
                  <CardContent className="rounded-interno bg-poco p-0">
                    <Table>
                      <TableHeader>
                        <TableRow semHover>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Entradas</TableHead>
                          <TableHead className="text-right">Saídas</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fluxo.length === 0 ? (
                          <TableRow semHover>
                            <TableCell tom="muted" colSpan={4} className="text-center py-8">
                              Nenhum movimento de caixa no período.
                            </TableCell>
                          </TableRow>
                        ) : (
                          fluxo.map((r) => (
                            <TableRow semHover key={r.mes}>
                              <TableCell mono>{r.mes}</TableCell>
                              <TableCell numeric className="valor-sensivel valor-sensivel-fim">
                                {formatBRL(r.entradas)}
                              </TableCell>
                              <TableCell numeric className="valor-sensivel valor-sensivel-fim">
                                {formatBRL(r.saidas)}
                              </TableCell>
                              <TableCell numeric peso="medio" tom={r.saldo < 0 ? "erro" : "foreground"} className="valor-sensivel valor-sensivel-fim">
                                {formatBRL(r.saldo)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            value: "lanc",
            label: "Lançamentos",
            content: (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="space-y-1">
                    <CardTitle className={TITULO_SECAO}>Nova despesa</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Registre despesas fixas ou variáveis com data de competência.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form action={addDespesa} className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <input type="hidden" name="mes" value={currentMes} />
                      <div className="col-span-2 space-y-1.5 md:col-span-2">
                        <Label htmlFor="add-descricao">Descrição</Label>
                        <Input id="add-descricao" name="descricao" placeholder="Ex.: Aluguel, frete, comissão" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="add-valor">Valor</Label>
                        <Input id="add-valor" name="valor" placeholder="0,00" type="number" step="0.01" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="add-tipo">Tipo</Label>
                        <FormSelect
                          name="tipo"
                          options={[
                            { value: "Fixa", label: "Fixa" },
                            { value: "Variável", label: "Variável" },
                          ]}
                          defaultValue="Fixa"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="add-data">Data</Label>
                        <DateInput name="data" aria-label="Data" />
                      </div>
                      <div className="col-span-1 md:col-span-3 flex items-end gap-3">
                        <button className={cn(buttonVariants(), "cursor-pointer")}>Lançar despesa</button>
                        <span className="hidden md:inline text-xs text-muted-foreground">
                          Campos obrigatórios para cálculo do fluxo.
                        </span>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {editDespesa && (
                  <Card>
                    <CardHeader>
                      <CardTitle className={TITULO_SECAO}>Editar lançamento #{editDespesa.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={updateDespesa} className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <input type="hidden" name="id" value={editDespesa.id} />
                        <input type="hidden" name="mes" value={currentMes} />
                        <div className="col-span-2 space-y-1.5 md:col-span-2">
                          <Label htmlFor="edit-descricao">Descrição</Label>
                          <Input id="edit-descricao" name="descricao" defaultValue={editDespesa.descricao || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-valor">Valor</Label>
                          <Input id="edit-valor" name="valor" type="number" step="0.01" defaultValue={editDespesa.valor || 0} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-tipo">Tipo</Label>
                          <FormSelect
                            name="tipo"
                            options={[
                              { value: "Fixa", label: "Fixa" },
                              { value: "Variável", label: "Variável" },
                            ]}
                            defaultValue={editDespesa.tipo || "Fixa"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-data">Data</Label>
                          <DateInput name="data" defaultValue={editDespesa.dataDespesa.toISOString().slice(0, 10)} aria-label="Data" />
                        </div>
                        <div className="col-span-1 md:col-span-3 flex items-end gap-2">
                          <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar Alterações</button>
                          <Link
                            href={`/financeiro?tab=lanc&mes=${currentMes}`}
                            className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
                          >
                            Cancelar
                          </Link>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <Card className="p-2 pt-5">
                  <CardHeader className="flex-row items-center justify-between space-y-0 p-0 px-4 pb-4">
                    <CardTitle className={TITULO_SECAO}>Despesas</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {despesas.length} {despesas.length === 1 ? "lançamento" : "lançamentos"}
                    </span>
                  </CardHeader>
                  <CardContent className="rounded-interno bg-poco p-0">
                    <Table>
                      <TableHeader>
                        <TableRow semHover>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesas.length === 0 ? (
                          <TableRow semHover>
                            <TableCell tom="muted" colSpan={5} className="text-center py-8">
                              Nenhuma despesa lançada no período.
                            </TableCell>
                          </TableRow>
                        ) : (
                          despesas.map((d) => (
                            <TableRow semHover key={d.id}>
                              <TableCell mono>{formatDate(d.dataDespesa)}</TableCell>
                              <TableCell>{d.descricao}</TableCell>
                              <TableCell><Badge variant="outline">{d.tipo}</Badge></TableCell>
                              <TableCell numeric className="valor-sensivel valor-sensivel-fim">{formatBRL(d.valor || 0)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Link
                                    href={`/financeiro?tab=lanc&mes=${currentMes}&edit=${d.id}`}
                                    className={cn(buttonVariants({ size: "iconSm", variant: "ghost" }), "cursor-pointer")}
                                    title="Editar"
                                    aria-label="Editar despesa"
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                  </Link>
                                  <form action={deleteDespesa}>
                                    <input type="hidden" name="id" value={d.id} />
                                    <input type="hidden" name="mes" value={currentMes} />
                                    <button
                                      className={cn(buttonVariants({ size: "iconSm", variant: "ghost" }), "text-error-text hover:text-error-text cursor-pointer")}
                                      title="Excluir"
                                      aria-label="Excluir despesa"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  </form>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            value: "estoque",
            label: "Estoque",
            content: (
              <div className="space-y-6">
                <section
                  aria-label="Indicadores do estoque"
                  className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
                >
                  <KpiCard ordem={0} rotulo="Valor imobilizado" valor={formatBRL(estoqueImobilizado)} rodape="custo da mercadoria em estoque" />
                  <KpiCard ordem={1} rotulo="Potencial de receita" valor={formatBRL(estoquePotencialReceita)} rodape="se vender todo o estoque" />
                  <KpiCard ordem={2} rotulo="Margem potencial" valor={`${estoqueMargemPct.toFixed(1)}%`} rodape="sobre o potencial de receita" />
                  <KpiCard ordem={3} rotulo="Itens zerados" valor={String(estoqueItensZerados)} valorSensivel={false} rodape="produtos sem estoque" />
                </section>
                <Card className="p-2 pt-5">
                  <CardHeader className="flex-row items-center justify-between space-y-0 p-0 px-4 pb-4">
                    <CardTitle className={TITULO_SECAO}>Produtos em estoque</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {produtosOrdenados.length} {produtosOrdenados.length === 1 ? "produto" : "produtos"}
                    </span>
                  </CardHeader>
                  <CardContent className="rounded-interno bg-poco p-0">
                    <Table>
                      <TableHeader>
                        <TableRow semHover>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Custo unit.</TableHead>
                          <TableHead className="text-right">Valor em estoque</TableHead>
                          <TableHead className="text-right">Preço venda</TableHead>
                          <TableHead className="text-right">Margem %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {produtosOrdenados.length === 0 ? (
                          <TableRow semHover>
                            <TableCell tom="muted" colSpan={6} className="text-center py-8">
                              Nenhum produto cadastrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          produtosOrdenados.map((p) => {
                            const imob = (p.custoPadrao ?? 0) * (p.qtdEstoque ?? 0);
                            const margem = p.valorVenda && p.valorVenda > 0
                              ? ((p.valorVenda - (p.custoPadrao ?? 0)) / p.valorVenda) * 100
                              : 0;
                            return (
                              <TableRow semHover key={p.nome}>
                                <TableCell peso="medio">{p.nome}</TableCell>
                                <TableCell numeric>{p.qtdEstoque ?? 0}</TableCell>
                                <TableCell numeric className="valor-sensivel valor-sensivel-fim">{formatBRL(p.custoPadrao ?? 0)}</TableCell>
                                <TableCell peso="forte" numeric className="valor-sensivel valor-sensivel-fim">{formatBRL(imob)}</TableCell>
                                <TableCell numeric className="valor-sensivel valor-sensivel-fim">{formatBRL(p.valorVenda ?? 0)}</TableCell>
                                <TableCell numeric className="valor-sensivel valor-sensivel-fim">
                                  <span className="inline-flex items-center justify-end gap-2">
                                    {/* A margem baixa vira selo de estado; o número segue neutro. */}
                                    {margem < 15 && <Badge variant="error">baixa</Badge>}
                                    {margem.toFixed(1)}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
