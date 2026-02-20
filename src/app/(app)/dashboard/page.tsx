import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardStats } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Separator } from "@/components/ui/separator";
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
  Filter
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

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const today = new Date();
  const start = sp.from ? new Date(sp.from) : new Date(today.getFullYear(), today.getMonth(), 1);
  const end = sp.to ? new Date(sp.to) : today;

  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const vendedorList = vendedores.map((v) => v.nomeExibicao || v.username).filter(Boolean) as string[];
  const selectedVendors = parseVendors(sp.vendors);
  const vendorsFilter = selectedVendors.length ? selectedVendors : vendedorList;

  const vendas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: start, lte: end },
      vendedor: { in: vendorsFilter.length ? vendorsFilter : undefined },
    },
  });

  const fat = vendas.reduce((s, v) => s + (v.valorVenda || 0), 0);
  const frete = vendas.reduce((s, v) => s + (v.valorFrete || 0), 0);
  const lucro = vendas.reduce((s, v) => s + (v.lucroLiquido || 0), 0);
  const peds = vendas.length;
  const tik = peds ? (fat + frete) / peds : 0;
  const margem = fat + frete > 0 ? (lucro / (fat + frete)) * 100 : 0;

  const porVend: Record<string, { total: number; lucro: number; vendas: number }> = {};
  for (const v of vendas) {
    const key = v.vendedor || "Sem Vendedor";
    porVend[key] ||= { total: 0, lucro: 0, vendas: 0 };
    porVend[key].total += (v.valorVenda || 0) + (v.valorFrete || 0);
    porVend[key].lucro += v.lucroLiquido || 0;
    porVend[key].vendas += 1;
  }
  const teamRows = Object.entries(porVend)
    .map(([vendedor, r]) => ({
      vendedor,
      total: r.total,
      lucro: r.lucro,
      vendas: r.vendas,
      ticket: r.vendas ? r.total / r.vendas : 0,
      margem: r.total > 0 ? (r.lucro / r.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const prodCount: Record<string, number> = {};
  vendas.forEach((v) => {
    const name = v.produtoNome || "Produto";
    prodCount[name] = (prodCount[name] || 0) + 1;
  });
  const topProd = Object.entries(prodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const bestRev = teamRows[0];
  const bestProf = [...teamRows].sort((a, b) => b.lucro - a.lucro)[0];

  const formatDate = (d: Date) => new Intl.DateTimeFormat("pt-BR").format(d);

  const date6m = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const vendasEvo = await prisma.venda.findMany({
    where: { dataVenda: { gte: date6m } },
  });
  const evoMap = new Map<string, { total: number; lucro: number }>();
  for (const v of vendasEvo) {
    const key = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(v.dataVenda);
    const item = evoMap.get(key) || { total: 0, lucro: 0 };
    item.total += v.valorVenda || 0;
    item.lucro += v.lucroLiquido || 0;
    evoMap.set(key, item);
  }
  const evoData = Array.from(evoMap.entries()).map(([mes, r]) => ({ mes, total: r.total, lucro: r.lucro }));

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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Dashboard Executivo
                </h1>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(start)} — {formatDate(end)}
                </p>
              </div>
            </div>
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
                defaultSelected={vendorsFilter}
              />
            </div>
            <Button type="submit" className="h-10 gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {vendas.length === 0 ? (
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
              value={formatBRL(fat + frete)}
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
                <div className="rounded-lg border border-border overflow-hidden">
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
                </div>
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
                        <div className="text-lg font-bold text-info">{formatBRL(fat + frete)}</div>
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
