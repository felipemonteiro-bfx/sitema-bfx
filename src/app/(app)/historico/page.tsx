import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { HistoricoVendasCards } from "@/components/historico-vendas-cards";
import { ReciboDownloadLink } from "@/components/recibo-download-link";
import { HistoricoFiltroSheet } from "@/components/historico-filtro-sheet";
import { EditVendaSheetWrapper } from "@/components/edit-venda-sheet-wrapper";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { valorTotalVenda, produtosTexto, quantidadeTotal, custoTotalVenda, margemVenda } from "@/lib/venda-utils";
import { updateVenda, deleteVenda } from "@/app/(app)/historico/actions";
import { EditVendaHistoricoForm } from "@/components/edit-venda-historico-form";

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
      custoProduto: true,
      temNota: true,
      taxaNota: true,
      descontoEmFolha: true,
      boleto: true,
      comprovantePdf: true,
      asaasPaymentId: true,
      boletoUrl: true,
      cliente: { select: { nome: true } },
      itens: {
        select: { produtoNome: true, custoProduto: true, quantidade: true, subtotal: true },
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
      itens: {
        select: { produtoNome: true, custoProduto: true, valorVenda: true, quantidade: true, subtotal: true },
        orderBy: { id: "asc" as const },
      },
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
      <div className="space-y-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Início</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Histórico de Vendas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
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
          <div className="w-full overflow-x-auto">
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
                <TableHead className="sticky right-0 bg-background"></TableHead>
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
                    <TableCell className="max-w-[250px]">
                      {v.itens && v.itens.length > 1 ? (
                        <details className="cursor-pointer">
                          <summary className="truncate text-sm">
                            {v.itens.length} produtos
                          </summary>
                          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                            {v.itens.map((item, idx) => (
                              <li key={idx} className="flex justify-between gap-2">
                                <span className="truncate">{item.produtoNome} ({item.quantidade}x)</span>
                                <span className="tabular-nums shrink-0">{formatBRL(item.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span className="block truncate" title={produtosTexto(v)}>
                          {produtosTexto(v)}
                        </span>
                      )}
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
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Link
                          href={buildUrl({ edit: v.id.toString() })}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Editar
                        </Link>
                        <ReciboDownloadLink
                          vendaId={v.id}
                          tipo={v.descontoEmFolha ? "autorizacao" : "venda"}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                          label={v.descontoEmFolha ? "Autorização" : "PDF"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
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
        <EditVendaSheetWrapper
          editId={editVenda.id}
          title={`Editando venda #${editVenda.id}`}
          description="Ajuste os dados e salve para atualizar o Histórico."
        >
          <EditVendaHistoricoForm
            editVenda={editVenda}
            editParcelasVenc={editParcelasVenc}
            vendedores={vendedores}
            updateAction={updateVenda}
            deleteAction={deleteVenda}
            gerarBoletoAction={gerarBoletoAsaas}
            initialTotal={valorTotalVenda(editVenda)}
          />
        </EditVendaSheetWrapper>
      )}
    </div>
  );
}



