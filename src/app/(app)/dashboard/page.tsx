import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VendorMultiSelect } from "@/components/vendor-multiselect";
import { DashboardCharts } from "@/components/dashboard-charts";
import Link from "next/link";

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
      <Card className="border bg-gradient-to-br from-white/90 to-slate-50/90 shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard Executivo e Performance</h1>
            <p className="text-sm text-muted-foreground">
              Período: {formatDate(start)} a {formatDate(end)}
            </p>
          </div>
          <form className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
            <div className="space-y-1">
              <label htmlFor="filter-from" className="text-xs font-semibold text-muted-foreground">
                Início
              </label>
              <Input id="filter-from" type="date" name="from" defaultValue={start.toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="filter-to" className="text-xs font-semibold text-muted-foreground">
                Fim
              </label>
              <Input id="filter-to" type="date" name="to" defaultValue={end.toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="filter-vendors" className="text-xs font-semibold text-muted-foreground">
                Vendedores
              </label>
              <VendorMultiSelect
                id="filter-vendors"
                name="vendors"
                vendors={vendedorList}
                defaultSelected={vendorsFilter}
              />
            </div>
            <Button className="h-10 w-full lg:w-auto">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      {vendas.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <div className="text-lg font-semibold">Nenhuma venda encontrada neste período.</div>
            <div className="text-sm text-muted-foreground">
              Tente ajustar o filtro de datas ou vendedores.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 opacity-70" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
              </CardHeader>
              <CardContent className="relative text-2xl font-semibold">{formatBRL(fat + frete)}</CardContent>
              <div className="relative px-6 pb-4 text-xs text-muted-foreground">{peds} vendas</div>
            </Card>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 opacity-70" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido Real</CardTitle>
              </CardHeader>
              <CardContent
                className={`relative text-2xl font-semibold ${
                  lucro < 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {formatBRL(lucro)}
              </CardContent>
              <div
                className={`relative px-6 pb-4 text-xs ${
                  margem < 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                Margem: {margem.toFixed(1)}%
              </div>
            </Card>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 opacity-70" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
              </CardHeader>
              <CardContent className="relative text-2xl font-semibold">{formatBRL(tik)}</CardContent>
            </Card>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100 opacity-70" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Performance</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-1">
                <div className="text-base font-semibold">{bestRev?.vendedor || "—"}</div>
                <div className="text-sm text-muted-foreground">{formatBRL(bestRev?.total || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <DashboardCharts evoData={evoData} topProdutos={topProd} />

          <Card>
            <CardHeader>
              <CardTitle>Raio-X da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Performance detalhada por vendedor, com ticket e margem.
              </div>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Ticket</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sem dados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teamRows.map((r) => (
                      <TableRow key={r.vendedor}>
                        <TableCell>{r.vendedor}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.vendas}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(r.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(r.lucro)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(r.ticket)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                            {r.margem.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Hall da Fama</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Maior faturamento</div>
                  <div className="text-sm font-semibold">{bestRev?.vendedor || "—"}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Maior lucro</div>
                  <div className="text-sm font-semibold">{bestProf?.vendedor || "—"}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Resumo Rápido</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Receita: {formatBRL(fat + frete)} · Lucro: {formatBRL(lucro)} · Margem: {margem.toFixed(1)}%
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Atalhos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/venda-rapida">Nova venda</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/financeiro">Financeiro</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/relatorios">Relatórios</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
