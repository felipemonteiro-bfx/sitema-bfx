import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";

async function antecipar(formData: FormData) {
  "use server";
  const ids = formData.getAll("id").map((v) => Number(v));
  if (!ids.length) return;
  await prisma.venda.updateMany({
    where: { id: { in: ids } },
    data: { antecipada: 1 },
  });
  revalidatePath("/prudent");
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const pend = await prisma.venda.findMany({ where: { antecipada: 0 } });
  const total = pend.reduce((s, v) => s + (v.valorVenda || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Central de Antecipação</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={antecipar}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Parcelas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pend.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sem dados.
                    </TableCell>
                  </TableRow>
                ) : (
                  pend.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <input type="checkbox" name="id" value={v.id} />
                      </TableCell>
                      <TableCell>{v.dataVenda.toISOString().slice(0, 10)}</TableCell>
                      <TableCell>{v.produtoNome}</TableCell>
                      <TableCell>{formatBRL(v.valorVenda || 0)}</TableCell>
                      <TableCell>{v.parcelas}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Total selecionável: {formatBRL(total)}</div>
              <Button>Antecipar Selecionados</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
