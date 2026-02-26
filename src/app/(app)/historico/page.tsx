import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { DeleteVendaButton } from "@/components/delete-venda-button";
import { DateInput } from "@/components/ui/date-input";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { HistoricoVendasCards } from "@/components/historico-vendas-cards";
import { ReciboDownloadLink } from "@/components/recibo-download-link";
import { HistoricoFiltroSheet } from "@/components/historico-filtro-sheet";
import { EditVendaSheetWrapper } from "@/components/edit-venda-sheet-wrapper";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import { createAuditLog } from "@/lib/audit";
import { EditParcelasSection } from "@/components/edit-parcelas-section";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";

const formatDateBR = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(value);

/** Calcula valor total considerando itens (múltiplos produtos) ou campos legados */
function valorTotalVenda(v: {
  itens?: { subtotal: number }[];
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
}) {
  const frete = v.valorFrete ?? 0;
  if (v.itens && v.itens.length > 0) {
    const subtotal = v.itens.reduce((s, i) => s + i.subtotal, 0);
    return subtotal + frete;
  }
  return ((v.valorVenda ?? 0) * (v.quantidade ?? 1)) + frete;
}

/** Texto dos produtos: lista de itens ou campo legado */
function produtosTexto(v: {
  itens?: { produtoNome: string; quantidade: number }[];
  produtoNome?: string | null;
  quantidade?: number | null;
}) {
  if (v.itens && v.itens.length > 0) {
    return v.itens.map((i) => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`).join(", ");
  }
  return v.produtoNome ?? "—";
}

/** Quantidade total: soma dos itens ou campo legado */
function quantidadeTotal(v: {
  itens?: { quantidade: number }[];
  quantidade?: number | null;
}) {
  if (v.itens && v.itens.length > 0) {
    return v.itens.reduce((s, i) => s + i.quantidade, 0);
  }
  return v.quantidade ?? 1;
}

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
  // Apenas um: desconto em folha ou boleto (nunca os dois)
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

  // Atualizar parcelas de vencimento se enviadas pelo formulário
  const parcelasRaw = formData.get("parcelasVencimento");
  if (parcelasRaw) {
    try {
      const parcelasData = JSON.parse(String(parcelasRaw)) as { numeroParcela: number; dataVencimento: string; valorParcela: number }[];
      if (Array.isArray(parcelasData) && parcelasData.length > 0) {
        // Preservar status paga/dataPagamento das parcelas existentes
        const existentes = await prisma.parcelaVencimento.findMany({
          where: { vendaId: id },
          select: { numeroParcela: true, paga: true, dataPagamento: true },
        });
        const pagasMap = new Map(existentes.map((p) => [p.numeroParcela, { paga: p.paga, dataPagamento: p.dataPagamento }]));

        await prisma.parcelaVencimento.deleteMany({ where: { vendaId: id } });
        await prisma.parcelaVencimento.createMany({
          data: parcelasData.map((p) => {
            const existente = pagasMap.get(p.numeroParcela);
            return {
              vendaId: id,
              numeroParcela: p.numeroParcela,
              dataVencimento: new Date(p.dataVencimento),
              valorParcela: p.valorParcela,
              paga: existente?.paga ?? false,
              dataPagamento: existente?.dataPagamento ?? null,
            };
          }),
        });
      }
    } catch {
      // Tabela parcelas_vencimento pode não existir em produção antiga
    }
  }

  await createAuditLog("venda:update", { vendaId: id, valor, quantidade, lucro });
  revalidatePath("/historico");
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

export const dynamic = "force-dynamic";

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

  const produtoFilter = sp.produto && sp.produto !== "all" ? sp.produto : undefined;
  const where = {
    dataVenda: { gte: start, lte: end },
    vendedor: sp.vendedor && sp.vendedor !== "all" ? sp.vendedor : undefined,
    ...(produtoFilter && {
      OR: [
        { produtoNome: produtoFilter },
        { itens: { some: { produtoNome: produtoFilter } } },
      ],
    }),
    clienteId: sp.cliente && sp.cliente !== "all" ? Number(sp.cliente) : undefined,
    descontoEmFolha: sp.descontoFolha === "1" ? true : sp.descontoFolha === "0" ? false : undefined,
    boleto: sp.boleto === "1" ? true : sp.boleto === "0" ? false : undefined,
  };

  const totalVendas = await prisma.venda.count({ where });
  const totalPages = Math.ceil(totalVendas / pageSize);

  const vendas = await prisma.venda.findMany({
    where,
    orderBy: [{ dataVenda: "desc" }, { id: "desc" }],
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
      itens: {
        select: { produtoNome: true, quantidade: true, subtotal: true },
        orderBy: { id: "asc" },
      },
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
      itens: { select: { subtotal: true } },
    },
  }) : null;

  // Buscar parcelas existentes separadamente para compatibilidade com produção
  let editParcelasVenc: { numeroParcela: number; dataVencimento: string; valorParcela: number }[] = [];
  if (editVenda && (editVenda.parcelas || 1) > 1) {
    try {
      const raw = await prisma.parcelaVencimento.findMany({
        where: { vendaId: editVenda.id },
        select: { numeroParcela: true, dataVencimento: true, valorParcela: true },
        orderBy: { numeroParcela: "asc" },
      });
      editParcelasVenc = raw.map((p) => ({
        numeroParcela: p.numeroParcela,
        dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
        valorParcela: p.valorParcela,
      }));
    } catch {
      // Tabela parcelas_vencimento pode não existir em produção antiga
    }
  }

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
        <CardContent className="space-y-4">
          <form className="hidden md:grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-center">
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
          <HistoricoFiltroSheet>
            <form className="grid gap-4 grid-cols-1">
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
              <button type="submit" className={cn(buttonVariants(), "cursor-pointer w-full touch-manipulation min-h-[44px]")}>
                Aplicar filtros
              </button>
            </form>
          </HistoricoFiltroSheet>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendas ({totalVendas})</CardTitle>
          <div className="text-xs text-muted-foreground">Página {page} de {totalPages || 1}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <HistoricoVendasCards
            vendas={vendas}
            searchParams={sp}
            gerarBoletoAction={gerarBoletoAsaas}
          />
          <div className="hidden md:block">
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
                    <TableCell className="max-w-[200px]" title={produtosTexto(v)}>
                      <span className="block truncate">{produtosTexto(v)}</span>
                    </TableCell>
                    <TableCell className="text-center font-medium">{quantidadeTotal(v)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(valorTotalVenda(v))}
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
                            <GerarBoletoButton
                              vendaId={v.id}
                              gerarBoletoAction={gerarBoletoAsaas}
                              className="text-xs"
                            >
                              Gerar boleto
                            </GerarBoletoButton>
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
                        <ReciboDownloadLink
                          vendaId={v.id}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                          label="PDF"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-4">
              <div className="text-xs text-muted-foreground order-2 sm:order-1">Mostrando {vendas.length} de {totalVendas} resultados</div>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                {page > 1 ? (
                  <Link 
                    href={buildUrl({ page: (page - 1).toString() })}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "touch-manipulation min-h-[44px] flex items-center")}
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
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "touch-manipulation min-h-[44px] flex items-center")}
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
        <Suspense fallback={null}>
        <EditVendaSheetWrapper
          editId={editVenda.id}
          title={`Editando venda #${editVenda.id}`}
          description="Ajuste os dados e salve para atualizar o Histórico."
        >
          <form action={updateVenda} method="post" encType="multipart/form-data" className="grid gap-4 md:grid-cols-3">
              <input type="hidden" name="id" value={editVenda.id} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data da venda</label>
                <DateInput name="data" defaultValue={editVenda.dataVenda.toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vendedor</label>
                <FormSelect
                  name="vendedor"
                  defaultValue={editVenda.vendedor || ""}
                  options={[
                    ...(editVenda.vendedor && !vendedores.some((v) => (v.nomeExibicao || v.username) === editVenda.vendedor)
                      ? [{ value: editVenda.vendedor, label: editVenda.vendedor }]
                      : []),
                    ...vendedores.map((v) => ({
                      value: String(v.nomeExibicao || v.username),
                      label: String(v.nomeExibicao || v.username),
                    })),
                  ]}
                  placeholder="Selecione o vendedor"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Produto</label>
                <Input name="produto" defaultValue={editVenda.produtoNome || ""} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
                <Input name="quantidade" type="number" min="1" defaultValue={editVenda.quantidade || 1} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Valor Unitário</label>
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
                <Input name="parcelas" type="number" min={1} defaultValue={editVenda.parcelas || 1} />
              </div>

              <input type="hidden" name="custo_prod" value={editVenda.custoProduto || 0} />

              <EditParcelasSection
                initialParcelas={editParcelasVenc}
                numeroParcelas={editVenda.parcelas || 1}
                valorTotal={valorTotalVenda(editVenda)}
                dataVenda={editVenda.dataVenda.toISOString().slice(0, 10)}
              />

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Comprovante Assinado (PDF, JPEG ou PNG)</label>
                <div className="flex flex-col gap-2">
                  <Input type="file" name="comprovante" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="h-10 px-2 pt-1.5" />
                  {editVenda.comprovantePdf ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100">
                      <CheckCircle2 className="h-3 w-3" />
                      Comprovante já enviado. 
                      <a href={editVenda.comprovantePdf} target="_blank" className="font-bold underline flex items-center gap-1">
                        Ver atual <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded-md border border-amber-100 animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      <strong>Atenção:</strong> Vendedor ainda não subiu o PDF assinado.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 border rounded-md h-10 px-3 bg-muted/50 border-border self-end">
                <input 
                  type="checkbox" 
                  name="temNota" 
                  id="edit-temNota" 
                  defaultChecked={editVenda.temNota}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="edit-temNota" className="text-xs font-medium text-foreground leading-none cursor-pointer">
                  Com Nota Fiscal
                </label>
              </div>

              <div className="flex items-center space-x-2 border rounded-md h-10 px-3 bg-muted/50 border-border self-end">
                <input 
                  type="checkbox" 
                  name="descontoEmFolha" 
                  id="edit-descontoEmFolha" 
                  defaultChecked={editVenda.descontoEmFolha ?? false}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="edit-descontoEmFolha" className="text-xs font-medium text-foreground leading-none cursor-pointer">
                  Desconto em folha
                </label>
              </div>

              <div className="flex items-center space-x-2 border rounded-md h-10 px-3 bg-muted/50 border-border self-end">
                <input 
                  type="checkbox" 
                  name="boleto" 
                  id="edit-boleto" 
                  defaultChecked={editVenda.boleto ?? false}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="edit-boleto" className="text-xs font-medium text-foreground leading-none cursor-pointer">
                  Boleto
                </label>
              </div>
              <p className="text-xs text-muted-foreground md:col-span-3">Apenas uma das opções: desconto em folha ou boleto.</p>

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
                <div className="flex flex-wrap items-center gap-3">
                  <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar alterações</button>
                  <ReciboDownloadLink
                    vendaId={editVenda.id}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    label="Baixar recibo PDF"
                  />
                  {editVenda.boletoUrl ? (
                    <a
                      href={editVenda.boletoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Ver boleto Asaas
                    </a>
                  ) : editVenda.boleto ? (
                    <GerarBoletoButton
                      vendaId={editVenda.id}
                      gerarBoletoAction={gerarBoletoAsaas}
                    >
                      Gerar boleto Asaas
                    </GerarBoletoButton>
                  ) : null}
                </div>
                <DeleteVendaButton vendaId={editVenda.id} deleteAction={deleteVenda} />
              </div>
            </form>
        </EditVendaSheetWrapper>
        </Suspense>
      )}
    </div>
  );
}



