import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/utils";
import { valorEmReais, VALOR_POR_PONTO, PONTOS_POR_REAL } from "@/lib/fidelidade";
import { resgatarPontosCliente } from "./actions";

export const dynamic = "force-dynamic";

function formatDataHora(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const [clientes, extrato] = await Promise.all([
    prisma.cliente.findMany({
      where: { pontos: { gt: 0 } },
      select: { id: true, nome: true, pontos: true },
      orderBy: { pontos: "desc" },
      take: 100,
    }),
    prisma.pontoTransacao.findMany({
      orderBy: { criadoEm: "desc" },
      take: 20,
      include: { cliente: { select: { nome: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fidelidade"
        description={`Pontos por compra: ${PONTOS_POR_REAL} ponto por real · resgate: cada ponto vale ${formatBRL(VALOR_POR_PONTO)}.`}
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Fidelidade" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary text-base">Saldo de pontos por cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {clientes.length === 0 ? (
              <EmptyState variant="clients" size="sm" title="Nenhum cliente com pontos" description="Os pontos são creditados automaticamente a cada venda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Cliente</th>
                      <th className="py-2 pr-3 font-medium text-right">Pontos</th>
                      <th className="py-2 pr-3 font-medium text-right">Vale</th>
                      <th className="py-2 pr-3 font-medium">Resgatar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{c.nome}</td>
                        <td className="py-2 pr-3 text-right font-medium">{c.pontos ?? 0}</td>
                        <td className="py-2 pr-3 text-right text-success">{formatBRL(valorEmReais(c.pontos ?? 0))}</td>
                        <td className="py-2 pr-3">
                          <form action={resgatarPontosCliente} className="flex items-center gap-1">
                            <input type="hidden" name="clienteId" value={c.id} />
                            <input
                              type="number"
                              name="pontos"
                              min={1}
                              max={c.pontos ?? 0}
                              placeholder="pts"
                              className="h-7 w-20 rounded border border-input bg-background px-2 text-xs"
                            />
                            <Button type="submit" variant="outline" size="sm">Resgatar</Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary text-base">Movimentações recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {extrato.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentações ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {extrato.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{t.cliente?.nome ?? `#${t.clienteId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.descricao ?? t.tipo} · {formatDataHora(t.criadoEm)}
                      </div>
                    </div>
                    <span className={t.pontos >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                      {t.pontos >= 0 ? "+" : ""}{t.pontos}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
