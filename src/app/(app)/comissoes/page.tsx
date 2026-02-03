import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";

export default async function Page() {
  const session = await getSession();
  const nome = session?.nomeExibicao || session?.username;
  const user = await prisma.usuario.findFirst({ where: { nomeExibicao: nome } });
  const pct = user?.comissaoPct || 2;
  const vendas = await prisma.venda.findMany({
    where: { vendedor: nome || undefined },
    orderBy: { dataVenda: "desc" },
  });
  const total = vendas.reduce((s, v) => s + (v.valorVenda || 0) + (v.valorFrete || 0), 0);
  const comissao = total * (pct / 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Minhas Comissões</h1>
        <p className="text-sm text-muted-foreground">Resumo das vendas e comissão estimada.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total vendido</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBRL(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comissão ({pct}%)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-700">
            {formatBRL(comissao)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Sem dados.
                  </TableCell>
                </TableRow>
              ) : (
                vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.dataVenda.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>{v.produtoNome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL((v.valorVenda || 0) + (v.valorFrete || 0))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
