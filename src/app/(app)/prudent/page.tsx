import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const formatDateBR = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(value);

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
      <div>
        <h1 className="text-2xl font-semibold">Central de Antecipação</h1>
        <p className="text-sm text-muted-foreground">Selecione vendas para antecipação.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={antecipar}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Parcelas</TableHead>
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
                        <input type="checkbox" name="id" value={v.id} className="h-4 w-4" />
                      </TableCell>
                      <TableCell>{formatDateBR(v.dataVenda)}</TableCell>
                      <TableCell>{v.produtoNome}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(v.valorVenda || 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.parcelas}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Total selecionável: {formatBRL(total)}</div>
              <Button>Antecipar selecionados</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
