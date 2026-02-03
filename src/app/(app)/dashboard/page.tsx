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
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Dashboard Executivo & Performance</h1>
            <p className="text-sm text-muted-foreground">
              Período: {formatDate(start)} a {formatDate(end)}
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <Input type="date" name="from" defaultValue={start.toISOString().slice(0, 10)} />
            <Input type="date" name="to" defaultValue={end.toISOString().slice(0, 10)} />
            <VendorMultiSelect name="vendors" vendors={vendedorList} defaultSelected={vendorsFilter} />
            <Button>Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      {vendas.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <div className="text-lg font-semibold">Nenhuma venda encontrada neste período.</div>
            <div className="text-sm text-muted-foreground">
              Tente ajustar o filtro de datas ou vendedores.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatBRL(fat + frete)}</CardContent>
              <div className="px-6 pb-4 text-xs text-muted-foreground">{peds} vendas</div>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido Real</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-emerald-600">{formatBRL(lucro)}</CardContent>
              <div className="px-6 pb-4 text-xs text-emerald-700">Margem: {margem.toFixed(1)}%</div>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatBRL(tik)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
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
                    <TableHead>Vendas</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>Lucro</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Margem</TableHead>
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
                        <TableCell>{r.vendas}</TableCell>
                        <TableCell>{formatBRL(r.total)}</TableCell>
                        <TableCell>{formatBRL(r.lucro)}</TableCell>
                        <TableCell>{formatBRL(r.ticket)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.margem.toFixed(1)}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
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
          </div>
        </>
      )}
    </div>
  );
}
