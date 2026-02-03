import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";

type Search = { from?: string; to?: string; edit?: string; vendedor?: string; produto?: string };

async function updateVenda(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const data = String(formData.get("data") || "");
  if (!id || !data) return;
  await prisma.venda.update({
    where: { id },
    data: {
      dataVenda: new Date(data),
      vendedor: String(formData.get("vendedor") || ""),
      produtoNome: String(formData.get("produto") || ""),
      valorVenda: Number(formData.get("valor") || 0),
      valorFrete: Number(formData.get("frete") || 0),
      custoEnvio: Number(formData.get("envio") || 0),
      parcelas: Number(formData.get("parcelas") || 1),
    },
  });
  revalidatePath("/historico");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const today = new Date();
  const start = sp.from ? new Date(sp.from) : new Date(today.getFullYear(), today.getMonth(), 1);
  const end = sp.to ? new Date(sp.to) : today;
  const editId = sp.edit ? Number(sp.edit) : 0;

  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const produtos = await prisma.produto.findMany({ orderBy: { nome: "asc" } });

  const vendas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: start, lte: end },
      vendedor: sp.vendedor && sp.vendedor !== "all" ? sp.vendedor : undefined,
      produtoNome: sp.produto && sp.produto !== "all" ? sp.produto : undefined,
    },
    orderBy: { dataVenda: "desc" },
  });

  const editVenda = editId ? await prisma.venda.findUnique({ where: { id: editId } }) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico (Editar)</h1>
        <p className="text-sm text-muted-foreground">Filtre e edite vendas do período.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro avançado</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              type="date"
              name="from"
              defaultValue={start.toISOString().slice(0, 10)}
              aria-label="Data inicial"
            />
            <Input
              type="date"
              name="to"
              defaultValue={end.toISOString().slice(0, 10)}
              aria-label="Data final"
            />
            <FormSelect
              name="vendedor"
              defaultValue={sp.vendedor || "all"}
              options={[
                { value: "all", label: "Todos os vendedores" },
                ...vendedores.map((v) => ({
                  value: String(v.nomeExibicao || v.username),
                  label: String(v.nomeExibicao || v.username),
                })),
              ]}
            />
            <FormSelect
              name="produto"
              defaultValue={sp.produto || "all"}
              options={[
                { value: "all", label: "Todos os produtos" },
                ...produtos.map((p) => ({ value: p.nome, label: p.nome })),
              ]}
            />
            <Button>Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sem dados.
                  </TableCell>
                </TableRow>
              ) : (
                vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.dataVenda.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>{v.vendedor}</TableCell>
                    <TableCell>{v.produtoNome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL((v.valorVenda || 0) + (v.valorFrete || 0))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-sm">
                        <Link
                          className="text-blue-600"
                          href={`/historico?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}&vendedor=${sp.vendedor || "all"}&produto=${sp.produto || "all"}&edit=${v.id}`}
                        >
                          Editar
                        </Link>
                        <a className="text-slate-600" href={`/api/recibo?id=${v.id}`}>
                          PDF
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editVenda && (
        <Card>
          <CardHeader>
            <CardTitle>Editando venda #{editVenda.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateVenda} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="id" value={editVenda.id} />
              <Input name="data" type="date" defaultValue={editVenda.dataVenda.toISOString().slice(0, 10)} />
              <Input name="vendedor" defaultValue={editVenda.vendedor || ""} />
              <Input name="produto" defaultValue={editVenda.produtoNome || ""} />
              <Input name="valor" type="number" step="0.01" defaultValue={editVenda.valorVenda || 0} />
              <Input name="frete" type="number" step="0.01" defaultValue={editVenda.valorFrete || 0} />
              <Input name="envio" type="number" step="0.01" defaultValue={editVenda.custoEnvio || 0} />
              <Input name="parcelas" type="number" defaultValue={editVenda.parcelas || 1} />
              <Button className="md:col-span-3">Salvar alterações</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
