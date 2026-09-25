import { prisma } from "@/lib/db";
import { calcularMetricasPeriodo } from "@/lib/finance";
import { requireAdmin } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { VendorMultiSelect } from "@/components/vendor-multiselect";
import { DashboardCharts } from "@/components/dashboard-charts";
import { ClientesMesAMes } from "@/components/clientes-mes-a-mes";
import { KpiCard } from "@/components/kpi-card";
import { clientesNoPeriodo, serieMensalClientes } from "@/lib/dashboard-clientes-db";
import { periodoAnteriorComparavel, ultimoDiaDoPeriodo, variacao } from "@/lib/dashboard-clientes";
import { DateInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  ShoppingCart, 
  Target,
  Trophy,
  Wallet,
  ArrowRight,
  Calendar,
  Users,
  Package,
  Filter,
  Megaphone
} from "lucide-react";

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
  const [metricsAnt, clientes, clientesAnt, serieClientes] = await Promise.all([
    calcularMetricasPeriodo(anterior.inicio, anterior.fim, vendorsFilter),
    clientesNoPeriodo(start, end, vendorsFilter),
    clientesNoPeriodo(anterior.inicio, anterior.fim, vendorsFilter),
    // A série segue hoje, como o gráfico de faturamento — não o filtro de datas.
    serieMensalClientes(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))),
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
  const tikAnt = metricsAnt.totalVendas ? metricsAnt.receita / metricsAnt.totalVendas : 0;

  const teamRows = Object.entries(porVendedor)
    .map(([vendedor, r]) => ({
      vendedor,
      total: r.total,
      lucro: r.lucroLiquido,
      vendas: r.vendas,
      ticket: r.vendas ? r.total / r.vendas : 0,
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

  const bestRev = teamRows[0];
  const bestProf = [...teamRows].sort((a, b) => b.lucro - a.lucro)[0];

  // UTC: as datas do filtro são dias de calendário à meia-noite UTC.
  const formatDate = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);

  const evoData: { mes: string; total: number; lucro: number; vendas: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mesStart = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0));
    const mesEnd = new Date(Date.UTC(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0));
    const m = await calcularMetricasPeriodo(mesStart, mesEnd);
    // "abr/26" em vez de "abr. de 2026": seis rótulos cabem sem repetir o ano por extenso.
    const mesLabel = `${new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(mesStart).replace(".", "")}/${String(mesStart.getUTCFullYear()).slice(2)}`;
    evoData.push({
      mes: mesLabel,
      total: Math.trunc(m.receita * 100) / 100,
      lucro: Math.trunc(m.lucro * 100) / 100,
      vendas: m.totalVendas,
    });
  }

  // Quick period shortcuts
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);
  const periodShortcuts = [
    {
      label: "Hoje",
      from: todayStr,
      to: todayStr,
    },
    {
      label: "7 dias",
      from: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
      to: todayStr,
    },
    {
      label: "Mês",
      from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: todayStr,
    },
    {
      label: "Trimestre",
      from: fmt(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      to: todayStr,
    },
  ];
  // `end` é exclusivo (início do dia seguinte): o que o usuário filtrou é o dia anterior.
  // Usar `end` direto fazia o campo "Fim" andar um dia a cada Filtrar.
  const currentFromStr = start.toISOString().slice(0, 10);
  const currentToStr = ultimoDiaDoPeriodo(end);

  const avisos = await prisma.aviso.findMany({
    where: { ativo: 1 },
    orderBy: { dataCriacao: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-4 overflow-x-hidden lg:space-y-6">
      {/* `elevated` no lugar de `gradient`: o cabecalho do dashboard era o
          unico card com fundo em degrade (`from-card to-muted/50`), o que
          sujava a leitura ao lado dos cards lisos da mesma tela. A borda em
          `--primary` continua marcando o bloco. */}
      <Card variant="elevated" animated className="border-primary/20">
        <CardContent className="flex flex-col gap-4 pt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:pt-6">
          <div className="space-y-2">
            <PageHeader
              title="Dashboard Executivo"
              breadcrumbs={[{ label: "Dashboard" }]}
            />
            <p className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Calendar className="h-4 w-4" />
              {formatDate(start)} — {formatDate(new Date(`${currentToStr}T12:00:00Z`))}
            </p>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {/* Atalhos de período */}
            <div className="flex flex-wrap gap-1.5">
              {periodShortcuts.map((s) => {
                const isActive = currentFromStr === s.from && currentToStr === s.to;
                const vendorsParam = sp.vendors ? `&vendors=${encodeURIComponent(sp.vendors)}` : "";
                return (
                  <Link
                    key={s.label}
                    href={`/dashboard?from=${s.from}&to=${s.to}${vendorsParam}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "px-3",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
            {/* Filtro de datas e vendedores */}
            <form className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <div className="space-y-1.5">
                <label htmlFor="filter-from" className="label-form">Início</label>
                <DateInput id="filter-from" name="from" defaultValue={currentFromStr} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="filter-to" className="label-form">Fim</label>
                <DateInput id="filter-to" name="to" defaultValue={currentToStr} />
              </div>
              <div className="col-span-2 space-y-1.5 sm:min-w-[180px]">
                <label htmlFor="filter-vendors" className="label-form">Vendedores</label>
                <VendorMultiSelect
                  id="filter-vendors"
                  name="vendors"
                  vendors={vendedorList}
                  defaultSelected={vendorsFilter ?? vendedorList}
                />
              </div>
              <Button type="submit" leftIcon={<Filter className="h-4 w-4" />} className="col-span-2 h-10 sm:col-span-1 sm:w-auto">
                Filtrar
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {avisos.length > 0 && (
        <Card animated className="border-info/20 bg-info/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5 text-info-text" />
              Mural de Avisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {avisos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(a.dataCriacao)}
                  </span>
                  <span className="flex-1 text-foreground">{a.mensagem || ""}</span>
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
          description="Não há vendas registradas no período selecionado. Ajuste os filtros ou comece a registrar novas vendas."
          action={{
            label: "Nova Venda",
            href: "/venda-rapida"
          }}
        />
      ) : (
        <>
          {/* Variante C aprovada em 25/09: 3 linhas fixas por cartão, contagem até o
              valor e a linha dos últimos 6 meses ao fundo (kpi-card.tsx). */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <KpiCard
              ordem={0}
              titulo="Faturamento"
              icone="carteira"
              tom="info"
              valor={totalReceita}
              contexto={`${peds} ${peds === 1 ? "venda" : "vendas"} · ${clientes.total} ${clientes.total === 1 ? "cliente" : "clientes"}`}
              variacao={variacaoKpi(totalReceita, metricsAnt.receita)}
              tendencia={evoData.map((m) => m.total)}
            />
            <KpiCard
              ordem={1}
              titulo="Lucro líquido"
              icone="lucro"
              tom="success"
              valor={lucro}
              contexto={<>Margem <span className="valor-sensivel">{margem.toFixed(1).replace(".", ",")}%</span></>}
              variacao={variacaoKpi(lucro, metricsAnt.lucro)}
              tendencia={evoData.map((m) => m.lucro)}
            />
            <KpiCard
              ordem={2}
              titulo="Ticket médio"
              icone="carrinho"
              tom="info"
              valor={tik}
              contexto="por venda"
              variacao={variacaoKpi(tik, tikAnt)}
              tendencia={evoData.map((m) => (m.vendas ? m.total / m.vendas : 0))}
            />
            <KpiCard
              ordem={3}
              titulo="Clientes"
              icone="clientes"
              tom="success"
              valor={clientes.total}
              formato="int"
              valorSensivel={false}
              contexto={`${clientes.novos} ${clientes.novos === 1 ? "novo" : "novos"} · ${clientes.recorrentes} ${clientes.recorrentes === 1 ? "recorrente" : "recorrentes"}`}
              variacao={variacaoKpi(clientes.total, clientesAnt.total)}
              tendencia={serieClientes.map((m) => m.total)}
            />
            <KpiCard
              ordem={4}
              titulo="Top vendedor"
              icone="trofeu"
              tom="warning"
              texto={bestRev?.vendedor || "—"}
              // O valor deste card e' o NOME do vendedor: o modo discreto oculta o total, no contexto.
              valorSensivel={false}
              contexto={bestRev ? <span className="valor-sensivel">{formatBRL(bestRev.total)}</span> : "sem vendas"}
              className="col-span-2 xl:col-span-1"
            />
          </div>

          <DashboardCharts evoData={evoData} topProdutos={topProd} />

          {/* Os dois cobrem os mesmos 6 meses, na mesma ordem: junta o faturamento
              de cada mês ao número de clientes que o gerou. */}
          <ClientesMesAMes
            meses={serieClientes.map((m, i) => ({
              ...m,
              faturamento: evoData.length === serieClientes.length ? evoData[i]?.total : undefined,
            }))}
          />

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
            <Card animated className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    Raio-X da Equipe
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Performance detalhada por vendedor
                  </p>
                </div>
                <Badge variant="info" size="sm">
                  {teamRows.length} vendedores
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-x-auto w-full [&_th]:px-2 [&_td]:px-2 sm:[&_th]:px-3 sm:[&_td]:px-3">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold">Vendedor</TableHead>
                        <TableHead className="text-right font-semibold max-sm:hidden">Vendas</TableHead>
                        <TableHead className="text-right font-semibold">Faturamento</TableHead>
                        <TableHead className="text-right font-semibold">Lucro</TableHead>
                        <TableHead className="text-right font-semibold max-sm:hidden">Ticket</TableHead>
                        <TableHead className="text-right font-semibold">Margem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Sem dados disponíveis
                          </TableCell>
                        </TableRow>
                      ) : (
                        teamRows.map((r, index) => (
                          <TableRow
                            key={r.vendedor}
                            className={cn(
                              "animate-fade-in-up transition-colors",
                              index === 0 && "bg-warning/5 dark:bg-warning/10"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Trophy className="h-4 w-4 text-warning-text shrink-0" />}
                                <span className="truncate max-w-[100px] sm:max-w-none">{r.vendedor}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums max-sm:hidden">{r.vendas}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium valor-sensivel valor-sensivel-fim">{formatBRL(r.total)}</TableCell>
                            <TableCell className={cn("text-right tabular-nums font-medium valor-sensivel valor-sensivel-fim", r.lucro < 0 ? "text-error-text" : "text-success-text")}>{formatBRL(r.lucro)}</TableCell>
                            <TableCell className="text-right tabular-nums max-sm:hidden valor-sensivel valor-sensivel-fim">{formatBRL(r.ticket)}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={r.margem >= 20 ? "success" : r.margem >= 10 ? "warning" : "error"}
                                size="sm"
                                className="valor-sensivel valor-sensivel-fim"
                              >
                                {r.margem.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card animated className="stagger-5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5 text-warning-text" />
                    Hall da Fama
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10">
                        <DollarSign className="h-5 w-5 text-info-text" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Maior Faturamento</div>
                        <div className="font-semibold truncate">{bestRev?.vendedor || "—"}</div>
                      </div>
                    </div>
                    {bestRev && (
                      <Badge variant="info" size="sm" className="shrink-0 valor-sensivel valor-sensivel-fim">{formatBRL(bestRev.total)}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
                        <TrendingUp className="h-5 w-5 text-success-text" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Maior Lucro</div>
                        <div className="font-semibold truncate">{bestProf?.vendedor || "—"}</div>
                      </div>
                    </div>
                    {bestProf && (
                      <Badge variant="success" size="sm" className="shrink-0 valor-sensivel valor-sensivel-fim">{formatBRL(bestProf.lucro)}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card animated className="stagger-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resumo Rápido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-info/20 bg-info/5 dark:bg-info/10 hover:bg-info/10 dark:hover:bg-info/15 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-info/10 dark:bg-info/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <DollarSign className="h-5 w-5 text-info-text" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita</div>
                        <div className="text-lg font-bold text-info-text valor-sensivel">{formatBRL(totalReceita)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-success/20 bg-success/5 dark:bg-success/10 hover:bg-success/10 dark:hover:bg-success/15 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 dark:bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-success-text" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lucro</div>
                        <div className="text-lg font-bold text-success-text valor-sensivel">{formatBRL(lucro)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5 dark:bg-warning/10 hover:bg-warning/10 dark:hover:bg-warning/15 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 dark:bg-warning/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Percent className="h-5 w-5 text-warning-text" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Margem</div>
                        <div className="text-lg font-bold text-warning-text valor-sensivel">{margem.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card animated className="stagger-7">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Atalhos Rápidos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Link 
                    href="/venda-rapida" 
                    className={cn(
                      buttonVariants({ variant: "outline" }), 
                      "justify-between h-11 hover-lift"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Nova Venda
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link 
                    href="/financeiro" 
                    className={cn(
                      buttonVariants({ variant: "outline" }), 
                      "justify-between h-11 hover-lift"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Financeiro
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link 
                    href="/relatorios" 
                    className={cn(
                      buttonVariants({ variant: "outline" }), 
                      "justify-between h-11 hover-lift"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Relatórios
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
