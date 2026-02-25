import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { DeleteVendaButton } from "@/components/delete-venda-button";
import { EditVendaFormClient } from "@/components/edit-venda-form-client";
import { DateInput } from "@/components/ui/date-input";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import { createAuditLog } from "@/lib/audit";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

const formatDateBR = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(value);

type Search = { 
  from?: string; 
  to?: string; 
  edit?: string; 
  vendedor?: string; 
  produto?: string;
  cliente?: string;
  descontoFolha?: string;
  boleto?: string;
  page?: string;
};

async function updateVenda(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  const data = String(formData.get("data") || "");
  const valor = Number(formData.get("valor") || 0);
  const quantidade = Number(formData.get("quantidade") || 1);
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const custo = Number(formData.get("custo_prod") || 0);
  const temNota = formData.get("temNota") === "on";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  const descontoEmFolha = formData.get("descontoEmFolha") === "on";
  let boleto = formData.get("boleto") === "on";
  if (descontoEmFolha && boleto) boleto = false;

  const file = formData.get("comprovante") as File | null;

  if (!id || !data) return;

  const subtotal = valor * quantidade;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete;
  const lucro = total - ((custo * quantidade) + envio + valorDescontoNota);

  let comprovantePath: string | undefined = undefined;

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  if (file && file.size > 0 && file.name) {
    const ext = path.extname(file.name).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      try {
        const uploadDir = path.join(process.cwd(), "public/uploads/recibos");
        if (!fs.existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const baseName = path.basename(file.name, ext).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "") || "anexo";
        const filename = `${id}-${Date.now()}-${baseName}${ext}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);
        comprovantePath = `/uploads/recibos/${filename}`;
      } catch (error) {
        console.error("Erro ao fazer upload do comprovante:", error);
      }
    }
  }

  await prisma.venda.update({
    where: { id },
    data: {
      dataVenda: new Date(data),
      vendedor: String(formData.get("vendedor") || ""),
      produtoNome: String(formData.get("produto") || ""),
      quantidade,
      valorVenda: valor,
      valorFrete: frete,
      custoEnvio: envio,
      parcelas: Number(formData.get("parcelas") || 1),
      temNota,
      taxaNota,
      lucroLiquido: lucro,
      descontoEmFolha,
      boleto,
      ...(comprovantePath ? { comprovantePdf: comprovantePath } : {}),
    },
  });
  await createAuditLog("venda:update", { vendaId: id, valor, quantidade, lucro });
  revalidatePath("/historico");
}

async function updateVendaV2(formData: FormData): Promise<{ success: boolean; error?: string }> {
  "use server";
  const id = Number(formData.get("id") || 0);
  const dataStr = String(formData.get("data") || "");
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const temNota = formData.get("temNota") === "on";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  const descontoEmFolha = formData.get("descontoEmFolha") === "on";
  let boleto = formData.get("boleto") === "on";
  if (descontoEmFolha && boleto) boleto = false;

  const produtosJson = formData.get("produtos");
  if (!produtosJson || !id || !dataStr) {
    return { success: false, error: "Dados inválidos" };
  }

  let produtos: Array<{ produtoNome: string; custoProduto: number; valorVenda: number; quantidade: number; subtotal: number }>;
  try {
    produtos = JSON.parse(String(produtosJson));
  } catch {
    return { success: false, error: "Dados de produtos inválidos" };
  }

  if (!Array.isArray(produtos) || produtos.length === 0) {
    return { success: false, error: "Nenhum produto informado" };
  }

  const subtotalProdutos = produtos.reduce((s, p) => s + p.subtotal, 0);
  const totalVenda = subtotalProdutos + frete;
  const valorDescontoNota = temNota ? (subtotalProdutos * taxaNota) / 100 : 0;
  const custoTotal =
    produtos.reduce((s, p) => s + p.custoProduto * p.quantidade, 0) + envio + valorDescontoNota;
  const lucroLiquido = totalVenda - custoTotal;
  const parcelas = Number(formData.get("parcelas") || 1);
  const valorParcela = parcelas > 0 ? totalVenda / parcelas : 0;

  const file = formData.get("comprovante") as File | null;
  let comprovantePath: string | undefined;
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  if (file && file.size > 0 && file.name) {
    const ext = path.extname(file.name).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      try {
        const uploadDir = path.join(process.cwd(), "public/uploads/recibos");
        if (!fs.existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        const baseName = path.basename(file.name, ext).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "") || "anexo";
        const filename = `${id}-${Date.now()}-${baseName}${ext}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        comprovantePath = `/uploads/recibos/${filename}`;
      } catch (e) {
        console.error("Erro upload comprovante:", e);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.itemVenda.deleteMany({ where: { vendaId: id } });
    await tx.itemVenda.createMany({
      data: produtos.map((p) => ({
        vendaId: id,
        produtoNome: p.produtoNome,
        custoProduto: p.custoProduto,
        valorVenda: p.valorVenda,
        quantidade: p.quantidade,
        subtotal: p.subtotal,
      })),
    });
    await tx.venda.update({
      where: { id },
      data: {
        dataVenda: new Date(dataStr),
        vendedor: String(formData.get("vendedor") || ""),
        produtoNome: produtos[0]?.produtoNome || "",
        custoProduto: produtos[0]?.custoProduto || 0,
        quantidade: produtos[0]?.quantidade || 1,
        valorVenda: produtos[0]?.valorVenda || 0,
        valorFrete: frete,
        custoEnvio: envio,
        parcelas,
        valorParcela,
        lucroLiquido,
        temNota,
        taxaNota,
        descontoEmFolha,
        boleto,
        ...(comprovantePath ? { comprovantePdf: comprovantePath } : {}),
      },
    });
  });

  await createAuditLog("venda:update", { vendaId: id, total: totalVenda, lucro: lucroLiquido });
  revalidatePath("/historico");
  return { success: true };
}

