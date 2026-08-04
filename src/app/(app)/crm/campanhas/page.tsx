import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { estagioLabel, ESTAGIOS_ORDEM } from "@/lib/crm";
import { NIVEIS_FIDELIDADE, nivelLabel, NIVEL_PRATA_MIN, NIVEL_OURO_MIN } from "@/lib/fidelidade";
import { parseFiltro } from "@/lib/campanha-service";
import { CampanhaTemplatePicker } from "@/components/campanha-template-picker";
import { criarCampanha, carregarTemplates, dispararCampanha, excluirCampanha } from "./actions";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case "concluida":
      return <Badge variant="success">Concluída</Badge>;
    case "enviando":
      return <Badge variant="warning">Enviando…</Badge>;
    case "agendada":
      return <Badge variant="info">Agendada</Badge>;
    default:
      return <Badge variant="outline">Rascunho</Badge>;
  }
}

function formatDataHora(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
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

type Search = { erro?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const sp = await searchParams;

  const [campanhas, empresas, tags, templates] = await Promise.all([
    prisma.campanha.findMany({ orderBy: { criadaEm: "desc" }, take: 100 }),
    prisma.empresaParceira.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.tag.findMany({ orderBy: { nome: "asc" } }),
    carregarTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas de WhatsApp"
        description="Dispare mensagens para um segmento de clientes. Use {nome} para personalizar."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Campanhas" }]}
      />

      {sp.erro && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
          Preencha o nome da campanha e escolha um template antes de criar.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-primary text-base">Nova campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarCampanha} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="nome" className="text-xs font-medium text-muted-foreground">Nome da campanha</label>
                <Input id="nome" name="nome" required />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-1">
                <label htmlFor="estagio" className="text-xs font-medium text-muted-foreground">Estágio</label>
                <FormSelect
                  id="estagio"
                  name="estagio"
                  searchable={false}
                  placeholder="Todos"
                  options={[
                    { value: "", label: "Todos" },
                    ...ESTAGIOS_ORDEM.map((e) => ({ value: e, label: estagioLabel(e) })),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="empresa" className="text-xs font-medium text-muted-foreground">Empresa</label>
                <FormSelect
                  id="empresa"
                  name="empresa"
                  searchable={false}
                  placeholder="Todas"
                  options={[
                    { value: "", label: "Todas" },
                    ...empresas.map((e) => ({ value: String(e.id), label: e.nome })),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="tag" className="text-xs font-medium text-muted-foreground">Tag</label>
                <FormSelect
                  id="tag"
                  name="tag"
                  searchable={false}
                  placeholder="Todas"
                  options={[
                    { value: "", label: "Todas" },
                    ...tags.map((t) => ({ value: String(t.id), label: t.nome })),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="comprou" className="text-xs font-medium text-muted-foreground">Comprou?</label>
                <FormSelect
                  id="comprou"
                  name="comprou"
                  searchable={false}
                  placeholder="Todos"
                  options={[
                    { value: "", label: "Todos" },
                    { value: "sim", label: "Já comprou" },
                    { value: "nao", label: "Nunca comprou (lead)" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="nivel" className="text-xs font-medium text-muted-foreground">Nível</label>
                <FormSelect
                  id="nivel"
                  name="nivel"
                  searchable={false}
                  placeholder="Todos"
                  options={[
                    { value: "", label: "Todos" },
                    ...NIVEIS_FIDELIDADE.map((n) => ({ value: n, label: nivelLabel(n) })),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Template — use <code>{"{nome}"}</code> ou <code>{"{primeiroNome}"}</code> nas variáveis
              </span>
              <CampanhaTemplatePicker
                templates={templates}
                onAtualizar={async () => {
                  "use server";
                  return carregarTemplates(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="agendadaPara" className="text-xs font-medium text-muted-foreground">
                Agendar para (opcional) — se vazio, fica em rascunho
              </label>
              <Input
                id="agendadaPara"
                name="agendadaPara"
                type="datetime-local"
                className="max-w-xs"
              />
            </div>

            <Button type="submit">Criar campanha</Button>
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
                    {c.agendadaPara && ` · Agendada: ${formatDataHora(c.agendadaPara)}`}
                  </div>
                  <div className="mt-1 line-clamp-2 max-w-xl text-sm text-muted-foreground">{c.mensagem}</div>
                  {!c.templateNome && (
                    <p className="mt-1 text-xs text-warning">
                      Campanha anterior à migração para a Cloud API — somente leitura. Recrie escolhendo um template.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {c.status !== "concluida" && c.templateNome && (
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
