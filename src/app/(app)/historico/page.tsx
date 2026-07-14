import Link from "next/link";
import { prisma } from "@/lib/db";
import { HistoricoBuscaFuzzy } from "@/components/historico-busca-fuzzy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { CheckCircle2, Download } from "lucide-react";
import { CopiarLinkAssinatura } from "@/components/copiar-link-assinatura";
import { HistoricoVendasCards } from "@/components/historico-vendas-cards";
import { HistoricoFiltroSheet } from "@/components/historico-filtro-sheet";
import { EditVendaSheetWrapper } from "@/components/edit-venda-sheet-wrapper";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { valorTotalVenda, produtosTexto, quantidadeTotal, custoTotalVenda, margemVenda } from "@/lib/venda-utils";
import { updateVenda, deleteVenda, enviarEmailEmpresa } from "@/app/(app)/historico/actions";
import { fuzzyFindVendas } from "@/lib/db-search";
import { EditVendaHistoricoForm } from "@/components/edit-venda-historico-form";
import { EnviarEmailEmpresaButton } from "@/components/enviar-email-empresa-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FORMA_PAGAMENTO,
  FORMAS_PAGAMENTO_LIST,
  formaFromLegacyFlags,
  formaPagamentoLabel,
} from "@/lib/forma-pagamento";

const formatDateBR = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Manaus" }).format(value);