async function deleteVenda(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  await prisma.venda.delete({ where: { id } });
  await createAuditLog("venda:delete", { vendaId: id });
  revalidatePath("/historico");
}

function parseDateStart(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function parseDateEnd(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const today = new Date();
  const start = sp.from ? parseDateStart(sp.from) : new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  const end = sp.to ? parseDateEnd(sp.to) : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const editId = sp.edit ? Number(sp.edit) : 0;
  const page = Number(sp.page || 1);
  const pageSize = 10;

  const vendedores = await prisma.usuario.findMany({ select: { id: true, username: true, nomeExibicao: true }, orderBy: { nomeExibicao: "asc" } });
  const produtos = await prisma.produto.findMany({ select: { nome: true }, orderBy: { nome: "asc" } });
  const clientes = await prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } });

  const where = {
    dataVenda: { gte: start, lte: end },
    vendedor: sp.vendedor && sp.vendedor !== "all" ? sp.vendedor : undefined,
    produtoNome: sp.produto && sp.produto !== "all" ? sp.produto : undefined,
    clienteId: sp.cliente && sp.cliente !== "all" ? Number(sp.cliente) : undefined,
    descontoEmFolha: sp.descontoFolha === "1" ? true : sp.descontoFolha === "0" ? false : undefined,
    boleto: sp.boleto === "1" ? true : sp.boleto === "0" ? false : undefined,
  };

  const totalVendas = await prisma.venda.count({ where });
  const totalPages = Math.ceil(totalVendas / pageSize);

  const vendas = await prisma.venda.findMany({
    where,
    orderBy: { dataVenda: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      dataVenda: true,
      vendedor: true,
      produtoNome: true,
      quantidade: true,
      valorVenda: true,
      valorFrete: true,
      temNota: true,
      taxaNota: true,
      descontoEmFolha: true,
      boleto: true,
      comprovantePdf: true,
      asaasPaymentId: true,
      boletoUrl: true,
      cliente: { select: { nome: true } },
    },
  });

  const editVenda = editId ? await prisma.venda.findUnique({
    where: { id: editId },
    select: {
      id: true, dataVenda: true, vendedor: true, produtoNome: true,
      quantidade: true, valorVenda: true, valorFrete: true, custoEnvio: true,
      custoProduto: true, parcelas: true, temNota: true, taxaNota: true,
      descontoEmFolha: true, boleto: true, comprovantePdf: true,
      asaasPaymentId: true, boletoUrl: true,
      itens: {
        select: {
          produtoNome: true, custoProduto: true, valorVenda: true,
          quantidade: true, subtotal: true,
        },
      },
    },
  }) : null;

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
            <DateInput
              name="from"
              defaultValue={start.toISOString().slice(0, 10)}
              aria-label="Data inicial"
            />
            <DateInput
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
            <FormSelect
              name="descontoFolha"
              defaultValue={sp.descontoFolha || "all"}
              options={[
                { value: "all", label: "Desconto folha (Todos)" },
                { value: "1", label: "Desconto folha (Sim)" },
                { value: "0", label: "Desconto folha (Não)" },
              ]}
            />
            <FormSelect
              name="boleto"
              defaultValue={sp.boleto || "all"}
              options={[
                { value: "all", label: "Boleto (Todos)" },
                { value: "1", label: "Boleto (Sim)" },
                { value: "0", label: "Boleto (Não)" },
              ]}
            />
            <input type="hidden" name="page" value="1" />
            <button className={cn(buttonVariants(), "cursor-pointer")}>Filtrar</button>
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
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Nota</TableHead>
                <TableHead className="text-center">Desconto folha</TableHead>
                <TableHead className="text-center">Boleto</TableHead>
                <TableHead className="text-center">Assinado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
                    <TableCell className="text-center font-medium">{v.quantidade || 1}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(((v.valorVenda || 0) * (v.quantidade || 1)) + (v.valorFrete || 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.temNota ? (
                        <span className="text-success font-bold" title={`Taxa: ${v.taxaNota}%`}>✓</span>
                      ) : (
                        <span className="text-muted-foreground opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.descontoEmFolha ? (
                        <span className="text-success font-bold">✓</span>
                      ) : (
                        <span className="text-muted-foreground opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.boleto ? (
                        (() => {
                          const boletoUrl = v.boletoUrl;
                          return boletoUrl ? (
                            <a
                              href={boletoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
                            >
                              Ver boleto
                            </a>
                          ) : (
                          <span className="flex flex-col items-center gap-1">
                            <span className="text-amber-600 text-xs">Pendente</span>
                            <form action={gerarBoletoAsaas} className="inline">
                              <input type="hidden" name="vendaId" value={v.id} />
                              <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}>
                                Gerar boleto
                              </button>
                            </form>
                          </span>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.comprovantePdf ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Link
                          href={buildUrl({ edit: v.id.toString() }) + "#editar-venda"}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Editar
                        </Link>
                        <a 
                          href={`/api/recibo?id=${v.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                          title="Recibo de Venda"
                        >
                          Recibo
                        </a>
                        {v.descontoEmFolha && (
                          <a 
                            href={`/api/recibo?id=${v.id}&tipo=autorizacao`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                            title="Autorização de Desconto em Folha"
                          >
                            Autorização
                          </a>
                        )}
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
                {page > 1 ? (
                  <Link 
                    href={buildUrl({ page: (page - 1).toString() })}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Anterior
                  </Link>
                ) : (
                  <div className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-50 pointer-events-none")}>
                    Anterior
                  </div>
                )}
                {page < totalPages ? (
                  <Link 
                    href={buildUrl({ page: (page + 1).toString() })}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Próxima
                  </Link>
                ) : (
                  <div className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-50 pointer-events-none")}>
                    Próxima
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editVenda && (
        <EditVendaFormClient
          editVenda={{
            id: editVenda.id,
            dataVenda: editVenda.dataVenda,
            vendedor: editVenda.vendedor,
            valorFrete: editVenda.valorFrete ?? 0,
            custoEnvio: editVenda.custoEnvio ?? 0,
            parcelas: editVenda.parcelas,
            temNota: editVenda.temNota,
            taxaNota: editVenda.taxaNota ?? 5.97,
            descontoEmFolha: editVenda.descontoEmFolha ?? false,
            boleto: editVenda.boleto ?? false,
            comprovantePdf: editVenda.comprovantePdf,
            boletoUrl: editVenda.boletoUrl,
            itens: editVenda.itens?.length
              ? editVenda.itens
              : editVenda.produtoNome
                ? [{
                    produtoNome: editVenda.produtoNome,
                    custoProduto: editVenda.custoProduto ?? 0,
                    valorVenda: editVenda.valorVenda ?? 0,
                    quantidade: editVenda.quantidade ?? 1,
                    subtotal: (editVenda.valorVenda ?? 0) * (editVenda.quantidade ?? 1),
                  }]
                : [],
          }}
          vendedores={vendedores}
          updateAction={updateVendaV2}
          deleteAction={deleteVenda}
          gerarBoletoAction={gerarBoletoAsaas}
        />
      )}
    </div>
  );
}



