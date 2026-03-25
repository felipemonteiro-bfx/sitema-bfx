import { prisma } from "@/lib/db";
import { calcularMetricasPeriodo } from "@/lib/finance";
import { requireAdmin } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardStats } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VendorMultiSelect } from "@/components/vendor-multiselect";
import { DashboardCharts } from "@/components/dashboard-charts";
import { DateInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
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

  const formatDate = (d: Date) => new Intl.DateTimeFormat("pt-BR").format(d);

  const evoData: { mes: string; total: number; lucro: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mesStart = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0));
    const mesEnd = new Date(Date.UTC(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0));
    const m = await calcularMetricasPeriodo(mesStart, mesEnd);
    const mesLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(mesStart);
    evoData.push({
      mes: mesLabel,
      total: Math.trunc(m.receita * 100) / 100,
      lucro: Math.trunc(m.lucro * 100) / 100,
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
  const currentFromStr = start.toISOString().slice(0, 10);
  const currentToStr = end.toISOString().slice(0, 10);

  const avisos = await prisma.aviso.findMany({
    where: { ativo: 1 },
    orderBy: { dataCriacao: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <Card variant="gradient" animated className="border-primary/20">
        <CardContent className="flex flex-col gap-6 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                <Target className="h-6 w-6 text-primary dark:text-primary-foreground" />
              </div>
              <div>
                <h1 className="page-title-gradient text-2xl font-bold tracking-tight">
                  Dashboard Executivo
                </h1>
                <div className="gradient-bar mt-2" />
                <p className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(start)} — {formatDate(end)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
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
                      "h-7 px-3 text-xs",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                    )}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="filter-from" className="label-form">
                Início
              </label>
              <DateInput id="filter-from" name="from" defaultValue={start.toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="filter-to" className="label-form">
                Fim
              </label>
              <DateInput id="filter-to" name="to" defaultValue={end.toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <label htmlFor="filter-vendors" className="label-form">
                Vendedores
              </label>
              <VendorMultiSelect
                id="filter-vendors"
                name="vendors"
                vendors={vendedorList}
                defaultSelected={vendorsFilter ?? vendedorList}
              />
            </div>
            <Button type="submit" leftIcon={<Filter className="h-4 w-4" />} className="h-10">
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
              <Megaphone className="h-5 w-5 text-info" />
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CardStats
              title="Faturamento Total"
              value={formatBRL(totalReceita)}
              description={`${peds} vendas`}
              icon={Wallet}
              color="info"
              className="stagger-1"
            />
            <CardStats
              title="Lucro Líquido"
              value={formatBRL(lucro)}
              description={`Margem: ${margem.toFixed(1)}%`}
              icon={TrendingUp}
              trend={{
                value: margem,
                direction: margem >= 20 ? "up" : margem >= 10 ? "neutral" : "down",
              }}
              color="success"
              className="stagger-2"
            />
            <CardStats
              title="Ticket Médio"
              value={formatBRL(tik)}
              icon={ShoppingCart}
              color="info"
              className="stagger-3"
            />
            <CardStats
              title="Top Performance"
              value={bestRev?.vendedor || "—"}
              description={bestRev ? formatBRL(bestRev.total) : undefined}
              icon={Trophy}
              color="warning"
              className="stagger-4"
            />
          </div>

          <DashboardCharts evoData={evoData} topProdutos={topProd} />

          <div className="grid gap-6 xl:grid-cols-3">
            <Card animated className="xl:col-span-2">
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
                <ScrollArea className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold">Vendedor</TableHead>
                        <TableHead className="text-right font-semibold">Vendas</TableHead>
                        <TableHead className="text-right font-semibold">Faturamento</TableHead>
                        <TableHead className="text-right font-semibold">Lucro</TableHead>
                        <TableHead className="text-right font-semibold">Ticket</TableHead>
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
                                {index === 0 && <Trophy className="h-4 w-4 text-warning" />}
                                {r.vendedor}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.vendas}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{formatBRL(r.total)}</TableCell>
                            <TableCell className="text-right tabular-nums text-success font-medium">{formatBRL(r.lucro)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatBRL(r.ticket)}</TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                variant={r.margem >= 20 ? "success" : r.margem >= 10 ? "warning" : "error"}
                                size="sm"
                              >
                                {r.margem.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card animated className="stagger-5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5 text-warning" />
                    Hall da Fama
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                        <DollarSign className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Maior Faturamento</div>
                        <div className="font-semibold">{bestRev?.vendedor || "—"}</div>
                      </div>
                    </div>
                    {bestRev && (
                      <Badge variant="info" size="sm">{formatBRL(bestRev.total)}</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                        <TrendingUp className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Maior Lucro</div>
                        <div className="font-semibold">{bestProf?.vendedor || "—"}</div>
                      </div>
                    </div>
                    {bestProf && (
                      <Badge variant="success" size="sm">{formatBRL(bestProf.lucro)}</Badge>
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
                        <DollarSign className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita</div>
                        <div className="text-lg font-bold text-info">{formatBRL(totalReceita)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-success/20 bg-success/5 dark:bg-success/10 hover:bg-success/10 dark:hover:bg-success/15 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 dark:bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lucro</div>
                        <div className="text-lg font-bold text-success">{formatBRL(lucro)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5 dark:bg-warning/10 hover:bg-warning/10 dark:hover:bg-warning/15 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 dark:bg-warning/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Percent className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Margem</div>
                        <div className="text-lg font-bold text-warning">{margem.toFixed(1)}%</div>
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
