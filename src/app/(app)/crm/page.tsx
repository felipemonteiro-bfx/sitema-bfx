import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
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
import {
  nivelFidelidade,
  nivelLabel,
  nivelParaFaixaPontos,
  NIVEIS_FIDELIDADE,
  type NivelFidelidade,
} from "@/lib/fidelidade";
import { mudarEstagioCliente, criarTag, toggleTagCliente } from "./actions";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  estagio?: string;
  empresa?: string;
  tag?: string;
  comprou?: string;
  nivel?: string;
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
  const nivelFiltro = (NIVEIS_FIDELIDADE as string[]).includes(sp.nivel || "")
    ? (sp.nivel as NivelFidelidade)
    : undefined;

  const filtro: SegmentoFiltro = {
    busca: sp.q,
    estagios: estagioFiltro ? [estagioFiltro] : undefined,
    empresaParceiraId: empresaId,
    tagIds: tagId ? [tagId] : undefined,
    comprou,
    pontosRange: nivelFiltro ? nivelParaFaixaPontos(nivelFiltro) : undefined,
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
        pontos: true,
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
      nivel: sp.nivel,
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
            <a href="/crm/atendimento" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
              Atendimento WhatsApp
            </a>
            <a href="/crm/fidelidade" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Fidelidade
            </a>
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
              <Input
                id="q"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Nome do cliente"
                className="w-48"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="empresa" className="text-xs font-medium text-muted-foreground">Empresa</label>
              <FormSelect
                id="empresa"
                name="empresa"
                defaultValue={sp.empresa ?? ""}
                searchable={false}
                className="w-40"
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
                defaultValue={sp.tag ?? ""}
                searchable={false}
                className="w-40"
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
                defaultValue={sp.comprou ?? ""}
                searchable={false}
                className="w-44"
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
                defaultValue={sp.nivel ?? ""}
                searchable={false}
                className="w-36"
                options={[
                  { value: "", label: "Todos" },
                  ...NIVEIS_FIDELIDADE.map((n) => ({ value: n, label: nivelLabel(n) })),
                ]}
              />
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
            <Input name="nome" placeholder="Nova tag" className="w-48" />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id} className="align-top">
                      <TableCell>
                        <div className="font-medium">{c.nome}</div>
                        {c.telefone && <div className="text-xs text-muted-foreground valor-sensivel">{c.telefone}</div>}
                      </TableCell>
                      <TableCell>{c.empresaParceira?.nome ?? c.empresa ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={estagioBadgeVariant(c.estagioCrm)}>{estagioLabel(c.estagioCrm)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {nivelLabel(nivelFidelidade(c.pontos))} · {c.pontos ?? 0} pts
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {c.tags.map((ct) => (
                            <Badge key={ct.tag.id} variant="secondary" size="sm">{ct.tag.nome}</Badge>
                          ))}
                          {tags.length > 0 && (
                            <form action={toggleTagCliente} className="inline-flex items-center gap-1">
                              <input type="hidden" name="clienteId" value={c.id} />
                              <FormSelect
                                name="tagId"
                                defaultValue=""
                                searchable={false}
                                className="h-9 w-28 rounded-md px-2 text-xs"
                                placeholder="+tag"
                                options={tags.map((t) => ({ value: String(t.id), label: t.nome }))}
                              />
                              <button
                                type="submit"
                                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0 text-xs")}
                              >
                                ok
                              </button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c._count.vendas}</TableCell>
                      <TableCell>
                        <form action={mudarEstagioCliente} className="flex items-center gap-1">
                          <input type="hidden" name="clienteId" value={c.id} />
                          <FormSelect
                            name="estagio"
                            defaultValue={c.estagioCrm ?? "cliente"}
                            searchable={false}
                            className="h-9 w-36 rounded-md px-3 text-xs"
                            options={ESTAGIOS_ORDEM.map((e) => ({ value: e, label: estagioLabel(e) }))}
                          />
                          <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Salvar</button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
