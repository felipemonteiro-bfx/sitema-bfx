import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { estagioLabel, ESTAGIOS_ORDEM } from "@/lib/crm";
import { NIVEIS_FIDELIDADE, nivelLabel, NIVEL_PRATA_MIN, NIVEL_OURO_MIN } from "@/lib/fidelidade";
import { parseFiltro } from "@/lib/campanha-service";
import { criarCampanha, dispararCampanha, excluirCampanha } from "./actions";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case "concluida":
      return <Badge variant="success">Concluída</Badge>;
    case "enviando":
      return <Badge variant="warning">Enviando…</Badge>;
    default:
      return <Badge variant="outline">Rascunho</Badge>;
  }
}

function resumoFiltro(filtroJson: string): string {
  const f = parseFiltro(filtroJson);
  const partes: string[] = [];
  if (f.estagios?.length) partes.push(f.estagios.map(estagioLabel).join("/"));
  if (f.comprou === false) partes.push("nunca comprou");
  if (f.comprou === true) partes.push("já comprou");
  if (f.empresaParceiraId) partes.push(`empresa #${f.empresaParceiraId}`);
  if (f.tagIds?.length) partes.push(`tag #${f.tagIds.join(",")}`);
  if (f.pontosRange) {
    if (f.pontosRange.gte === NIVEL_OURO_MIN) partes.push("nível Ouro");
    else if (f.pontosRange.gte === NIVEL_PRATA_MIN) partes.push("nível Prata");
    else if (f.pontosRange.lt === NIVEL_PRATA_MIN) partes.push("nível Bronze");
  }
  return partes.length ? partes.join(" · ") : "todos os clientes";
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const [campanhas, empresas, tags] = await Promise.all([
    prisma.campanha.findMany({ orderBy: { criadaEm: "desc" }, take: 100 }),
    prisma.empresaParceira.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.tag.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas de WhatsApp"
        description="Dispare mensagens para um segmento de clientes. Use {nome} para personalizar."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Campanhas" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-primary text-base">Nova campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarCampanha} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="nome" className="text-xs font-medium text-muted-foreground">Nome da campanha</label>
                <input id="nome" name="nome" required className="block h-input w-full rounded-md border-2 border-input bg-background px-3 text-sm" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-1">
                <label htmlFor="estagio" className="text-xs font-medium text-muted-foreground">Estágio</label>
                <select id="estagio" name="estagio" className="block h-input w-full rounded-md border-2 border-input bg-background px-2 text-sm">
                  <option value="">Todos</option>
                  {ESTAGIOS_ORDEM.map((e) => (
                    <option key={e} value={e}>{estagioLabel(e)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="empresa" className="text-xs font-medium text-muted-foreground">Empresa</label>
                <select id="empresa" name="empresa" className="block h-input w-full rounded-md border-2 border-input bg-background px-2 text-sm">
                  <option value="">Todas</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={String(e.id)}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="tag" className="text-xs font-medium text-muted-foreground">Tag</label>
                <select id="tag" name="tag" className="block h-input w-full rounded-md border-2 border-input bg-background px-2 text-sm">
                  <option value="">Todas</option>
                  {tags.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="comprou" className="text-xs font-medium text-muted-foreground">Comprou?</label>
                <select id="comprou" name="comprou" className="block h-input w-full rounded-md border-2 border-input bg-background px-2 text-sm">
                  <option value="">Todos</option>
                  <option value="sim">Já comprou</option>
                  <option value="nao">Nunca comprou (lead)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="nivel" className="text-xs font-medium text-muted-foreground">Nível</label>
                <select id="nivel" name="nivel" className="block h-input w-full rounded-md border-2 border-input bg-background px-2 text-sm">
                  <option value="">Todos</option>
                  {NIVEIS_FIDELIDADE.map((n) => (
                    <option key={n} value={n}>{nivelLabel(n)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="mensagem" className="text-xs font-medium text-muted-foreground">
                Mensagem — use <code>{"{nome}"}</code> ou <code>{"{primeiroNome}"}</code>
              </label>
              <textarea id="mensagem" name="mensagem" required rows={4} placeholder="Olá {primeiroNome}! Temos novidades pra você…" className="block w-full rounded-md border-2 border-input bg-background p-3 text-sm" />
            </div>

            <Button type="submit">Criar campanha (rascunho)</Button>
          </form>
        </CardContent>
      </Card>

      {campanhas.length === 0 ? (
        <EmptyState variant="inbox" title="Nenhuma campanha ainda" description="Crie uma campanha acima e dispare para o segmento escolhido." />
      ) : (
        <div className="space-y-3">
          {campanhas.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.nome}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Segmento: {resumoFiltro(c.filtroJson)} · Alvo: {c.totalAlvo} · Enviados: {c.totalEnviado}
                  </div>
                  <div className="mt-1 line-clamp-2 max-w-xl text-sm text-muted-foreground">{c.mensagem}</div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status !== "concluida" && (
                    <form action={dispararCampanha}>
                      <input type="hidden" name="campanhaId" value={c.id} />
                      <Button type="submit" size="sm">Disparar agora</Button>
                    </form>
                  )}
                  <form action={excluirCampanha}>
                    <input type="hidden" name="campanhaId" value={c.id} />
                    <button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Excluir</button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
