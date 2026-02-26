import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { getAsaasConfig, listPayments } from "@/lib/asaas";
import { requireAdmin } from "@/lib/guards";
import { gerarBoletoAsaas } from "@/lib/boleto-actions";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardStats } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import type { AsaasPaymentListItem } from "@/lib/asaas";

function formatDateBr(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function TableBoletos({
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
            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {p.description || `Cobrança ${p.id.slice(-8)}`}
              </TableCell>
              <TableCell>{formatDateBr(p.dueDate)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatBRL(p.value)}
              </TableCell>
              <TableCell>
                {p.bankSlipUrl && (
                  <a
                    href={p.bankSlipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {linkLabel}
                    <ExternalLink className="h-3 w-3" />
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

export default async function BoletosPage() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const cfg = await prisma.config.findFirst();
  const config = getAsaasConfig(cfg ?? undefined);
  if (!config) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard de Boletos</h1>
          <p className="text-sm text-muted-foreground">
            Boletos emitidos pelo Asaas
          </p>
        </div>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">Asaas não configurado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Configure em Configurações → Asaas ou a variável de ambiente ASAAS_API_KEY para visualizar
              o dashboard de boletos. Os boletos são gerados pela integração com o Asaas.
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
    console.error("Erro ao buscar boletos Asaas:", err);
    asaasApiError = err instanceof Error ? err.message : "Erro ao conectar com o Asaas";
  }

  const totalVencidos = vencidos.reduce((s, p) => s + p.value, 0);
  const totalAVencer = aVencer.reduce((s, p) => s + p.value, 0);
  const totalPagos = pagos.reduce((s, p) => s + p.value, 0);

  type VendaBoleto = {
    id: number;
    dataVenda: Date;
    valorVenda: number | null;
    quantidade: number | null;
    valorFrete: number | null;
    produtoNome: string | null;
    itens?: { subtotal: number }[];
    cliente: { nome: string | null; empresa: string | null } | null;
  };
  let vendasPendentesBoleto: VendaBoleto[] = [];
  try {
    vendasPendentesBoleto = (await prisma.venda.findMany({
      where: { boleto: true, boletoUrl: null },
      orderBy: { dataVenda: "desc" },
      include: {
        cliente: { select: { nome: true, empresa: true } },
        itens: { select: { subtotal: true } },
      },
    })) as VendaBoleto[];
  } catch {
    // Colunas boleto/boletoUrl podem não existir em ambientes antigos
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Boletos</h1>
        <p className="text-sm text-muted-foreground">
          Boletos emitidos pelo Asaas — vencidos, a vencer e pagos
        </p>
      </div>

      {asaasApiError && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">Erro ao buscar boletos do Asaas</p>
              <p className="text-xs text-muted-foreground mt-0.5">{asaasApiError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CardStats
          title="Vencidos"
          value={formatBRL(totalVencidos)}
          description={`${vencidos.length} boleto(s)`}
          icon={AlertTriangle}
          color="error"
          className="stagger-1"
        />
        <CardStats
          title="A vencer"
          value={formatBRL(totalAVencer)}
          description={`${aVencer.length} boleto(s)`}
          icon={Clock}
          color="warning"
          className="stagger-2"
        />
        <CardStats
          title="Pagos"
          value={formatBRL(totalPagos)}
          description={`${pagos.length} boleto(s)`}
          icon={CheckCircle2}
          color="success"
          className="stagger-3"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Vencidos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Boletos com data de vencimento ultrapassada
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <TableBoletos items={vencidos} emptyMessage="Nenhum boleto vencido" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-warning" />
              A vencer
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Boletos pendentes com vencimento futuro
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <TableBoletos items={aVencer} emptyMessage="Nenhum boleto a vencer" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Pagos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Boletos já recebidos
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <TableBoletos items={pagos.slice(0, 20)} emptyMessage="Nenhum boleto pago" />
              {pagos.length > 20 && (
                <p className="text-xs text-muted-foreground mt-2 px-4">
                  Exibindo 20 de {pagos.length} pagos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Gerar boleto manualmente
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vendas com opção boleto e sem boleto gerado. Clique em &quot;Gerar boleto&quot; para criar no Asaas.
          </p>
        </CardHeader>
        <CardContent>
          {vendasPendentesBoleto.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 rounded-lg border border-dashed border-border bg-muted/30 px-4">
              <p className="text-sm text-muted-foreground">
                Nenhuma venda pendente de boleto. Vendas com opção boleto também aparecem no Histórico.
              </p>
              <Link
                href="/historico?boleto=1"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Ir para Histórico
                <ExternalLink className="h-4 w-4 ml-1" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasPendentesBoleto.map((v) => {
                      const total = valorTotalVenda(v);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">
                            {formatDateBr(v.dataVenda.toISOString().slice(0, 10))}
                          </TableCell>
                          <TableCell>{v.cliente?.nome ?? "—"}</TableCell>
                          <TableCell>{v.produtoNome ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatBRL(total)}
                          </TableCell>
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                O cliente precisa ter CPF ou CNPJ cadastrado para gerar o boleto no Asaas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
