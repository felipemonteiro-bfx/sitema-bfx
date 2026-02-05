import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { calcularDre, calcularFluxoCaixa } from "@/lib/finance";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { FluxoCharts } from "@/components/finance-charts";
import { QueryTabs } from "@/components/query-tabs";
import { MonthFilter } from "@/components/month-filter";
import { format } from "date-fns";
import Link from "next/link";

type Search = { tab?: string; mes?: string; edit?: string };

async function addDespesa(formData: FormData) {
  "use server";
  const descricao = String(formData.get("descricao") || "");
  const valor = Number(formData.get("valor") || 0);
  const tipo = String(formData.get("tipo") || "Fixa");
  const data = String(formData.get("data") || "");
  if (!descricao || !data) return;
  await prisma.despesa.create({
    data: {
      descricao,
      valor,
      tipo,
      dataDespesa: new Date(data),
    },
  });
  revalidatePath("/financeiro");
}

async function updateDespesa(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const descricao = String(formData.get("descricao") || "");
  const valor = Number(formData.get("valor") || 0);
  const tipo = String(formData.get("tipo") || "Fixa");
  const data = String(formData.get("data") || "");
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
  revalidatePath("/financeiro");
}

async function deleteDespesa(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  await prisma.despesa.delete({ where: { id } });
  revalidatePath("/financeiro");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro e DRE</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de receitas, despesas e caixa.</p>
        </div>
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
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Receita Bruta</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{formatBRL(dre.receita)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Ponto de Equilíbrio</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{formatBRL(dre.pontoEq)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Lucro Líquido</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-success">
                      {formatBRL(dre.lucro)}
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Detalhes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">CMV</div>
                        <div className="mt-1 text-base font-semibold text-destructive">{formatBRL(dre.detalhe.cmv)}</div>
                        <div className="text-xs text-muted-foreground">Custo de mercadorias</div>
                      </div>
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Comissões</div>
                        <div className="mt-1 text-base font-semibold text-destructive">
                          {formatBRL(dre.detalhe.comissoes)}
                        </div>
                        <div className="text-xs text-muted-foreground">Vendas da equipe</div>
                      </div>
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Frete Real</div>
                        <div className="mt-1 text-base font-semibold text-destructive">
                          {formatBRL(dre.detalhe.freteReal)}
                        </div>
                        <div className="text-xs text-muted-foreground">Logística</div>
                      </div>
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Despesas Fixas</div>
                        <div className="mt-1 text-base font-semibold text-destructive">{formatBRL(dre.fixas)}</div>
                        <div className="text-xs text-muted-foreground">Operação mensal</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                      <div className="mt-1 text-base font-semibold text-success">
                        {formatBRL(
                          fluxo.length ? fluxo.reduce((acc, r) => acc + r.entradas, 0) / fluxo.length : 0
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Saída média</div>
                      <div className="mt-1 text-base font-semibold text-rose-600">
                        {formatBRL(
                          fluxo.length ? fluxo.reduce((acc, r) => acc + r.saidas, 0) / fluxo.length : 0
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Saldo médio</div>
                      <div className="mt-1 text-base font-semibold text-slate-700">
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
                            <TableCell className="text-right tabular-nums text-success">
                              {formatBRL(r.entradas)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-rose-700">
                              {formatBRL(r.saidas)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-slate-800">
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
                    <form action={addDespesa} className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                        <Input name="descricao" placeholder="Ex.: Aluguel, frete, comissão" aria-label="Descrição" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Valor</label>
                        <Input name="valor" placeholder="0,00" type="number" step="0.01" aria-label="Valor" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Tipo</label>
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
                        <label className="text-xs font-medium text-muted-foreground">Data</label>
                        <Input name="data" type="date" aria-label="Data" />
                      </div>
                      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
                        <button className={cn(buttonVariants(), "cursor-pointer")}>Lançar despesa</button>
                        <span className="text-xs text-muted-foreground">
                          Campos obrigatórios para cálculo do fluxo.
                        </span>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {editDespesa && (
                  <Card className="mt-4 border-amber-200 bg-amber-50/20">
                    <CardHeader>
                      <CardTitle>Editar Lançamento #{editDespesa.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={updateDespesa} className="grid gap-4 md:grid-cols-4">
                        <input type="hidden" name="id" value={editDespesa.id} />
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                          <Input name="descricao" defaultValue={editDespesa.descricao || ""} aria-label="Descrição" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Valor</label>
                          <Input name="valor" type="number" step="0.01" defaultValue={editDespesa.valor || 0} aria-label="Valor" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
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
                          <label className="text-xs font-medium text-muted-foreground">Data</label>
                          <Input name="data" type="date" defaultValue={editDespesa.dataDespesa.toISOString().slice(0, 10)} aria-label="Data" />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-2">
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
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                  </Link>
                                  <form action={deleteDespesa}>
                                    <input type="hidden" name="id" value={d.id} />
                                    <button 
                                      className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer")} 
                                      title="Excluir"
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
        ]}
      />
    </div>
  );
}