import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { getAsaasConfig, listAllPayments } from "@/lib/asaas";
import { requireAdmin } from "@/lib/guards";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Search,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { QueryTabs } from "@/components/query-tabs";
import type { AsaasPaymentListItem } from "@/lib/asaas";
import { BoletosFiltros } from "@/components/boletos-filtros";
import { filtrarBoletos, intervaloDaSituacao, intervaloDoPeriodo, lerFiltroBoletos } from "@/lib/boletos-filtro";
import { hojeDataPura } from "@/lib/data-pura";
import { PageHeader } from "@/components/page-header";

type Search = { tab?: string; page?: string; q?: string; periodo?: string; de?: string; ate?: string; empresa?: string };

const PAGE_SIZE = 10;

function formatDateBr(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

function BoletoTable({
  items,
  emptyMessage,
  linkLabel = "Ver boleto",
}: {
  items: AsaasPaymentListItem[];
  emptyMessage: string;
  linkLabel?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-25"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium max-w-55 truncate">
                {p.description || `Cobrança ${p.id.slice(-8)}`}
              </TableCell>
              <TableCell className="tabular-nums">{formatDateBr(p.dueDate)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums valor-sensivel valor-sensivel-fim">
                {formatBRL(p.value)}
              </TableCell>
              <TableCell>
                {p.bankSlipUrl && (
                  <a
                    href={p.bankSlipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    {linkLabel}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function Pagination({
  page,
  total,
  baseUrl,
}: {
  page: number;
  total: number;
  baseUrl: string;
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 pt-3 border-t">
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages} · {total} itens
      </span>
      <div className="flex gap-1">
        {page > 1 ? (
          <Link href={`${baseUrl}&page=${page - 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Anterior
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-40 pointer-events-none")}>Anterior</span>
        )}
        {page < totalPages ? (
          <Link href={`${baseUrl}&page=${page + 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Próxima
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-40 pointer-events-none")}>Próxima</span>
        )}
      </div>
    </div>
  );
}

export default async function BoletosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const sp = await searchParams;
  const currentTab = sp.tab || "avencer";
  const page = Math.max(1, Number(sp.page || 1));
  const filtro = lerFiltroBoletos(sp);
  const q = filtro.q;
  const hoje = hojeDataPura();
  const intervalo = intervaloDoPeriodo(filtro, hoje);

  let cfg = null;
  try { cfg = await prisma.config.findFirst(); } catch { /* coluna ausente */ }
  const config = getAsaasConfig(cfg ?? undefined);

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Boletos"
          description="Boletos emitidos pelo Asaas"
          breadcrumbs={[{ label: "Boletos" }]}
        />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Asaas não configurado"
            description="Configure em Configurações → Asaas para visualizar os boletos."
          />
        </Card>
      </div>
    );
  }

  let vencidos: AsaasPaymentListItem[] = [];
  let aVencer: AsaasPaymentListItem[] = [];
  let pagos: AsaasPaymentListItem[] = [];
  let asaasApiError: string | null = null;

  try {
    // Todas as páginas: com só a primeira (100) os cartões saíam truncados em 100/200.
    const [resOverdue, resPending, resReceived, resCash] = await Promise.all([
      listAllPayments(config, { billingType: "BOLETO", status: "OVERDUE" }),
      listAllPayments(config, { billingType: "BOLETO", status: "PENDING" }),
      listAllPayments(config, { billingType: "BOLETO", status: "RECEIVED" }),
      listAllPayments(config, { billingType: "BOLETO", status: "RECEIVED_IN_CASH" }),
    ]);
    vencidos = resOverdue;
    aVencer = resPending.filter((p) => p.dueDate.slice(0, 10) >= hoje);
    pagos = [...resReceived, ...resCash];
  } catch (err) {
    asaasApiError = err instanceof Error ? err.message : "Erro ao conectar com o Asaas";
  }

  // Cliente e empresa vêm da venda (externalReference = id da venda).
  const idsVenda = [...new Set([...vencidos, ...aVencer, ...pagos].map((p) => Number(p.externalReference)).filter((n) => Number.isInteger(n) && n > 0))];
  const [vendasDosBoletos, empresasCadastradas] = await Promise.all([
    idsVenda.length
      ? prisma.venda.findMany({ where: { id: { in: idsVenda } }, select: { id: true, cliente: { select: { nome: true, empresa: true } } } })
      : Promise.resolve([]),
    prisma.empresaParceira.findMany({ select: { nome: true }, orderBy: { nome: "asc" } }),
  ]);
  const vendaPorRef = new Map(vendasDosBoletos.map((v) => [String(v.id), { cliente: v.cliente?.nome ?? null, empresa: v.cliente?.empresa ?? null }]));

  const filtrar = (items: AsaasPaymentListItem[], situacao: "vencidos" | "avencer" | "pagos") =>
    filtrarBoletos(
      items,
      {
        intervalo: intervaloDaSituacao(situacao, intervalo),
        campo: situacao === "pagos" ? "paymentDate" : "dueDate",
        empresa: filtro.empresa,
        q,
      },
      vendaPorRef
    );

  const filteredVencidos = filtrar(vencidos, "vencidos");
  const filteredAVencer = filtrar(aVencer, "avencer");
  const filteredPagos = filtrar(pagos, "pagos");

  const soma = (items: AsaasPaymentListItem[]) => items.reduce((s, p) => s + p.value, 0);
  const totalVencidos = soma(filteredVencidos);
  const totalAVencer = soma(filteredAVencer);
  const totalPagos = soma(filteredPagos);
  const resumoCartao = (items: AsaasPaymentListItem[]) => {
    const clientes = new Set(items.map((p) => p.customer).filter(Boolean)).size;
    return `${items.length} ${items.length === 1 ? "boleto" : "boletos"} · ${clientes} ${clientes === 1 ? "cliente" : "clientes"}`;
  };
  const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const resumoPeriodo = !intervalo
    ? "tudo"
    : intervalo.de && intervalo.ate
      ? intervalo.de === intervalo.ate ? dataCurta(intervalo.de) : `${dataCurta(intervalo.de)} a ${dataCurta(intervalo.ate)}`
      : intervalo.de ? `desde ${dataCurta(intervalo.de)}` : intervalo.ate ? `até ${dataCurta(intervalo.ate)}` : "tudo";

  // Paginação
  const paginatedVencidos = filteredVencidos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedAVencer = filteredAVencer.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedPagos = filteredPagos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const baseUrl = (tab: string) => {
    const params = new URLSearchParams({ tab, periodo: filtro.periodo });
    if (filtro.de) params.set("de", filtro.de);
    if (filtro.ate) params.set("ate", filtro.ate);
    if (filtro.empresa) params.set("empresa", filtro.empresa);
    if (q) params.set("q", q);
    return `/boletos?${params.toString()}`;
  };

  // Vendas pendentes de boleto
  type VendaBoleto = {
    id: number; dataVenda: Date; valorVenda: number | null; quantidade: number | null;
    valorFrete: number | null; produtoNome: string | null; itens?: { subtotal: number }[];
    cliente: { nome: string | null; empresa: string | null } | null;
  };
  let vendasPendentes: VendaBoleto[] = [];
  try {
    vendasPendentes = (await prisma.venda.findMany({
      where: { boleto: true, boletoUrl: null },
      orderBy: { dataVenda: "desc" },
      include: { cliente: { select: { nome: true, empresa: true } }, itens: { select: { subtotal: true } } },
    })) as VendaBoleto[];
  } catch { /* colunas ausentes */ }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boletos"
        description="Boletos emitidos pelo Asaas"
        breadcrumbs={[{ label: "Boletos" }]}
      />

      {asaasApiError && (
        <Alert variant="warning" showIcon>
          <div>
            <p className="text-sm font-medium">Erro ao buscar boletos</p>
            <p className="mt-0.5 text-xs">{asaasApiError}</p>
          </div>
        </Alert>
      )}

      {/* Indicadores num painel só (padrão Vantage): cartões internos neutros, o rótulo diz o que é. */}
      <section
        aria-label="Resumo dos boletos"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
      >
        <KpiCard ordem={0} rotulo="Vencidos (todo atraso)" valor={formatBRL(totalVencidos)} rodape={resumoCartao(filteredVencidos)} />
        <KpiCard ordem={1} rotulo="A vencer" valor={formatBRL(totalAVencer)} rodape={resumoCartao(filteredAVencer)} />
        <KpiCard ordem={2} rotulo="Pagos" valor={formatBRL(totalPagos)} rodape={resumoCartao(filteredPagos)} />
      </section>

      <BoletosFiltros
        // Nova chave a cada filtro: voltar/avançar no navegador remonta com a busca certa.
        key={`${filtro.periodo}|${filtro.de ?? ""}|${filtro.ate ?? ""}|${filtro.empresa ?? ""}|${q}`}
        tab={currentTab}
        filtro={filtro}
        empresas={empresasCadastradas.map((e) => e.nome)}
        resumoPeriodo={resumoPeriodo}
      />

      {/* Tabs */}
      <QueryTabs
        defaultTab={currentTab}
        tabs={[
          {
            value: "avencer",
            label: `A vencer${filteredAVencer.length > 0 ? ` (${filteredAVencer.length})` : ""}`,
            content: (
              <Card className="p-2 pt-5">
                <CardHeader className="p-0 px-4 pb-4">
                  <CardTitle className="flex items-center gap-2 font-sans text-lg font-semibold leading-normal tracking-normal">
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    A vencer
                    <span className="text-xs font-normal text-muted-foreground">· {resumoPeriodo}{filtro.empresa ? ` · ${filtro.empresa}` : ""}{q ? ` · "${q}"` : ""}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-0 px-2 pb-2">
                  <div className="overflow-hidden rounded-interno bg-poco">
                    <BoletoTable items={paginatedAVencer} emptyMessage="Nenhum boleto a vencer com esses filtros." />
                  </div>
                  <Pagination page={page} total={filteredAVencer.length} baseUrl={baseUrl("avencer")} />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "vencidos",
            label: `Vencidos${filteredVencidos.length > 0 ? ` (${filteredVencidos.length})` : ""}`,
            content: (
              <Card className="p-2 pt-5">
                <CardHeader className="p-0 px-4 pb-4">
                  <CardTitle className="flex items-center gap-2 font-sans text-lg font-semibold leading-normal tracking-normal">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Vencidos
                    <span className="text-xs font-normal text-muted-foreground">· todo atraso{filtro.empresa ? ` · ${filtro.empresa}` : ""}{q ? ` · "${q}"` : ""}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-0 px-2 pb-2">
                  <div className="overflow-hidden rounded-interno bg-poco">
                    <BoletoTable items={paginatedVencidos} emptyMessage="Nenhum boleto vencido com esses filtros." />
                  </div>
                  <Pagination page={page} total={filteredVencidos.length} baseUrl={baseUrl("vencidos")} />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "pagos",
            label: `Pagos${filteredPagos.length > 0 ? ` (${filteredPagos.length})` : ""}`,
            content: (
              <Card className="p-2 pt-5">
                <CardHeader className="p-0 px-4 pb-4">
                  <CardTitle className="flex items-center gap-2 font-sans text-lg font-semibold leading-normal tracking-normal">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Pagos
                    <span className="text-xs font-normal text-muted-foreground">· {resumoPeriodo}{filtro.empresa ? ` · ${filtro.empresa}` : ""}{q ? ` · "${q}"` : ""}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-0 px-2 pb-2">
                  <div className="overflow-hidden rounded-interno bg-poco">
                    <BoletoTable items={paginatedPagos} emptyMessage="Nenhum boleto pago com esses filtros." linkLabel="Ver comprovante" />
                  </div>
                  <Pagination page={page} total={filteredPagos.length} baseUrl={baseUrl("pagos")} />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "gerar",
            label: `Gerar${vendasPendentes.length > 0 ? ` (${vendasPendentes.length})` : ""}`,
            content: (
              <Card className="p-2 pt-5">
                <CardHeader className="p-0 px-4 pb-4">
                  <CardTitle className="flex items-center gap-2 font-sans text-lg font-semibold leading-normal tracking-normal">
                    <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Gerar boleto manualmente
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Vendas com opção boleto sem boleto gerado ainda.
                  </p>
                </CardHeader>
                <CardContent className="p-0 px-2 pb-2">
                  {vendasPendentes.length === 0 ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-interno bg-poco p-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma venda pendente de boleto.
                      </p>
                      <Link href="/historico?boleto=1" className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Ir para Histórico <ExternalLink className="h-4 w-4 shrink-0" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-interno bg-poco">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="w-32.5"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendasPendentes.map((v) => (
                              <TableRow key={v.id}>
                                <TableCell>{formatDateBr(v.dataVenda.toISOString().slice(0, 10))}</TableCell>
                                <TableCell>{v.cliente?.nome ?? "—"}</TableCell>
                                <TableCell className="max-w-45 truncate">{v.produtoNome ?? "—"}</TableCell>
                                <TableCell className="text-right tabular-nums font-medium valor-sensivel valor-sensivel-fim">{formatBRL(valorTotalVenda(v))}</TableCell>
                                <TableCell>
                                  <GerarBoletoButton
                                    vendaId={v.id}
                                    gerarBoletoAction={gerarBoletoAsaas}
                                    className={buttonVariants({ variant: "default", size: "sm" })}
                                  >
                                    Gerar boleto
                                  </GerarBoletoButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        O cliente precisa ter CPF ou CNPJ cadastrado para gerar no Asaas.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
