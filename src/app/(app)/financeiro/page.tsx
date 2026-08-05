import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { calcularDre, calcularFluxoCaixa } from "@/lib/finance";
import { calcularMetricasEstoque } from "@/lib/estoque-metrics";
import { revalidatePath } from "next/cache";
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
  revalidatePath("/financeiro");
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
  revalidatePath("/financeiro");
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
  revalidatePath("/financeiro");
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Financeiro e DRE"
          description="Visão consolidada de receitas, despesas e caixa."
          breadcrumbs={[{ label: "Financeiro e DRE" }]}
        />
        <MonthFilter />
      </div>

      <QueryTabs
        defaultTab={sp.tab || "dre"}
        tabs={[
          {
            value: "dre",
            label: "DRE Inteligente",
            content: (
              <>
                {(() => {
                  const custoTotal = dre.custosVar + dre.fixas;
                  const pontoEqStatus =
                    dre.pontoEq === 0 ? 'zero'
                    : dre.receita >= dre.pontoEq * 1.2 ? 'green'
                    : dre.receita >= dre.pontoEq ? 'yellow'
                    : 'red';
                  return (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Receita */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{formatBRL(dre.receita)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{dre.totalVendas ?? '—'} vendas no período</div>
                          </CardContent>
                        </Card>

                        {/* Custos */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Custos do Período</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums text-destructive">{formatBRL(custoTotal)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              CMV + comissões + frete + despesas
                            </div>
                          </CardContent>
                        </Card>

                        {/* Lucro + Ponto de Equilíbrio */}
                        <Card className={cn(
                          dre.lucro < 0 ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10" :
                          dre.lucro === 0 ? "border-warning/30 bg-warning/5" : ""
                        )}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={cn("text-2xl font-bold tabular-nums", dre.lucro >= 0 ? "text-success-text" : "text-destructive")}>
                              {formatBRL(dre.lucro)}
                            </div>
                            {/* Ponto de Equilíbrio indicator */}
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                pontoEqStatus === 'green' ? "bg-success/10 text-success-text dark:bg-success/20" :
                                pontoEqStatus === 'yellow' ? "bg-warning/10 text-warning-text dark:bg-warning/20" :
                                pontoEqStatus === 'red' ? "bg-destructive/10 text-destructive dark:bg-destructive/20" :
                                "bg-muted text-muted-foreground"
                              )}>
                                <span className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  pontoEqStatus === 'green' ? "bg-success" :
                                  pontoEqStatus === 'yellow' ? "bg-warning" :
                                  pontoEqStatus === 'red' ? "bg-destructive" : "bg-muted-foreground"
                                )} />
                                {pontoEqStatus === 'green' ? "Acima do ponto" :
                                 pontoEqStatus === 'yellow' ? "No limite" :
                                 pontoEqStatus === 'red' ? "Abaixo do ponto" :
                                 "Sem custos fixos"}
                              </span>
                              {dre.pontoEq > 0 && (
                                <span className="text-xs text-muted-foreground">PE: {formatBRL(dre.pontoEq)}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detalhes de custos */}
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle>Composição dos Custos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Custos do período */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Custos do período</p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                <div className="text-xs text-muted-foreground">CMV</div>
                                <div className="mt-0.5 text-base font-semibold tabular-nums text-destructive">{formatBRL(dre.detalhe.cmv)}</div>
                                <div className="text-xs text-muted-foreground">Custo de mercadorias vendidas</div>
                              </div>
                              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                <div className="text-xs text-muted-foreground">Comissões</div>
                                <div className="mt-0.5 text-base font-semibold tabular-nums text-destructive">{formatBRL(dre.detalhe.comissoes)}</div>
                                <div className="text-xs text-muted-foreground">Equipe de vendas</div>
                              </div>
                              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                <div className="text-xs text-muted-foreground">Frete Real</div>
                                <div className="mt-0.5 text-base font-semibold tabular-nums text-destructive">{formatBRL(dre.detalhe.freteReal)}</div>
                                <div className="text-xs text-muted-foreground">Custo logístico</div>
                              </div>
                              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                <div className="text-xs text-muted-foreground">Despesas Fixas</div>
                                <div className="mt-0.5 text-base font-semibold tabular-nums text-destructive">{formatBRL(dre.fixas)}</div>
                                <div className="text-xs text-muted-foreground">Operação mensal</div>
                              </div>
                            </div>
                          </div>

                          {/* Capital em estoque — separado, não é custo do período */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Capital imobilizado</p>
                            <div className="rounded-lg border border-warning/20 bg-warning/5 dark:bg-warning/10 p-3 flex items-start gap-3">
                              <div className="flex-1">
                                <div className="text-xs text-muted-foreground">Capital em Estoque</div>
                                <div className="mt-0.5 text-base font-semibold tabular-nums text-warning-text">{formatBRL(estoqueImobilizado)}</div>
                                <div className="text-xs text-muted-foreground">Valor de custo da mercadoria parada em estoque</div>
                              </div>
                              <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-text dark:bg-warning/20">
                                não deduzido do lucro
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </>
            ),
          },
          {
            value: "fluxo",
            label: "Fluxo de Caixa",
            content: (
              <Card>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Fluxo de Caixa (6 meses)</CardTitle>
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      atualizado automaticamente
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compare entradas, saídas e saldo mês a mês para identificar sazonalidade.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm">
                    <FluxoCharts rows={fluxo} />
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Entrada média</div>
                      <div className="mt-1 text-base font-semibold tabular-nums text-success-text">
                        {formatBRL(
                          fluxo.length ? fluxo.reduce((acc, r) => acc + r.entradas, 0) / fluxo.length : 0
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Saída média</div>
                      <div className="mt-1 text-base font-semibold tabular-nums text-destructive">
                        {formatBRL(
                          fluxo.length ? fluxo.reduce((acc, r) => acc + r.saidas, 0) / fluxo.length : 0
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Saldo médio</div>
                      <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                        {formatBRL(
                          fluxo.length ? fluxo.reduce((acc, r) => acc + r.saldo, 0) / fluxo.length : 0
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6" />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead className="text-right">Entradas</TableHead>
                        <TableHead className="text-right">Saídas</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fluxo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Sem dados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fluxo.map((r) => (
                          <TableRow key={r.mes}>
                            <TableCell>{r.mes}</TableCell>
                            <TableCell className="text-right tabular-nums text-success-text">
                              {formatBRL(r.entradas)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">
                              {formatBRL(r.saidas)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-foreground">
                              {formatBRL(r.saldo)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "lanc",
            label: "Lançamentos",
            content: (
              <>
                <Card>
                  <CardHeader className="space-y-1">
                    <CardTitle>Nova Despesa</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Registre despesas fixas ou variáveis com data de competência.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form action={addDespesa} className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <input type="hidden" name="mes" value={currentMes} />
                      <div className="col-span-2 space-y-1 md:col-span-2">
                        <Label htmlFor="add-descricao">Descrição</Label>
                        <Input id="add-descricao" name="descricao" placeholder="Ex.: Aluguel, frete, comissão" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="add-valor">Valor</Label>
                        <Input id="add-valor" name="valor" placeholder="0,00" type="number" step="0.01" />
                      </div>
                      <div className="space-y-1">
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
                      <div className="space-y-1">
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
                  <Card className="mt-4 border-warning/20 bg-warning/5">
                    <CardHeader>
                      <CardTitle>Editar Lançamento #{editDespesa.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={updateDespesa} className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <input type="hidden" name="id" value={editDespesa.id} />
                        <input type="hidden" name="mes" value={currentMes} />
                        <div className="col-span-2 space-y-1 md:col-span-2">
                          <Label htmlFor="edit-descricao">Descrição</Label>
                          <Input id="edit-descricao" name="descricao" defaultValue={editDespesa.descricao || ""} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-valor">Valor</Label>
                          <Input id="edit-valor" name="valor" type="number" step="0.01" defaultValue={editDespesa.valor || 0} />
                        </div>
                        <div className="space-y-1">
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
                        <div className="space-y-1">
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

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Despesas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Sem dados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          despesas.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell>{formatDate(d.dataDespesa)}</TableCell>
                              <TableCell>{d.descricao}</TableCell>
                              <TableCell>{d.tipo}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatBRL(d.valor || 0)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Link
                                    href={`/financeiro?tab=lanc&mes=${currentMes}&edit=${d.id}`}
                                    className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "cursor-pointer")}
                                    title="Editar"
                                    aria-label="Editar despesa"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                  </Link>
                                  <form action={deleteDespesa}>
                                    <input type="hidden" name="id" value={d.id} />
                                    <input type="hidden" name="mes" value={currentMes} />
                                    <button
                                      className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer")}
                                      title="Excluir"
                                      aria-label="Excluir despesa"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
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
              </>
            ),
          },
          {
            value: "estoque",
            label: "Estoque",
            content: (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Valor Imobilizado</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums text-warning-text">{formatBRL(estoqueImobilizado)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Potencial de Receita</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums text-success-text">{formatBRL(estoquePotencialReceita)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Margem Potencial</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums">{estoqueMargemPct.toFixed(1)}%</CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Itens Zerados</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums text-destructive">{estoqueItensZerados}</CardContent>
                  </Card>
                </div>
                <Card className="mt-4">
                  <CardHeader><CardTitle>Produtos em Estoque</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              Sem produtos cadastrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          produtosOrdenados.map((p) => {
                            const imob = (p.custoPadrao ?? 0) * (p.qtdEstoque ?? 0);
                            const margem = p.valorVenda && p.valorVenda > 0
                              ? ((p.valorVenda - (p.custoPadrao ?? 0)) / p.valorVenda) * 100
                              : 0;
                            return (
                              <TableRow key={p.nome}>
                                <TableCell className="font-medium">{p.nome}</TableCell>
                                <TableCell className="text-right tabular-nums">{p.qtdEstoque ?? 0}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatBRL(p.custoPadrao ?? 0)}</TableCell>
                                <TableCell className="text-right tabular-nums font-semibold text-warning-text">{formatBRL(imob)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatBRL(p.valorVenda ?? 0)}</TableCell>
                                <TableCell className={cn("text-right tabular-nums font-medium", margem >= 30 ? "text-success-text" : margem >= 15 ? "text-warning-text" : "text-destructive")}>
                                  {margem.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}