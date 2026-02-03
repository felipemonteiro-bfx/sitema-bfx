import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { formatBRL } from "@/lib/utils";
import { calcularDre, calcularFluxoCaixa } from "@/lib/finance";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { FluxoCharts } from "@/components/finance-charts";
import { QueryTabs } from "@/components/query-tabs";

type Search = { tab?: string };

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

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const formatDate = (d: Date) => new Intl.DateTimeFormat("pt-BR").format(d);
  const mesList = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const mes = mesList[0];

  const dre = await calcularDre(mes);
  const fluxo = await calcularFluxoCaixa();
  const despesas = await prisma.despesa.findMany({ orderBy: { dataDespesa: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Financeiro e DRE</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada de receitas, despesas e caixa.</p>
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
                    <CardContent className="text-2xl font-semibold text-emerald-600">
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
                        <div className="mt-1 text-base font-semibold text-red-600">{formatBRL(dre.detalhe.cmv)}</div>
                        <div className="text-xs text-muted-foreground">Custo de mercadorias</div>
                      </div>
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Comissões</div>
                        <div className="mt-1 text-base font-semibold text-red-600">
                          {formatBRL(dre.detalhe.comissoes)}
                        </div>
                        <div className="text-xs text-muted-foreground">Vendas da equipe</div>
                      </div>
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Frete Real</div>
                        <div className="mt-1 text-base font-semibold text-red-600">
                          {formatBRL(dre.detalhe.freteReal)}
                        </div>
                        <div className="text-xs text-muted-foreground">Logística</div>
                      </div>
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Despesas Fixas</div>
                        <div className="mt-1 text-base font-semibold text-red-600">{formatBRL(dre.fixas)}</div>
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
                <CardHeader>
                  <CardTitle>Fluxo de Caixa (6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <FluxoCharts rows={fluxo} />
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
                            <TableCell className="text-right tabular-nums">{formatBRL(r.entradas)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatBRL(r.saidas)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatBRL(r.saldo)}</TableCell>
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
                  <CardHeader>
                    <CardTitle>Nova Despesa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addDespesa} className="grid gap-3 md:grid-cols-4">
                      <Input name="descricao" placeholder="Descrição" aria-label="Descrição" />
                      <Input name="valor" placeholder="Valor" type="number" step="0.01" aria-label="Valor" />
                      <FormSelect
                        name="tipo"
                        options={[
                          { value: "Fixa", label: "Fixa" },
                          { value: "Variável", label: "Variável" },
                        ]}
                        defaultValue="Fixa"
                      />
                      <Input name="data" type="date" aria-label="Data" />
                      <Button className="md:col-span-4">Lançar</Button>
                    </form>
                  </CardContent>
                </Card>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
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
