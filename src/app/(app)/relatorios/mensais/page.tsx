import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatBRL, cn } from "@/lib/utils";
import { periodoLabel, periodoMesAnterior } from "@/lib/relatorio-mensal";
import { reenviarRelatorioMensal, gerarRelatoriosMensais } from "./actions";

export const dynamic = "force-dynamic";

type StatusRel = string;

function statusBadge(status: StatusRel) {
  switch (status) {
    case "enviado":
      return <Badge variant="success">Enviado</Badge>;
    case "sem_email":
      return <Badge variant="warning">Sem e-mail (WhatsApp)</Badge>;
    case "sem_vendas":
      return <Badge variant="ghost">Sem vendas</Badge>;
    case "erro":
      return <Badge variant="error">Erro</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDataHora(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const logs = await prisma.relatorioEnvioLog.findMany({
    where: { tipo: "mensal" },
    include: { empresa: { select: { nome: true } } },
    orderBy: [{ periodo: "desc" }, { enviadoEm: "desc" }],
    take: 200,
  });

  const periodoDefault = periodoMesAnterior(new Date());

  // agrupa por periodo (mantendo ordem desc)
  const porPeriodo = new Map<string, typeof logs>();
  for (const log of logs) {
    const lista = porPeriodo.get(log.periodo);
    if (lista) lista.push(log);
    else porPeriodo.set(log.periodo, [log]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios Mensais por Empresa"
        description="Histórico de envios do relatório mensal de vendas às empresas parceiras."
        breadcrumbs={[{ label: "Relatórios", href: "/relatorios" }, { label: "Mensais" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Gerar / enviar agora</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={gerarRelatoriosMensais} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="periodo" className="text-xs font-medium text-muted-foreground">
                Período (mês)
              </label>
              <Input
                id="periodo"
                name="periodo"
                type="month"
                defaultValue={periodoDefault}
                className="w-44"
              />
            </div>
            <Button type="submit">Gerar e enviar</Button>
            <p className="w-full text-xs text-muted-foreground">
              Envia o relatório do mês escolhido para todas as empresas que ainda não receberam. Use
              &quot;Reenviar&quot; abaixo para forçar o reenvio de uma empresa específica.
            </p>
          </form>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <EmptyState
          variant="reports"
          title="Nenhum relatório enviado ainda"
          description="Os envios aparecem aqui após o cron mensal rodar ou você gerar manualmente acima."
        />
      ) : (
        <div className="space-y-6">
          {[...porPeriodo.entries()].map(([periodo, itens]) => {
            const totalPeriodo = itens.reduce((s, i) => s + i.valorTotal, 0);
            return (
              <Card key={periodo}>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle className="text-primary">{periodoLabel(periodo)}</CardTitle>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatBRL(totalPeriodo)}</span>
                </CardHeader>
                <CardContent>
                  {/* Desktop: tabela */}
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Enviado em</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{log.empresa?.nome ?? `#${log.empresaId}`}</TableCell>
                            <TableCell>{statusBadge(log.status)}</TableCell>
                            <TableCell className="text-right tabular-nums">{log.totalVendas}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatBRL(log.valorTotal)}</TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">{formatDataHora(log.enviadoEm)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={`/api/relatorios/mensais/${log.id}/download?tipo=pdf`}
                                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                                >
                                  PDF
                                </a>
                                <a
                                  href={`/api/relatorios/mensais/${log.id}/download?tipo=xlsx`}
                                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                                >
                                  XLSX
                                </a>
                                <form action={reenviarRelatorioMensal}>
                                  <input type="hidden" name="empresaId" value={log.empresaId} />
                                  <input type="hidden" name="periodo" value={log.periodo} />
                                  <Button type="submit" variant="ghost" size="sm">
                                    Reenviar
                                  </Button>
                                </form>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="space-y-3 md:hidden">
                    {itens.map((log) => (
                      <div key={log.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{log.empresa?.nome ?? `#${log.empresaId}`}</span>
                          {statusBadge(log.status)}
                        </div>
                        <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {log.totalVendas} vendas · {formatBRL(log.valorTotal)} · {formatDataHora(log.enviadoEm)}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a
                            href={`/api/relatorios/mensais/${log.id}/download?tipo=pdf`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            PDF
                          </a>
                          <a
                            href={`/api/relatorios/mensais/${log.id}/download?tipo=xlsx`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            XLSX
                          </a>
                          <form action={reenviarRelatorioMensal}>
                            <input type="hidden" name="empresaId" value={log.empresaId} />
                            <input type="hidden" name="periodo" value={log.periodo} />
                            <Button type="submit" variant="ghost" size="sm">
                              Reenviar
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
