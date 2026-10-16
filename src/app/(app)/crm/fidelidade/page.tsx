import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NavAreasCrm } from "../nav-areas-crm";
import { EmptyState } from "@/components/ui/empty-state";
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
        description={
          <>
            Pontos por compra: {PONTOS_POR_REAL} ponto por real · resgate: cada ponto vale{" "}
            <span className="valor-sensivel">{formatBRL(VALOR_POR_PONTO)}</span>.
          </>
        }
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Fidelidade" }]}
        actions={<NavAreasCrm atual="/crm/fidelidade" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* min-w-0: item de grid tem `min-width:auto`, entao o min-content de
            473px da tabela empurrava a pagina inteira (scrollWidth 552 em
            390px). Com min-w-0 a rolagem volta para o `.overflow-x-auto`
            interno, que e onde ela pertence. */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Saldo de pontos por cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {clientes.length === 0 ? (
              <EmptyState variant="clients" size="sm" title="Nenhum cliente com pontos" description="Os pontos são creditados automaticamente a cada venda." />
            ) : (
              <div className="overflow-x-auto rounded-interno bg-poco">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Pontos</TableHead>
                      <TableHead className="text-right">Vale</TableHead>
                      <TableHead>Resgatar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.nome}</TableCell>
                        <TableCell peso="medio" numeric>{c.pontos ?? 0}</TableCell>
                        <TableCell numeric className="valor-sensivel valor-sensivel-fim">{formatBRL(valorEmReais(c.pontos ?? 0))}</TableCell>
                        <TableCell>
                          <form action={resgatarPontosCliente} className="flex items-center gap-1">
                            <input type="hidden" name="clienteId" value={c.id} />
                            <Input
                              type="number"
                              name="pontos"
                              min={1}
                              max={c.pontos ?? 0}
                              placeholder="pts"
                              inputSize="sm"
                              className="w-20"
                            />
                            <Button type="submit" variant="outline" size="sm">Resgatar</Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {extrato.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentações ainda.</p>
            ) : (
              <ul className="rounded-interno bg-poco px-4 py-1 text-sm">
                {extrato.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 border-b border-divisoria py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{t.cliente?.nome ?? `#${t.clienteId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.descricao ?? t.tipo} · {formatDataHora(t.criadoEm)}
                      </div>
                    </div>
                    <Badge numerico variant={t.pontos >= 0 ? "success" : "error"}>
                      {t.pontos >= 0 ? "+" : ""}{t.pontos}
                    </Badge>
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
