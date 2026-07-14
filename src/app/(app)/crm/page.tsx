import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Prisma } from "@/generated/prisma";
import {
  buildClienteSegmentWhere,
  estagioLabel,
  ESTAGIOS_ORDEM,
  ESTAGIOS_CRM,
  type EstagioCrm,
  type SegmentoFiltro,
} from "@/lib/crm";
import { mudarEstagioCliente, criarTag, toggleTagCliente } from "./actions";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  estagio?: string;
  empresa?: string;
  tag?: string;
  comprou?: string;
};

function estagioBadgeVariant(estagio: string | null | undefined) {
  switch (estagio) {
    case ESTAGIOS_CRM.NOVO_LEAD:
      return "info" as const;
    case ESTAGIOS_CRM.CONTATADO:
      return "secondary" as const;
    case ESTAGIOS_CRM.NEGOCIANDO:
      return "warning" as const;
    case ESTAGIOS_CRM.CLIENTE:
      return "success" as const;
    case ESTAGIOS_CRM.INATIVO:
      return "ghost" as const;
    default:
      return "outline" as const;
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const sp = await searchParams;
  const estagioFiltro = (ESTAGIOS_ORDEM as string[]).includes(sp.estagio || "")
    ? (sp.estagio as EstagioCrm)
    : undefined;
  const empresaId = sp.empresa ? Number(sp.empresa) : undefined;
  const tagId = sp.tag ? Number(sp.tag) : undefined;
  const comprou = sp.comprou === "sim" ? true : sp.comprou === "nao" ? false : undefined;

  const filtro: SegmentoFiltro = {
    busca: sp.q,
    estagios: estagioFiltro ? [estagioFiltro] : undefined,
    empresaParceiraId: empresaId,
    tagIds: tagId ? [tagId] : undefined,
    comprou,
  };
  const where = buildClienteSegmentWhere(filtro) as unknown as Prisma.ClienteWhereInput;

  const [clientes, empresas, tags, porEstagio] = await Promise.all([
    prisma.cliente.findMany({
      where,
      select: {
        id: true,
        nome: true,
        telefone: true,
        empresa: true,
        estagioCrm: true,
        empresaParceira: { select: { nome: true } },
        tags: { select: { tag: { select: { id: true, nome: true, cor: true } } } },
        _count: { select: { vendas: true } },
      },
      orderBy: { nome: "asc" },
      take: 200,
    }),
    prisma.empresaParceira.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.tag.findMany({ orderBy: { nome: "asc" } }),
    prisma.cliente.groupBy({ by: ["estagioCrm"], _count: { _all: true } }),
  ]);

  const countByEstagio = new Map<string, number>();
  for (const g of porEstagio) countByEstagio.set(g.estagioCrm ?? "cliente", g._count._all);

  const qs = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: sp.q,
      estagio: sp.estagio,
      empresa: sp.empresa,
      tag: sp.tag,
      comprou: sp.comprou,
      ...extra,
    };
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/crm?${s}` : "/crm";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Funil de relacionamento: leads, clientes e segmentação. Tudo sobre a mesma base de clientes."
        breadcrumbs={[{ label: "CRM" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href="/crm/campanhas" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Campanhas
            </a>
            <a href="/crm/importar-leads" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
              Importar leads
            </a>
          </div>
        }
      />

      {/* Funil: contagem por estágio (clicável para filtrar) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ESTAGIOS_ORDEM.map((e) => {
          const ativo = estagioFiltro === e;
          return (
            <a
              key={e}
              href={qs({ estagio: ativo ? undefined : e })}
              className={cn(
                "rounded-lg border p-3 transition-colors hover:bg-muted",
                ativo && "border-primary bg-primary/5"
              )}
            >
              <div className="text-xs text-muted-foreground">{estagioLabel(e)}</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{countByEstagio.get(e) ?? 0}</div>
            </a>
          );
        })}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap items-end gap-3">
            {estagioFiltro && <input type="hidden" name="estagio" value={estagioFiltro} />}
            <div className="space-y-1">
              <label htmlFor="q" className="text-xs font-medium text-muted-foreground">Buscar por nome</label>
              <input
                id="q"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Nome do cliente"
                className="block h-input rounded-md border-2 border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="empresa" className="text-xs font-medium text-muted-foreground">Empresa</label>
              <select id="empresa" name="empresa" defaultValue={sp.empresa ?? ""} className="block h-input rounded-md border-2 border-input bg-background px-3 text-sm">
                <option value="">Todas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={String(e.id)}>{e.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="tag" className="text-xs font-medium text-muted-foreground">Tag</label>
              <select id="tag" name="tag" defaultValue={sp.tag ?? ""} className="block h-input rounded-md border-2 border-input bg-background px-3 text-sm">
                <option value="">Todas</option>
                {tags.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="comprou" className="text-xs font-medium text-muted-foreground">Comprou?</label>
              <select id="comprou" name="comprou" defaultValue={sp.comprou ?? ""} className="block h-input rounded-md border-2 border-input bg-background px-3 text-sm">
                <option value="">Todos</option>
                <option value="sim">Já comprou</option>
                <option value="nao">Nunca comprou (lead)</option>
              </select>
            </div>
            <Button type="submit">Filtrar</Button>
            <a href="/crm" className={cn(buttonVariants({ variant: "ghost" }))}>Limpar</a>
          </form>
        </CardContent>
      </Card>

      {/* Gerenciar tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma tag ainda.</span>}
            {tags.map((t) => (
              <Badge key={t.id} variant="outline">{t.nome}</Badge>
            ))}
          </div>
          <form action={criarTag} className="flex flex-wrap items-end gap-2">
            <input name="nome" placeholder="Nova tag" className="h-input rounded-md border-2 border-input bg-background px-3 text-sm" />
            <Button type="submit" variant="outline" size="sm">Criar tag</Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista */}
      {clientes.length === 0 ? (
        <EmptyState variant="clients" title="Nenhum cliente no segmento" description="Ajuste os filtros ou importe leads (funcionários das empresas parceiras)." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary text-base">{clientes.length} cliente(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Nome</th>
                    <th className="py-2 pr-3 font-medium">Empresa</th>
                    <th className="py-2 pr-3 font-medium">Estágio</th>
                    <th className="py-2 pr-3 font-medium">Tags</th>
                    <th className="py-2 pr-3 font-medium">Compras</th>
                    <th className="py-2 pr-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{c.nome}</div>
                        {c.telefone && <div className="text-xs text-muted-foreground">{c.telefone}</div>}
                      </td>
                      <td className="py-2 pr-3">{c.empresaParceira?.nome ?? c.empresa ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={estagioBadgeVariant(c.estagioCrm)}>{estagioLabel(c.estagioCrm)}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((ct) => (
                            <Badge key={ct.tag.id} variant="secondary" size="sm">{ct.tag.nome}</Badge>
                          ))}
                          {tags.length > 0 && (
                            <form action={toggleTagCliente} className="inline-flex items-center gap-1">
                              <input type="hidden" name="clienteId" value={c.id} />
                              <select name="tagId" defaultValue="" className="h-6 rounded border border-input bg-background px-1 text-[11px]">
                                <option value="">+tag</option>
                                {tags.map((t) => (
                                  <option key={t.id} value={String(t.id)}>{t.nome}</option>
                                ))}
                              </select>
                              <button type="submit" className="text-[11px] text-primary hover:underline">ok</button>
                            </form>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{c._count.vendas}</td>
                      <td className="py-2 pr-3">
                        <form action={mudarEstagioCliente} className="flex items-center gap-1">
                          <input type="hidden" name="clienteId" value={c.id} />
                          <select name="estagio" defaultValue={c.estagioCrm ?? "cliente"} className="h-7 rounded border border-input bg-background px-1 text-xs">
                            {ESTAGIOS_ORDEM.map((e) => (
                              <option key={e} value={e}>{estagioLabel(e)}</option>
                            ))}
                          </select>
                          <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Salvar</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
