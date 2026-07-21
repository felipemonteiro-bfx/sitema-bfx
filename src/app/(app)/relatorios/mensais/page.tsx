import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
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
              <input
                id="periodo"
                name="periodo"
                type="month"
                defaultValue={periodoDefault}
                className="block h-input rounded-md border-2 border-input bg-background px-3 text-sm"
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
                  <span className="text-sm text-muted-foreground">{formatBRL(totalPeriodo)}</span>
                </CardHeader>
                <CardContent>
                  {/* Desktop: tabela */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Empresa</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 pr-3 font-medium text-right">Vendas</th>
                          <th className="py-2 pr-3 font-medium text-right">Valor</th>
                          <th className="py-2 pr-3 font-medium">Enviado em</th>
                          <th className="py-2 pr-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((log) => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{log.empresa?.nome ?? `#${log.empresaId}`}</td>
                            <td className="py-2 pr-3">{statusBadge(log.status)}</td>
                            <td className="py-2 pr-3 text-right">{log.totalVendas}</td>
                            <td className="py-2 pr-3 text-right">{formatBRL(log.valorTotal)}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{formatDataHora(log.enviadoEm)}</td>
                            <td className="py-2 pr-3">
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="space-y-3 md:hidden">
                    {itens.map((log) => (
                      <div key={log.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{log.empresa?.nome ?? `#${log.empresaId}`}</span>
                          {statusBadge(log.status)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
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
