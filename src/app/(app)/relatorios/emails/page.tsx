import { RelatoriosNav } from '@/components/relatorios-nav';
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmailsFiltros } from "@/components/emails-filtros";
import { EmailEnvioDetalhe, type AnexoDetalhe } from "@/components/email-envio-detalhe";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { TIPOS_EMAIL, rotuloTipoEmail, type TipoEmail } from "@/lib/email-tipos";
import { lerPreviaXlsx } from "@/lib/xlsx/previa";

export const dynamic = "force-dynamic";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Busca = { empresa?: string; tipo?: string; mes?: string; envio?: string };

/** Id vindo da URL: só inteiro positivo que cabe no Int do Postgres; o resto vira "sem filtro". */
function idDaUrl(valor: string | undefined): number | undefined {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : undefined;
}

function formatarQuando(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Manaus" }).format(d);
}

/** "2026-09" → limites do mês no fuso de Manaus (UTC-4, sem horário de verão). */
function limitesDoMes(mes: string): { gte: Date; lt: Date } | null {
  const [ano, m] = mes.split("-").map(Number);
  if (!ano || !m || m < 1 || m > 12) return null;
  return { gte: new Date(Date.UTC(ano, m - 1, 1, 4)), lt: new Date(Date.UTC(ano, m, 1, 4)) };
}

function hrefCom(busca: Busca, extra: Partial<Busca>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...busca, ...extra })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/relatorios/emails?${qs}` : "/relatorios/emails";
}

function StatusEnvio({ status }: { status: string }) {
  return status === "enviado" ? <Badge variant="success">Enviado</Badge> : <Badge variant="error">Falhou</Badge>;
}

export default async function Page({ searchParams }: { searchParams: Promise<Busca> }) {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const busca = await searchParams;
  const empresaId = idDaUrl(busca.empresa);
  const tipo = TIPOS_EMAIL.includes(busca.tipo as TipoEmail) ? busca.tipo : undefined;
  const periodo = busca.mes ? limitesDoMes(busca.mes) : null;

  const [empresas, envios] = await Promise.all([
    prisma.empresaParceira.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.emailEnvio.findMany({
      where: {
        ...(empresaId ? { empresaId } : {}),
        ...(tipo ? { tipo } : {}),
        ...(periodo ? { enviadoEm: periodo } : {}),
      },
      select: {
        id: true, tipo: true, status: true, erro: true, enviadoEm: true, para: true, cc: true, assunto: true,
        empresa: { select: { nome: true } },
        anexos: { select: { nome: true } },
      },
      orderBy: { enviadoEm: "desc" },
      take: 200,
    }),
  ]);

  const envioId = idDaUrl(busca.envio) ?? null;
  const selecionado = envioId
    ? await prisma.emailEnvio.findUnique({
        where: { id: envioId },
        include: { empresa: { select: { nome: true } }, anexos: true },
      })
    : null;

  const anexosDetalhe: AnexoDetalhe[] = (selecionado?.anexos ?? []).map((a) => {
    let previa = null;
    if (a.contentType === XLSX_MIME) {
      try {
        previa = lerPreviaXlsx(a.conteudo);
      } catch {
        previa = null;
      }
    }
    return { id: a.id, nome: a.nome, contentType: a.contentType, tamanho: a.tamanho, previa };
  });

  const fecharHref = hrefCom(busca, { envio: undefined });

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-mails enviados"
        description="Tudo o que o sistema mandou para o RH das empresas: para quem foi, quem estava em cópia e o que foi anexado."
        breadcrumbs={[{ label: "Relatórios", href: "/relatorios" }, { label: "E-mails enviados" }]}
      />
      <RelatoriosNav atual="emails" />

      <Card className="p-2">
        <CardContent className="space-y-4 p-4 pb-2">
          <EmailsFiltros
            empresas={empresas}
            empresa={empresaId ? String(empresaId) : ""}
            tipo={tipo ?? ""}
            mes={busca.mes ?? ""}
            total={envios.length}
          />

          {envios.length === 0 ? (
            <EmptyState
              variant="reports"
              size="sm"
              title="Nenhum e-mail encontrado"
              description="O histórico começa a partir de 25/09/2026. Troque os filtros ou aguarde o próximo envio."
            />
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden rounded-interno bg-poco md:block">
                <Table>
                  <TableHeader>
                    <TableRow semHover>
                      <TableHead className="w-32">Enviado em</TableHead>
                      <TableHead className="w-40">Tipo</TableHead>
                      <TableHead className="w-40">Empresa</TableHead>
                      <TableHead>Destinatários e conteúdo</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {envios.map((e) => (
                      <TableRow key={e.id} data-state={e.id === envioId ? "selected" : undefined}>
                        <TableCell tom="muted" mono className="align-top">{formatarQuando(e.enviadoEm)}</TableCell>
                        <TableCell peso="medio" className="align-top">{rotuloTipoEmail(e.tipo)}</TableCell>
                        <TableCell className="align-top">{e.empresa?.nome ?? "—"}</TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-0.5">
                            <div className="font-medium">{e.assunto}</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Para</span> {e.para}
                            </div>
                            {e.cc && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Cc</span> {e.cc}
                              </div>
                            )}
                            {e.anexos.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Anexos</span> {e.anexos.map((a) => a.nome).join(", ")}
                              </div>
                            )}
                            {e.erro && <div className="text-xs text-error-text">{e.erro}</div>}
                            <a href={hrefCom(busca, { envio: String(e.id) })} className="inline-block pt-1 text-sm font-semibold text-marca-tint-texto underline-offset-4 hover:underline">
                              Ver e-mail e arquivos
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="align-top"><StatusEnvio status={e.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {envios.map((e) => (
                  <div key={e.id} className="space-y-1 rounded-interno bg-card-elevated p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{rotuloTipoEmail(e.tipo)}</span>
                      <StatusEnvio status={e.status} />
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {formatarQuando(e.enviadoEm)} · {e.empresa?.nome ?? "—"}
                    </div>
                    <div className="text-sm">{e.assunto}</div>
                    {e.cc && <div className="text-xs text-muted-foreground">Cc {e.cc}</div>}
                    {e.erro && <div className="text-xs text-error-text">{e.erro}</div>}
                    <a href={hrefCom(busca, { envio: String(e.id) })} className="inline-block pt-1 text-sm font-semibold text-marca-tint-texto underline-offset-4 hover:underline">
                      Ver e-mail e arquivos
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selecionado && (
        <EmailEnvioDetalhe
          fecharHref={fecharHref}
          envio={{
            id: selecionado.id,
            tipo: rotuloTipoEmail(selecionado.tipo),
            empresa: selecionado.empresa?.nome ?? null,
            origem: selecionado.origem === "manual" ? "Reenvio manual" : "Automático",
            status: selecionado.status,
            erro: selecionado.erro,
            enviadoEm: formatarQuando(selecionado.enviadoEm),
            remetente: selecionado.remetente,
            para: selecionado.para,
            cc: selecionado.cc,
            assunto: selecionado.assunto,
            corpoHtml: selecionado.corpoHtml,
          }}
          anexos={anexosDetalhe}
        />
      )}
    </div>
  );
}
