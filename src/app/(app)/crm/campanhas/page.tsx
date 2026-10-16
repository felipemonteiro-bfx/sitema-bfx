import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCampanhaButton } from "@/components/delete-campanha-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { RotuloCampo } from "@/components/rotulo-campo";
import { NavAreasCrm } from "../nav-areas-crm";
import { FormSelect } from "@/components/form-select";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
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
        actions={<NavAreasCrm atual="/crm/campanhas" />}
      />

      {sp.erro && (
        <Alert variant="error" showIcon>
          Preencha o nome da campanha e escolha um template antes de criar.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarCampanha} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <RotuloCampo htmlFor="nome">Nome da campanha</RotuloCampo>
                <Input id="nome" name="nome" required />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-1.5">
                <RotuloCampo htmlFor="estagio">Estágio</RotuloCampo>
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
              <div className="space-y-1.5">
                <RotuloCampo htmlFor="empresa">Empresa</RotuloCampo>
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
              <div className="space-y-1.5">
                <RotuloCampo htmlFor="tag">Tag</RotuloCampo>
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
              <div className="space-y-1.5">
                <RotuloCampo htmlFor="comprou">Comprou?</RotuloCampo>
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
              <div className="space-y-1.5">
                <RotuloCampo htmlFor="nivel">Nível</RotuloCampo>
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

            <div className="space-y-1.5">
              <RotuloCampo asChild>
                <span>
                  Template — use <code>{"{nome}"}</code> ou <code>{"{primeiroNome}"}</code> nas variáveis
                </span>
              </RotuloCampo>
              <CampanhaTemplatePicker
                templates={templates}
                onAtualizar={async () => {
                  "use server";
                  return carregarTemplates(true);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <RotuloCampo htmlFor="agendadaPara">Agendar para (opcional) — se vazio, fica em rascunho</RotuloCampo>
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
        <Card className="p-5 anim-entrada">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Campanhas</h2>
            <p className="text-sm text-muted-foreground">{campanhas.length} campanha(s), da mais recente para a mais antiga.</p>
          </div>
          <div className="space-y-3">
            {campanhas.map((c) => (
              <article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-interno bg-card-elevated p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{c.nome}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Segmento: {resumoFiltro(c.filtroJson)} · Alvo: {c.totalAlvo} · Enviados: {c.totalEnviado}
                    {c.agendadaPara && ` · Agendada: ${formatDataHora(c.agendadaPara)}`}
                  </div>
                  <div className="mt-1 line-clamp-2 max-w-xl text-sm text-muted-foreground">{c.mensagem}</div>
                  {!c.templateNome && (
                    <p className="mt-2">
                      <Badge variant="warning" size="sm">Somente leitura</Badge>{" "}
                      <span className="text-xs text-muted-foreground">
                        Campanha anterior à migração para a Cloud API. Recrie escolhendo um template.
                      </span>
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
                  <DeleteCampanhaButton
                    campanhaId={c.id}
                    campanhaNome={c.nome}
                    deleteAction={excluirCampanha}
                  />
                </div>
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
