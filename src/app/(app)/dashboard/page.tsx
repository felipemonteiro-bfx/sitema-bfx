import { prisma } from "@/lib/db";
import { Label } from "@/components/ui/label";
import { calcularMetricasPeriodo } from "@/lib/finance";
import { requireAdmin } from "@/lib/guards";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VendorMultiSelect } from "@/components/vendor-multiselect";
import { TopProdutos } from "@/components/dashboard-charts";
import { EvolucaoMensal } from "@/components/evolucao-mensal";
import { ClientesMesAMes } from "@/components/clientes-mes-a-mes";
import { KpiCard } from "@/components/kpi-card";
import { PeriodoSegmentado } from "@/components/periodo-segmentado";
import { clientesNoPeriodo, serieMensalClientes } from "@/lib/dashboard-clientes-db";
import { periodoAnteriorComparavel, ultimoDiaDoPeriodo, variacao } from "@/lib/dashboard-clientes";
import { ehMesEmAndamento, mesesRecentes, periodosRapidos, rotuloPeriodo } from "@/lib/dashboard-periodo";
import { DateInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { Filter, Megaphone } from "lucide-react";

type Search = {
  from?: string;
  to?: string;
  vendors?: string;
};

function parseVendors(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseDateStart(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
}

function parseDateEnd(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // exclusivo: início do dia seguinte, para usar com lt
  const endDate = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return endDate;
}


export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const today = new Date();
  const start = sp.from ? parseDateStart(sp.from) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = sp.to ? parseDateEnd(sp.to) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0, 0));

  const allVendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const vendedorList = allVendedores.map((v) => v.nomeExibicao || v.username).filter(Boolean) as string[];
  const selectedVendors = parseVendors(sp.vendors);
  const hasVendedorFilter = sp.vendors !== undefined && sp.vendors !== "";
  const isSubsetOfVendedores = selectedVendors.length > 0 && selectedVendors.length < vendedorList.length;
  const vendorsFilter = hasVendedorFilter && isSubsetOfVendedores ? selectedVendors : undefined;

  const metrics = await calcularMetricasPeriodo(start, end, vendorsFilter);
  const { receita: totalReceita, lucro, porVendedor } = metrics;
  const margem = metrics.margemPct * 100;
  const peds = metrics.totalVendas;
  const tik = peds ? totalReceita / peds : 0;

  // Comparação com o mesmo intervalo um mês antes (1–25/set → 1–25/ago).
  const anterior = periodoAnteriorComparavel(start, end);
  const meses = mesesRecentes(today);
  const [metricsAnt, clientes, clientesAnt, serieClientes, metricasMeses] = await Promise.all([
    calcularMetricasPeriodo(anterior.inicio, anterior.fim, vendorsFilter),
    clientesNoPeriodo(start, end, vendorsFilter),
    clientesNoPeriodo(anterior.inicio, anterior.fim, vendorsFilter),
    // A série segue hoje, como o gráfico de faturamento — não o filtro de datas.
    serieMensalClientes(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))),
    // Série mensal do gráfico e dos KPIs: respeita o filtro de vendedores, como o resto da página.
    Promise.all(meses.map((mes) => calcularMetricasPeriodo(mes.inicio, mes.fim, vendorsFilter))),
  ]);
  const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
  const baseComparacao = `vs ${diaMes.format(anterior.inicio).replace(".", "").replace(" de ", "/")}–${diaMes
    .format(new Date(anterior.fim.getTime() - 1))
    .replace(".", "")
    .replace(" de ", "/")}`;
  const variacaoKpi = (atual: number, antes: number) => {
    const v = variacao(atual, antes);
    return v.percentual === null ? null : { percentual: v.percentual, rotulo: baseComparacao };
  };

  const teamRows = Object.entries(porVendedor)
    .map(([vendedor, r]) => ({
      vendedor,
      total: r.total,
      vendas: r.vendas,
      margem: r.total > 0 ? (r.lucroLiquido / r.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const vendasProd = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: start, lt: end },
      // Mesmo critério do resto do dashboard: cancelada/estornada não entra no top.
      status: { not: { in: ["cancelada", "estornada"] } },
      vendedor: vendorsFilter ? { in: vendorsFilter } : undefined,
    },
    select: {
      produtoNome: true,
      itens: { select: { produtoNome: true, quantidade: true } },
    },
  });
  const prodCount: Record<string, number> = {};
  vendasProd.forEach((v) => {
    if (v.itens && v.itens.length > 0) {
      v.itens.forEach((i) => {
        const name = i.produtoNome || "Produto";
        prodCount[name] = (prodCount[name] || 0) + (i.quantidade || 1);
      });
    } else {
      const name = v.produtoNome || "Produto";
      prodCount[name] = (prodCount[name] || 0) + 1;
    }
  });
  const topProd = Object.entries(prodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  // Evolução mensal: o custo é o custo variável do mês e o topo verde é a margem de contribuição.
  const evoMeses = metricasMeses.map((m, i) => ({
    rotulo: meses[i].rotulo,
    rotuloCompleto: meses[i].rotuloCompleto,
    faturamento: m.receita,
    custoVariavel: m.custosVar,
    margem: m.margem,
  }));

  // `end` é exclusivo (início do dia seguinte): o que o usuário filtrou é o dia anterior.
  // Usar `end` direto fazia o campo "Fim" andar um dia a cada Filtrar.
  const currentFromStr = start.toISOString().slice(0, 10);
  const currentToStr = ultimoDiaDoPeriodo(end);
  const hojeStr = today.toISOString().slice(0, 10);
  const periodos = periodosRapidos(hojeStr, { from: currentFromStr, to: currentToStr }, sp.vendors);
  const mesEmAndamento = ehMesEmAndamento(currentFromStr, currentToStr, hojeStr);

  const avisos = await prisma.aviso.findMany({
    where: { ativo: 1 },
    orderBy: { dataCriacao: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Executivo"
        breadcrumbs={[{ label: rotuloPeriodo(currentFromStr, currentToStr) }]}
        selo={
          mesEmAndamento ? (
            <Badge variant="marca" size="lg" className="gap-2 font-semibold">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              Mês em andamento
            </Badge>
          ) : undefined
        }
        actions={
          // `flex-wrap`: em 360px o segmentado e o botão Filtros não cabem lado a lado.
          <div className="flex flex-wrap items-center gap-2">
            <PeriodoSegmentado periodos={periodos} />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12" leftIcon={<Filter className="h-4 w-4" />}>
                  Filtros
                  {vendorsFilter && (
                    <span className="size-2 rounded-full bg-primary" aria-label="Filtro de vendedores ativo" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[22rem]">
                {/* Formulário GET: continua funcionando sem JS e leva `vendors` na URL como antes. */}
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="filter-from" >Início</Label>
                      <DateInput id="filter-from" name="from" defaultValue={currentFromStr} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="filter-to" >Fim</Label>
                      <DateInput id="filter-to" name="to" defaultValue={currentToStr} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-vendors" >Vendedores</Label>
                    <VendorMultiSelect
                      id="filter-vendors"
                      name="vendors"
                      vendors={vendedorList}
                      defaultSelected={vendorsFilter ?? vendedorList}
                    />
                  </div>
                  <Button type="submit" className="h-10 w-full">
                    Aplicar
                  </Button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      {avisos.length > 0 && (
        <Card className="anim-entrada p-2 pt-5" style={{ "--i": 0 } as React.CSSProperties}>
          <CardHeader className="p-0 px-4 pb-4">
            <CardTitle className="flex items-center gap-2 font-sans text-lg font-semibold leading-normal tracking-normal">
              <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
              Mural de Avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="rounded-interno bg-poco p-0 py-1">
            <ul className="divide-y divide-divisoria">
              {avisos.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(a.dataCriacao)}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-foreground">{a.mensagem || ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {peds === 0 ? (
        <EmptyState
          variant="sales"
          title="Nenhuma venda encontrada"
          description="Não há vendas registradas no período selecionado. Ajuste o período ou os filtros, ou comece a registrar novas vendas."
          action={{
            label: "Nova Venda",
            href: "/venda-rapida"
          }}
        />
      ) : (
        <>
          {/* Painel dos indicadores: os cartões internos ficam num painel só, em grade que quebra sozinha. */}
          <section
            aria-label="Indicadores do período"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
          >
            <KpiCard
              ordem={0}
              rotulo="Faturamento"
              valor={formatBRL(totalReceita)}
              rodape={`${peds} ${peds === 1 ? "venda" : "vendas"} · ${clientes.total} ${clientes.total === 1 ? "cliente" : "clientes"}`}
              variacao={variacaoKpi(totalReceita, metricsAnt.receita)}
              serie={metricasMeses.map((m) => m.receita)}
            />
            <KpiCard
              ordem={1}
              rotulo="Lucro líquido"
              valor={formatBRL(lucro)}
              rodape="após despesas do mês"
              variacao={variacaoKpi(lucro, metricsAnt.lucro)}
              serie={metricasMeses.map((m) => m.lucro)}
            />
            <KpiCard
              ordem={2}
              rotulo="Margem"
              valor={`${margem.toFixed(1).replace(".", ",")}%`}
              rodape={
                <>
                  ticket <span className="valor-sensivel">{formatBRL(tik)}</span>
                </>
              }
              serie={metricasMeses.map((m) => m.margemPct * 100)}
            />
            <KpiCard
              ordem={3}
              rotulo="Clientes"
              valor={String(clientes.total)}
              valorSensivel={false}
              rodape={`${clientes.novos} ${clientes.novos === 1 ? "novo" : "novos"} · ${clientes.recorrentes} ${clientes.recorrentes === 1 ? "recorrente" : "recorrentes"}`}
              variacao={variacaoKpi(clientes.total, clientesAnt.total)}
              serie={serieClientes.map((m) => m.total)}
            />
          </section>

          <div className="anim-entrada" style={{ "--i": 4 } as React.CSSProperties}>
            <EvolucaoMensal meses={evoMeses} />
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
            <Card className="anim-entrada p-2 pt-5" style={{ "--i": 5 } as React.CSSProperties}>
              <CardHeader className="flex-row items-center justify-between space-y-0 p-0 px-4 pb-4">
                <CardTitle className="font-sans text-lg font-semibold leading-normal tracking-normal">Raio-X da equipe</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {teamRows.length} {teamRows.length === 1 ? "vendedor" : "vendedores"}
                </span>
              </CardHeader>
              <CardContent className="rounded-interno bg-poco p-0">
                <Table className="[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4">
                  <TableHeader>
                    <TableRow semHover>
                      <TableHead tamanho="sm">Vendedor</TableHead>
                      <TableHead tamanho="sm" className="text-right max-sm:hidden">Vendas</TableHead>
                      <TableHead tamanho="sm" className="text-right">Faturamento</TableHead>
                      <TableHead tamanho="sm">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamRows.map((r) => (
                      <TableRow semHover key={r.vendedor}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-marca-tint text-xs font-bold text-marca-tint-texto"
                            >
                              {r.vendedor.trim().charAt(0).toUpperCase() || "?"}
                            </span>
                            <span className="max-w-20 truncate sm:max-w-40" title={r.vendedor}>
                              {r.vendedor}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell numeric className="max-sm:hidden">{r.vendas}</TableCell>
                        <TableCell numeric className="whitespace-nowrap">
                          <span className="valor-sensivel valor-sensivel-fim">{formatBRL(r.total)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="bloco-sensivel hidden h-1.5 min-w-12 flex-1 overflow-hidden rounded-sm bg-grafico-trilha sm:block"
                            >
                              <span
                                className="block h-full w-(--w) rounded-sm bg-primary"
                                style={{ "--w": `${Math.min(100, Math.max(0, r.margem))}%` } as React.CSSProperties}
                              />
                            </span>
                            <span
                              className={`valor-sensivel valor-sensivel-fim whitespace-nowrap font-mono ${r.margem < 0 ? "text-error-text" : "text-success-text"}`}
                            >
                              {r.margem.toFixed(1).replace(".", ",")}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="anim-entrada flex" style={{ "--i": 6 } as React.CSSProperties}>
              <TopProdutos produtos={topProd} className="w-full" />
            </div>
          </div>

          {/* Os dois cobrem os mesmos 6 meses, na mesma ordem: junta o faturamento de cada mês
              ao número de clientes que o gerou. Com filtro de vendedores a série de clientes não
              é filtrada, então o faturamento sai para os dois lados não divergirem. */}
          <div className="anim-entrada" style={{ "--i": 7 } as React.CSSProperties}>
            <ClientesMesAMes
              meses={serieClientes.map((m, i) => ({
                ...m,
                faturamento: !vendorsFilter && evoMeses.length === serieClientes.length ? evoMeses[i]?.faturamento : undefined,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
