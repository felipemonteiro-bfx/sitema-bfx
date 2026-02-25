import { getAsaasConfig, listPayments } from "@/lib/asaas";
import { requireAdmin } from "@/lib/guards";
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
import type { AsaasPaymentListItem } from "@/lib/asaas";

function formatDateBr(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default async function BoletosPage() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const config = getAsaasConfig();
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
              Configure a variável de ambiente ASAAS_API_KEY para visualizar o dashboard de boletos.
              Os boletos são gerados pela integração com o Asaas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  let vencidos: AsaasPaymentListItem[] = [];
  let aVencer: AsaasPaymentListItem[] = [];
  let pagos: AsaasPaymentListItem[] = [];

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
  }

  const totalVencidos = vencidos.reduce((s, p) => s + p.value, 0);
  const totalAVencer = aVencer.reduce((s, p) => s + p.value, 0);
  const totalPagos = pagos.reduce((s, p) => s + p.value, 0);

  const TableBoletos = ({
    items,
    emptyMessage,
    linkLabel = "Ver boleto",
  }: {
    items: AsaasPaymentListItem[];
    emptyMessage: string;
    linkLabel?: string;
  }) => (
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Boletos</h1>
        <p className="text-sm text-muted-foreground">
          Boletos emitidos pelo Asaas — vencidos, a vencer e pagos
        </p>
      </div>

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
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Gerar boleto manualmente</p>
              <p className="text-sm text-muted-foreground">
                Vendas com opção boleto podem ser geradas pelo Histórico
              </p>
            </div>
          </div>
          <Link
            href="/historico?boleto=1"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Ir para Histórico
            <ExternalLink className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
