import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { getAsaasConfig, listPayments } from "@/lib/asaas";
import { requireAdmin } from "@/lib/guards";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardStats } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { PageHeader } from "@/components/page-header";

type Search = { tab?: string; page?: string; q?: string };

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
        <TableRow className="bg-muted/30">
          <TableHead>Descrição</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-[100px]"></TableHead>
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
              <TableCell className="font-medium max-w-[220px] truncate">
                {p.description || `Cobrança ${p.id.slice(-8)}`}
              </TableCell>
              <TableCell className="tabular-nums">{formatDateBr(p.dueDate)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
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
  const q = (sp.q || "").toLowerCase().trim();

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
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-warning-text mb-4" />
            <h3 className="text-lg font-semibold mb-2">Asaas não configurado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Configure em Configurações → Asaas para visualizar os boletos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  let vencidos: AsaasPaymentListItem[] = [];
  let aVencer: AsaasPaymentListItem[] = [];
  let pagos: AsaasPaymentListItem[] = [];
  let asaasApiError: string | null = null;

  try {
    const [resOverdue, resPending, resReceived] = await Promise.all([
      listPayments(config, { billingType: "BOLETO", status: "OVERDUE", limit: 100 }),
      listPayments(config, { billingType: "BOLETO", status: "PENDING", limit: 100 }),
      listPayments(config, { billingType: "BOLETO", status: "RECEIVED", limit: 100 }),
    ]);
    vencidos = resOverdue.data;
    aVencer = resPending.data.filter((p) => new Date(p.dueDate) >= new Date(new Date().toDateString()));
    pagos = resReceived.data;
    const resCash = await listPayments(config, { billingType: "BOLETO", status: "RECEIVED_IN_CASH", limit: 100 });
    pagos = [...pagos, ...resCash.data];
  } catch (err) {
    asaasApiError = err instanceof Error ? err.message : "Erro ao conectar com o Asaas";
  }

  const totalVencidos = vencidos.reduce((s, p) => s + p.value, 0);
  const totalAVencer = aVencer.reduce((s, p) => s + p.value, 0);
  const totalPagos = pagos.reduce((s, p) => s + p.value, 0);

  // Filtro por texto
  const filterItems = (items: AsaasPaymentListItem[]) =>
    q ? items.filter((p) => (p.description || "").toLowerCase().includes(q)) : items;

  const filteredVencidos = filterItems(vencidos);
  const filteredAVencer = filterItems(aVencer);
  const filteredPagos = filterItems(pagos);

  // Paginação
  const paginatedVencidos = filteredVencidos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedAVencer = filteredAVencer.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedPagos = filteredPagos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const baseUrl = (tab: string) => `/boletos?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

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
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning-text shrink-0" />
            <div>
              <p className="text-sm font-medium">Erro ao buscar boletos</p>
              <p className="text-xs text-muted-foreground mt-0.5">{asaasApiError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <CardStats title="Vencidos" value={formatBRL(totalVencidos)} description={`${vencidos.length} boleto(s)`} icon={AlertTriangle} color="error" />
        <CardStats title="A vencer" value={formatBRL(totalAVencer)} description={`${aVencer.length} boleto(s)`} icon={Clock} color="warning" />
        <CardStats title="Pagos" value={formatBRL(totalPagos)} description={`${pagos.length} boleto(s)`} icon={CheckCircle2} color="success" />
      </div>

      {/* Search bar */}
      <form method="GET" className="flex items-center gap-2 max-w-sm">
        <input type="hidden" name="tab" value={currentTab} />
        <input type="hidden" name="page" value="1" />
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por descrição..."
            className="pl-8"
          />
        </div>
        {/* Tamanho padrao, nao size:"sm": o Input ao lado tem 40px de altura,
            raio 10 e fonte 14. O size sm da 36/8/12 e desalinhava a linha
            inteira — as outras quatro rotas usam 40px (fase 16, achado 5). */}
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Buscar
        </button>
        {q && (
          <Link href={`/boletos?tab=${currentTab}`} className={buttonVariants({ variant: "ghost" })}>
            Limpar
          </Link>
        )}
      </form>

      {/* Tabs */}
      <QueryTabs
        defaultTab={currentTab}
        tabs={[
          {
            value: "avencer",
            label: `A vencer${aVencer.length > 0 ? ` (${aVencer.length})` : ""}`,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-warning-text" />
                    A vencer
                    {q && <span className="text-xs text-muted-foreground font-normal">· filtro: &quot;{q}&quot;</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border overflow-hidden">
                    <BoletoTable items={paginatedAVencer} emptyMessage={q ? "Nenhum resultado para o filtro." : "Nenhum boleto a vencer."} />
                  </div>
                  <Pagination page={page} total={filteredAVencer.length} baseUrl={baseUrl("avencer")} />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "vencidos",
            label: `Vencidos${vencidos.length > 0 ? ` (${vencidos.length})` : ""}`,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Vencidos
                    {q && <span className="text-xs text-muted-foreground font-normal">· filtro: &quot;{q}&quot;</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border overflow-hidden">
                    <BoletoTable items={paginatedVencidos} emptyMessage={q ? "Nenhum resultado para o filtro." : "Nenhum boleto vencido."} />
                  </div>
                  <Pagination page={page} total={filteredVencidos.length} baseUrl={baseUrl("vencidos")} />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "pagos",
            label: `Pagos${pagos.length > 0 ? ` (${pagos.length})` : ""}`,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-5 w-5 text-success-text" />
                    Pagos
                    {q && <span className="text-xs text-muted-foreground font-normal">· filtro: &quot;{q}&quot;</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border overflow-hidden">
                    <BoletoTable items={paginatedPagos} emptyMessage={q ? "Nenhum resultado para o filtro." : "Nenhum boleto pago."} linkLabel="Ver comprovante" />
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
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    Gerar boleto manualmente
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Vendas com opção boleto sem boleto gerado ainda.
                  </p>
                </CardHeader>
                <CardContent>
                  {vendasPendentes.length === 0 ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 rounded-lg border border-dashed border-border bg-muted/30 px-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma venda pendente de boleto.
                      </p>
                      <Link href="/historico?boleto=1" className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Ir para Histórico <ExternalLink className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead>Data</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="w-[130px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendasPendentes.map((v) => (
                              <TableRow key={v.id}>
                                <TableCell>{formatDateBr(v.dataVenda.toISOString().slice(0, 10))}</TableCell>
                                <TableCell>{v.cliente?.nome ?? "—"}</TableCell>
                                <TableCell className="max-w-[180px] truncate">{v.produtoNome ?? "—"}</TableCell>
                                <TableCell className="text-right tabular-nums font-semibold">{formatBRL(valorTotalVenda(v))}</TableCell>
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
