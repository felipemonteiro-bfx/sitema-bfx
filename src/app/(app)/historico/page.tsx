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
import { CheckCircle2, Download, Plus } from "lucide-react";
import { CopiarLinkAssinatura } from "@/components/copiar-link-assinatura";
import { HistoricoVendasCards } from "@/components/historico-vendas-cards";
import { HistoricoFiltroSheet } from "@/components/historico-filtro-sheet";
import { EditVendaSheetWrapper } from "@/components/edit-venda-sheet-wrapper";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { FILTRO_VENDA_VALIDA, valorTotalVenda, produtosTexto, quantidadeTotal, custoTotalVenda, margemVenda } from "@/lib/venda-utils";
import { updateVenda, deleteVenda, enviarEmailEmpresa } from "@/app/(app)/historico/actions";
import { fuzzyFindVendas } from "@/lib/db-search";
import { filtrosAtivos, whereAssinatura } from "@/lib/historico-filtros";
import { FiltrosAtivos, descreverPeriodo } from "@/components/filtros-ativos";
import { BarraDistribuicao } from "@/components/barra-distribuicao";
import { StatusAssinatura, estadoAssinatura } from "@/components/status-assinatura";
import { EditVendaHistoricoForm } from "@/components/edit-venda-historico-form";
import { EnviarEmailEmpresaButton } from "@/components/enviar-email-empresa-button";
import { VerTermoAssinadoLink } from "@/components/ver-termo-assinado-link";
import { garantirLinksContrato } from "@/lib/link-contrato-db";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FORMA_PAGAMENTO,
  FORMAS_PAGAMENTO_LIST,
  formaFromLegacyFlags,
  formaPagamentoLabel,
} from "@/lib/forma-pagamento";
import { resolverPeriodo, paraInputDate, fimInclusivoParaInput } from "@/lib/periodo-data";
import { formatarDataPura, hojeDataPura } from "@/lib/data-pura";
import { getSession } from "@/lib/session";
import { totalParcelasExibido, type ParcelaRecebimento } from "@/lib/recebimento-parcelas";
import { obterEstadoTermoAssinado } from "@/lib/historico-termo-email";
import { regraDoClienteNaData } from "@/lib/regra-empresa-db";
import { bloqueioDataDesconto } from "@/lib/data-desconto-unica";
import type { RegraVencimento } from "@/lib/regra-empresa";

// Data de venda e data pura (meia-noite UTC): formatar em Manaus mostrava o dia
// anterior — 02/07 virava 01/07 — e fazia o filtro de periodo parecer quebrado.
const formatDateBR = formatarDataPura;

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
  assinatura?: string;
};