type Search = {
  from?: string;
  to?: string;
  edit?: string;
  vendedor?: string;
  produto?: string;
  cliente?: string;
  formaPagamento?: string;
  page?: string;
  q?: string;
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
  const queryBusca = sp.q?.trim() || "";

  // Fuzzy search mode: quando `q` está presente, busca por cliente/produto/vendedor
  let fuzzyVendaIds: number[] | null = null;
  if (queryBusca) {
    const fuzzyResults = await fuzzyFindVendas(queryBusca, 200);
    fuzzyVendaIds = fuzzyResults.map((v) => v.id);
  }

  // Forma de pagamento: filtro pelo campo canonico `formaPagamento`.
  // O backfill da migration garante que toda venda tem um valor.
  const formaPagamento = sp.formaPagamento && sp.formaPagamento !== "all" ? sp.formaPagamento : undefined;
  const formaPagamentoWhere = formaPagamento ? { formaPagamento } : {};

  const where = fuzzyVendaIds !== null
    ? { id: { in: fuzzyVendaIds } }
    : {
        dataVenda: { gte: start, lte: end },
        vendedor: sp.vendedor && sp.vendedor !== "all" ? sp.vendedor : undefined,
        ...(produtoFilter && {
          OR: [
            { produtoNome: produtoFilter },
            { itens: { some: { produtoNome: produtoFilter } } },
          ],
        }),
        clienteId: sp.cliente && sp.cliente !== "all" ? Number(sp.cliente) : undefined,
        ...formaPagamentoWhere,
      };

  const totalVendas = await prisma.venda.count({ where });
  const totalPages = Math.ceil(totalVendas / pageSize);

  // Totais agregados de TODOS os registros filtrados (independente de paginação).
  // Buscamos apenas os campos necessários para valorTotalVenda/custoTotalVenda.
  const vendasParaTotais = await prisma.venda.findMany({
    where,
    select: {
      valorVenda: true,
      quantidade: true,
      valorFrete: true,
      desconto: true,
      custoProduto: true,
      itens: { select: { subtotal: true, custoProduto: true, quantidade: true } },
    },
  });
  const totaisFiltro = vendasParaTotais.reduce(
    (acc, v) => {
      acc.valor += valorTotalVenda(v);
      const c = custoTotalVenda(v);
      if (c != null) acc.custo += c;
      return acc;
    },
    { valor: 0, custo: 0 },
  );

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
      valorFrete: true, desconto: true,
      custoProduto: true,
      temNota: true,
      taxaNota: true,
      descontoEmFolha: true,
      boleto: true,
      formaPagamento: true,
      parcelas: true,
      asaasPaymentId: true,
      boletoUrl: true,
      cliente: { select: { nome: true, empresaParceiraId: true, empresa: true } },
      itens: {
        select: { produtoNome: true, custoProduto: true, quantidade: true, subtotal: true },
        orderBy: { id: "asc" },
      },
      assinaturaToken: true,
      assinatura: {
        select: {
          assinaturaStatus: true,
        },
      },
    },
  });

  const editVenda = editId ? await prisma.venda.findUnique({
    where: { id: editId },
    select: {
      id: true, dataVenda: true, vendedor: true, produtoNome: true,
      quantidade: true, valorVenda: true, valorFrete: true, custoEnvio: true,
      custoProduto: true, parcelas: true, temNota: true, taxaNota: true,
      desconto: true, descontoEmFolha: true, boleto: true, formaPagamento: true,
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

  const xlsxParams = new URLSearchParams();
  xlsxParams.set("from", start.toISOString().slice(0, 10));
  xlsxParams.set("to", end.toISOString().slice(0, 10));
  if (sp.vendedor && sp.vendedor !== "all") xlsxParams.set("vendedor", sp.vendedor);
  if (sp.cliente && sp.cliente !== "all") xlsxParams.set("cliente", sp.cliente);
  if (sp.produto && sp.produto !== "all") xlsxParams.set("produto", sp.produto);
  if (sp.formaPagamento && sp.formaPagamento !== "all") xlsxParams.set("formaPagamento", sp.formaPagamento);
  const xlsxHref = `/api/relatorios/vendas-xlsx?${xlsxParams.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Vendas"
        description="Filtre e edite vendas do período."
        breadcrumbs={[{ label: "Histórico de Vendas" }]}
      />

      <HistoricoBuscaFuzzy defaultValue={sp.q || ""} />

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
              name="formaPagamento"
              defaultValue={sp.formaPagamento || "all"}
              options={[
                { value: "all", label: "Pagamento (Todos)" },
                ...FORMAS_PAGAMENTO_LIST.map((f) => ({ value: f, label: formaPagamentoLabel(f) })),
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
                name="formaPagamento"
                defaultValue={sp.formaPagamento || "all"}
                options={[
                  { value: "all", label: "Pagamento (Todos)" },
                  ...FORMAS_PAGAMENTO_LIST.map((f) => ({ value: f, label: formaPagamentoLabel(f) })),
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
          <div className="flex items-center gap-3">
            <a
              href={xlsxHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              download
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </a>
            <div className="text-xs text-muted-foreground">Pg {page}/{totalPages || 1}</div>
          </div>
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
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-center">Nota</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-center">Assinado</TableHead>
                <TableHead className="sticky right-0 bg-background"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12}>
                    <EmptyState variant="search" size="sm" title="Nenhuma venda encontrada" description="Ajuste os filtros ou o período de busca." />
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
                    <TableCell className="text-right tabular-nums">
                      {custoTotalVenda(v) != null ? formatBRL(custoTotalVenda(v)!) : <span className="text-muted-foreground opacity-30">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(() => {
                        const m = margemVenda(v);
                        if (m == null) return <span className="text-muted-foreground opacity-30">—</span>;
                        return <span className={m > 0 ? "text-success" : m === 0 ? "text-warning" : "text-destructive"}>{m.toFixed(1)}%</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.temNota ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-success" aria-label="Com nota" title={`Taxa: ${v.taxaNota}%`} />
                      ) : (
                        <span className="text-muted-foreground opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Forma canonica: usa a coluna nova quando preenchida, senao deriva dos flags legados.
                        const forma = (v.formaPagamento as keyof typeof FORMA_PAGAMENTO | null) ??
                          formaFromLegacyFlags({
                            descontoEmFolha: v.descontoEmFolha,
                            boleto: v.boleto,
                            parcelas: v.parcelas,
                          });
                        return (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-medium">{formaPagamentoLabel(forma)}</span>
                            {forma === FORMA_PAGAMENTO.BOLETO && (
                              v.boletoUrl ? (
                                <a
                                  href={v.boletoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0 text-xs")}
                                >
                                  Ver boleto
                                </a>
                              ) : (
                                <GerarBoletoButton
                                  vendaId={v.id}
                                  gerarBoletoAction={gerarBoletoAsaas}
                                  className="text-xs"
                                >
                                  Gerar boleto
                                </GerarBoletoButton>
                              )
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.assinatura?.assinaturaStatus === 'assinado' ? (
                        <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                      ) : v.assinaturaToken ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-warning" title="Aguardando assinatura" />
                      ) : (
                        <span className="text-muted-foreground opacity-30">—</span>
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
                        {v.assinatura?.assinaturaStatus === 'assinado' ? (
                          <a
                            href={`/api/assinatura/documento?vendaId=${v.id}`}
                            download={`recibo-assinado-${v.id}.pdf`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            Baixar Assinado
                          </a>
                        ) : v.assinaturaToken ? (
                          <CopiarLinkAssinatura token={v.assinaturaToken} />
                        ) : null}
                        {(v.cliente?.empresaParceiraId || v.cliente?.empresa) && (
                          <EnviarEmailEmpresaButton vendaId={v.id} onSend={enviarEmailEmpresa} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {vendas.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    Totais ({totalVendas} {totalVendas === 1 ? "venda" : "vendas"})
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatBRL(totaisFiltro.valor)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {totaisFiltro.custo > 0 ? formatBRL(totaisFiltro.custo) : <span className="text-muted-foreground opacity-30">—</span>}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
          </div>
          </div>

          {/* Footer com totais — versão mobile */}
          {vendas.length > 0 && (
            <div className="md:hidden rounded-xl border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                <span>Totais ({totalVendas})</span>
                <span>todos os filtrados</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Valor</div>
                  <div className="text-base font-semibold tabular-nums text-primary">
                    {formatBRL(totaisFiltro.valor)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Custo</div>
                  <div className="text-base font-semibold tabular-nums">
                    {totaisFiltro.custo > 0 ? formatBRL(totaisFiltro.custo) : <span className="text-muted-foreground opacity-30">—</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

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



