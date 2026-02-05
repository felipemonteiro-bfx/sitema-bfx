import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { DeleteVendaButton } from "@/components/delete-venda-button";

const formatDateBR = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(value);

type Search = { 
  from?: string; 
  to?: string; 
  edit?: string; 
  vendedor?: string; 
  produto?: string;
  cliente?: string;
  page?: string;
};

async function updateVenda(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const data = String(formData.get("data") || "");
  const valor = Number(formData.get("valor") || 0);
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const custo = Number(formData.get("custo_prod") || 0);
  const temNota = formData.get("temNota") === "on";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);

  if (!id || !data) return;

  const valorDescontoNota = temNota ? (valor * taxaNota) / 100 : 0;
  const total = valor + frete;
  const lucro = total - (custo + envio + valorDescontoNota);

  await prisma.venda.update({
    where: { id },
    data: {
      dataVenda: new Date(data),
      vendedor: String(formData.get("vendedor") || ""),
      produtoNome: String(formData.get("produto") || ""),
      valorVenda: valor,
      valorFrete: frete,
      custoEnvio: envio,
      parcelas: Number(formData.get("parcelas") || 1),
      temNota,
      taxaNota,
      lucroLiquido: lucro,
    },
  });
  revalidatePath("/historico");
}

async function deleteVenda(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  await prisma.venda.delete({ where: { id } });
  revalidatePath("/historico");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const today = new Date();
  const start = sp.from ? new Date(sp.from) : new Date(today.getFullYear(), today.getMonth(), 1);
  const end = sp.to ? new Date(sp.to) : today;
  const editId = sp.edit ? Number(sp.edit) : 0;
  const page = Number(sp.page || 1);
  const pageSize = 10;

  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const produtos = await prisma.produto.findMany({ orderBy: { nome: "asc" } });
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });

  const where = {
    dataVenda: { gte: start, lte: end },
    vendedor: sp.vendedor && sp.vendedor !== "all" ? sp.vendedor : undefined,
    produtoNome: sp.produto && sp.produto !== "all" ? sp.produto : undefined,
    clienteId: sp.cliente && sp.cliente !== "all" ? Number(sp.cliente) : undefined,
  };

  const totalVendas = await prisma.venda.count({ where });
  const totalPages = Math.ceil(totalVendas / pageSize);

  const vendas = await prisma.venda.findMany({
    where,
    orderBy: { dataVenda: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      cliente: { select: { nome: true } }
    }
  });

  const editVenda = editId ? await prisma.venda.findUnique({ where: { id: editId } }) : null;

  const buildUrl = (params: Partial<Search>) => {
    const newParams = { ...sp, ...params };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return `/historico?${search.toString()}`;
  };

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
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
                { value: "all", label: "Vendedor (Todos)" },
                ...vendedores.map((v) => ({
                  value: String(v.nomeExibicao || v.username),
                  label: String(v.nomeExibicao || v.username),
                })),
              ]}
            />
            <FormSelect
              name="cliente"
              defaultValue={sp.cliente || "all"}
              options={[
                { value: "all", label: "Cliente (Todos)" },
                ...clientes.map((c) => ({ value: String(c.id), label: c.nome })),
              ]}
            />
            <FormSelect
              name="produto"
              defaultValue={sp.produto || "all"}
              options={[
                { value: "all", label: "Produto (Todos)" },
                ...produtos.map((p) => ({ value: p.nome, label: p.nome })),
              ]}
            />
            <input type="hidden" name="page" value="1" />
            <Button>Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendas ({totalVendas})</CardTitle>
          <div className="text-xs text-muted-foreground">Página {page} de {totalPages || 1}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Nota</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Sem dados para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatDateBR(v.dataVenda)}</TableCell>
                    <TableCell className="font-medium">{v.cliente?.nome || "N/D"}</TableCell>
                    <TableCell>{v.vendedor}</TableCell>
                    <TableCell>{v.produtoNome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL((v.valorVenda || 0) + (v.valorFrete || 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.temNota ? (
                        <span className="text-success font-bold" title={`Taxa: ${v.taxaNota}%`}>✓</span>
                      ) : (
                        <span className="text-muted-foreground opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button size="sm" asChild variant="outline">
                          <Link
                            href={buildUrl({ edit: v.id.toString() }) + "#editar-venda"}
                          >
                            Editar
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`/api/recibo?id=${v.id}`}>PDF</a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-xs text-muted-foreground">Mostrando {vendas.length} de {totalVendas} resultados</div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={page <= 1}
                  asChild
                >
                  <Link href={buildUrl({ page: (page - 1).toString() })}>Anterior</Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={page >= totalPages}
                  asChild
                >
                  <Link href={buildUrl({ page: (page + 1).toString() })}>Próxima</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editVenda && (
        <Card id="editar-venda" className="scroll-mt-24">
          <CardHeader className="space-y-1">
            <CardTitle>Editando venda #{editVenda.id}</CardTitle>
            <p className="text-sm text-muted-foreground">Ajuste os dados e salve para atualizar o Histórico.</p>
          </CardHeader>
          <CardContent>
            <form action={updateVenda} className="grid gap-4 md:grid-cols-3">
              <input type="hidden" name="id" value={editVenda.id} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data da venda</label>
                <Input name="data" type="date" defaultValue={editVenda.dataVenda.toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vendedor</label>
                <Input name="vendedor" defaultValue={editVenda.vendedor || ""} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Produto</label>
                <Input name="produto" defaultValue={editVenda.produtoNome || ""} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Valor do produto</label>
                <Input name="valor" type="number" step="0.01" defaultValue={editVenda.valorVenda || 0} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Frete ao cliente</label>
                <Input name="frete" type="number" step="0.01" defaultValue={editVenda.valorFrete || 0} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Custo de envio</label>
                <Input name="envio" type="number" step="0.01" defaultValue={editVenda.custoEnvio || 0} />
              </div>
              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
                <Input name="parcelas" type="number" min={1} defaultValue={editVenda.parcelas || 1} />
              </div>
              
              <input type="hidden" name="custo_prod" value={editVenda.custoProduto || 0} />

              <div className="md:col-span-1 flex items-center space-x-2 border rounded-md h-10 px-3 bg-white self-end">
                <input 
                  type="checkbox" 
                  name="temNota" 
                  id="edit-temNota" 
                  defaultChecked={editVenda.temNota}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit-temNota" className="text-xs font-medium leading-none cursor-pointer">
                  Com Nota Fiscal
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Taxa da Nota (%)</label>
                <Input 
                  name="taxaNota" 
                  type="number" 
                  step="0.01" 
                  defaultValue={editVenda.taxaNota || 5.97} 
                />
              </div>

              <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex items-center gap-3">
                  <Button>Salvar alterações</Button>
                  <a className="text-xs text-muted-foreground hover:text-foreground" href={`/api/recibo?id=${editVenda.id}`}>
                    Baixar recibo PDF
                  </a>
                </div>
                <DeleteVendaButton vendaId={editVenda.id} onDelete={deleteVenda} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