export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  // Limites em UTC, mesmo contrato do /dashboard e do /financeiro. Em horario local
  // a janela andava um dia (as vendas sao gravadas em meia-noite UTC) e o campo
  // "Data final" avancava sozinho a cada clique em Filtrar.
  const { inicio: start, fimExclusivo: end } = resolverPeriodo(sp.from, sp.to);
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

  // A busca por texto RESTRINGE os demais filtros em vez de substituí-los. Antes ela
  // trocava o `where` inteiro por `id: { in: ... }`, entao digitar algo na busca
  // apagava silenciosamente o periodo, o vendedor, o cliente e a forma de pagamento —
  // com os campos ainda preenchidos na tela, parecendo que o filtro de data quebrou.
  const where = {
    ...(fuzzyVendaIds !== null ? { id: { in: fuzzyVendaIds } } : {}),
    dataVenda: { gte: start, lt: end },
    vendedor: sp.vendedor && sp.vendedor !== "all" ? sp.vendedor : undefined,
    ...(produtoFilter && {
      OR: [
        { produtoNome: produtoFilter },
        { itens: { some: { produtoNome: produtoFilter } } },
      ],
    }),
    clienteId: sp.cliente && sp.cliente !== "all" ? Number(sp.cliente) : undefined,
    ...formaPagamentoWhere,
    // AND evita colidir com o OR do filtro de produto.
    ...(whereAssinatura(sp.assinatura) ? { AND: [whereAssinatura(sp.assinatura)!] } : {}),
  };

  const totalVendas = await prisma.venda.count({ where });
  const totalPages = Math.ceil(totalVendas / pageSize);

  // Distribuição por assinatura de TODAS as vendas filtradas (não só da página), com os
  // critérios de historico-filtros. "Sem contrato" é o restante, então as três faixas
  // somam o total do filtro.
  const [qtdAssinada, qtdAguardando] = await Promise.all([
    prisma.venda.count({ where: { AND: [where, FILTRO_VENDA_VALIDA, whereAssinatura("assinado")!] } }),
    prisma.venda.count({ where: { AND: [where, whereAssinatura("pendente")!] } }),
  ]);
  const contagensAssinatura = {
    assinada: qtdAssinada,
    aguardando: qtdAguardando,
    semContrato: Math.max(0, totalVendas - qtdAssinada - qtdAguardando),
  };

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
      status: true,
      assinaturaToken: true,
      assinatura: {
        select: {
          assinaturaStatus: true,
        },
      },
      termoEmailStatus: true,
      termoEmailEnviadoEm: true,
      termoEmailErro: true,
    },
  });

  // Folha antiga, ou que virou folha na edição, nascia sem token. O link do
  // contrato passa a existir na hora em que a venda aparece no histórico.
  const linksNovos = await garantirLinksContrato(vendas);
  for (const venda of vendas) {
    const token = linksNovos.get(venda.id);
    if (!token) continue;
    venda.assinaturaToken = token;
    venda.assinatura ??= { assinaturaStatus: "pendente" };
  }
  if (editId && !vendas.some((venda) => venda.id === editId)) {
    const foraDaPagina = await prisma.venda.findUnique({
      where: { id: editId },
      select: {
        id: true,
        formaPagamento: true,
        descontoEmFolha: true,
        assinaturaToken: true,
        status: true,
        assinatura: { select: { assinaturaStatus: true } },
      },
    });
    if (foraDaPagina) await garantirLinksContrato([foraDaPagina]);
  }

  const editVenda = editId ? await prisma.venda.findUnique({
    where: { id: editId },
    select: {
      id: true, clienteId: true, dataVenda: true, vendedor: true, produtoNome: true,
      quantidade: true, valorVenda: true, valorFrete: true, custoEnvio: true, entrega: true,
      custoProduto: true, parcelas: true, temNota: true, taxaNota: true,
      desconto: true, descontoEmFolha: true, boleto: true, formaPagamento: true,
      assinaturaToken: true,
      assinatura: { select: { assinaturaStatus: true } },
      asaasPaymentId: true, boletoUrl: true,
      itens: {
        select: { produtoNome: true, custoProduto: true, valorVenda: true, quantidade: true, subtotal: true },
        orderBy: { id: "asc" as const },
      },
    },
  }) : null;

  // Buscar parcelas existentes separadamente para compatibilidade com produção
  let editParcelasVenc: { numeroParcela: number; dataVencimento: string; valorParcela: number }[] = [];
  // Parcelas ja marcadas como pagas: alimenta o aviso de protecao em EditParcelasSection
  // (T-ddr-01) — o front nao pode deixar o usuario cortar uma parcela ja paga da lista.
  let editParcelasPagas: number[] = [];
  // "Recebimento das parcelas": todas as parcelas, inclusive de venda 1x. So admin da baixa —
  // as actions tambem exigem admin; aqui e so para nao mostrar botao que seria recusado.
  let editRecebimento: ParcelaRecebimento[] = [];
  // Data do desconto da venda 1x em folha (2026-10-01): a gravada na parcela 1, o motivo de não
  // poder mudar (mesmas travas de `updateVenda`) e a regra da empresa do cliente na data da venda.
  let editDataDesconto: { gravada: string | null; bloqueio: string | null; regra: RegraVencimento | null } = {
    gravada: null,
    bloqueio: null,
    regra: null,
  };
  const podeDarBaixa = editVenda ? (await getSession())?.role === "admin" : false;
  if (editVenda) {
    try {
      const raw = await prisma.parcelaVencimento.findMany({
        where: { vendaId: editVenda.id },
        select: {
          id: true,
          numeroParcela: true,
          dataVencimento: true,
          valorParcela: true,
          paga: true,
          dataPagamento: true,
          origemPagamento: true,
          baixaPor: true,
          antecipada: true,
          antecipacaoLoteId: true,
          boletoPrudentId: true,
          fechamento: { select: { status: true } },
        },
        orderBy: [{ numeroParcela: "asc" }, { id: "asc" }],
      });
      const primeira = raw.find((p) => p.numeroParcela === 1) ?? null;
      editDataDesconto = {
        ...editDataDesconto,
        gravada: primeira ? primeira.dataVencimento.toISOString().slice(0, 10) : null,
        bloqueio: bloqueioDataDesconto(primeira),
      };
      if ((editVenda.parcelas || 1) > 1) {
        editParcelasVenc = raw.map((p) => ({
          numeroParcela: p.numeroParcela,
          dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
          valorParcela: p.valorParcela,
        }));
        editParcelasPagas = raw.filter((p) => p.paga).map((p) => p.numeroParcela);
      }
      const totalParcelas = totalParcelasExibido(editVenda.parcelas, raw.map((p) => p.numeroParcela));
      editRecebimento = raw.map((p) => ({
        id: p.id,
        numeroParcela: p.numeroParcela,
        totalParcelas,
        dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
        valorParcela: p.valorParcela,
        paga: p.paga,
        dataPagamento: p.dataPagamento ? p.dataPagamento.toISOString().slice(0, 10) : null,
        origemPagamento: p.origemPagamento,
        baixaPor: p.baixaPor,
      }));
    } catch {
      // Tabela parcelas_vencimento pode não existir em produção antiga
    }
    if (editVenda.clienteId) {
      try {
        const r = await regraDoClienteNaData(editVenda.clienteId, editVenda.dataVenda);
        editDataDesconto = { ...editDataDesconto, regra: { diaCorte: r.diaCorte, diaVencimento: r.diaVencimento } };
      } catch {
        // Sem a regra, o campo usa o padrão (corte 20, dia 10) — o servidor relê a regra ao salvar.
      }
    }
  }

  // Chip "Cliente": o parâmetro é o id; mostra o nome.
  const nomesClientes = Object.fromEntries(clientes.map((c) => [String(c.id), c.nome]));

  const buildUrl = (params: Partial<Search>) => {
    const newParams = { ...sp, ...params };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return `/historico?${search.toString()}`;
  };

  const xlsxParams = new URLSearchParams();
  xlsxParams.set("from", paraInputDate(start));
  xlsxParams.set("to", fimInclusivoParaInput(end));
  if (sp.vendedor && sp.vendedor !== "all") xlsxParams.set("vendedor", sp.vendedor);
  if (sp.cliente && sp.cliente !== "all") xlsxParams.set("cliente", sp.cliente);
  if (sp.produto && sp.produto !== "all") xlsxParams.set("produto", sp.produto);
  if (sp.formaPagamento && sp.formaPagamento !== "all") xlsxParams.set("formaPagamento", sp.formaPagamento);
  const xlsxHref = `/api/relatorios/vendas-xlsx?${xlsxParams.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico"
        description={descreverPeriodo(paraInputDate(start), fimInclusivoParaInput(end))}
        breadcrumbs={[{ label: "Vendas & Operações" }, { label: "Histórico" }]}
        actions={
          <>
            <a
              href={xlsxHref}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}
              download
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </a>
            <Link href="/venda-rapida" className={cn(buttonVariants(), "min-h-11 gap-2")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova venda
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <HistoricoBuscaFuzzy defaultValue={sp.q || ""} />
        <FiltrosAtivos filtros={filtrosAtivos(sp, { cliente: nomesClientes })} searchParams={sp} />
      </div>

      <BarraDistribuicao contagens={contagensAssinatura} />

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Filtro avançado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="hidden md:grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-center">
            <DateInput
              name="from"
              defaultValue={paraInputDate(start)}
              aria-label="Data inicial"
            />
            <DateInput
              name="to"
              defaultValue={fimInclusivoParaInput(end)}
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
                defaultValue={paraInputDate(start)}
                aria-label="Data inicial"
              />
              <DateInput
                name="to"
                defaultValue={fimInclusivoParaInput(end)}
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
        <CardContent className="space-y-4 pt-6">
          <HistoricoVendasCards
            vendas={vendas}
            searchParams={sp}
            gerarBoletoAction={gerarBoletoAsaas}
          />
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venda</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-center">Nota</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="sticky right-0 bg-card"><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13}>
                    <EmptyState variant="search" size="sm" title="Nenhuma venda encontrada" description="Ajuste os filtros ou o período de busca." />
                  </TableCell>
                </TableRow>
              ) : (
                vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="min-h-11 font-mono tabular-nums text-muted-foreground">#{v.id}</TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">{formatDateBR(v.dataVenda)}</TableCell>
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
                                <span className="tabular-nums shrink-0 valor-sensivel">{formatBRL(item.subtotal)}</span>
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
                    <TableCell className="text-center font-mono tabular-nums">{quantidadeTotal(v)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums valor-sensivel valor-sensivel-fim">
                      {formatBRL(valorTotalVenda(v))}
                    </TableCell>
                    <TableCell>
                      <StatusAssinatura
                        estado={estadoAssinatura({
                          status: v.status,
                          assinaturaStatus: v.assinatura?.assinaturaStatus,
                          assinaturaToken: v.assinaturaToken,
                        })}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums valor-sensivel valor-sensivel-fim">
                      {custoTotalVenda(v) != null ? formatBRL(custoTotalVenda(v)!) : <span className="text-muted-foreground opacity-30">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums valor-sensivel valor-sensivel-fim">
                      {(() => {
                        const m = margemVenda(v);
                        if (m == null) return <span className="text-muted-foreground opacity-30">—</span>;
                        return <span className={m > 0 ? "text-success-text" : m === 0 ? "text-warning-text" : "text-destructive"}>{m.toFixed(1)}%</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.temNota ? (
                        <span title={`Taxa: ${v.taxaNota}%`} aria-label="Com nota" className="inline-flex justify-center">
                          <CheckCircle2 className="h-4 w-4 text-success-text" aria-hidden="true" />
                        </span>
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
                    <TableCell className="sticky right-0 bg-card">
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
                        {(() => {
                          const termoEmail = obterEstadoTermoAssinado(
                            v.assinatura?.assinaturaStatus,
                            v.termoEmailStatus,
                          );

                          return termoEmail.mostrarReenvio && (
                          <div className="flex flex-col items-end gap-1">
                            <VerTermoAssinadoLink vendaId={v.id} />
                            <EnviarEmailEmpresaButton
                              vendaId={v.id}
                              onSend={enviarEmailEmpresa}
                              label="Reenviar termo ao RH"
                            />
                            {termoEmail.statusLabel && (
                              <span className="text-xs text-muted-foreground">{termoEmail.statusLabel}</span>
                            )}
                          </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {vendas.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-semibold">
                    Totais ({totalVendas} {totalVendas === 1 ? "venda" : "vendas"})
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold valor-sensivel valor-sensivel-fim">
                    {formatBRL(totaisFiltro.valor)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono tabular-nums font-semibold valor-sensivel valor-sensivel-fim">
                    {totaisFiltro.custo > 0 ? formatBRL(totaisFiltro.custo) : <span className="text-muted-foreground opacity-30">—</span>}
                  </TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
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
                  <div className="text-xs uppercase text-muted-foreground">Valor</div>
                  <div className="text-base font-semibold tabular-nums text-primary valor-sensivel">
                    {formatBRL(totaisFiltro.valor)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Custo</div>
                  <div className="text-base font-semibold tabular-nums valor-sensivel">
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
            key={editVenda.id}
            editVenda={editVenda}
            editParcelasVenc={editParcelasVenc}
            parcelasPagas={editParcelasPagas}
            dataDesconto={editDataDesconto}
            recebimento={{ parcelas: editRecebimento, hoje: hojeDataPura(), podeDarBaixa }}
            vendedores={vendedores}
            updateAction={updateVenda}
            deleteAction={deleteVenda}
            gerarBoletoAction={gerarBoletoAsaas}
          />
        </EditVendaSheetWrapper>
      )}
    </div>
  );
}

