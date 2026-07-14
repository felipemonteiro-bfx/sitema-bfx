import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { importarLeads } from "./actions";

export const dynamic = "force-dynamic";

type Search = { ok?: string; criados?: string; vinculados?: string; ignorados?: string; erro?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito.</div>;

  const sp = await searchParams;
  const empresas = await prisma.empresaParceira.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar leads (funcionários)"
        description="Cole a lista de funcionários de uma empresa parceira. Cada um vira um lead no funil e, ao comprar, vira cliente automaticamente."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Importar leads" }]}
      />

      {sp.ok && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          Importação concluída: {sp.criados ?? 0} novo(s) lead(s), {sp.vinculados ?? 0} já existente(s)
          atualizado(s), {sp.ignorados ?? 0} linha(s) ignorada(s).
        </div>
      )}
      {sp.erro && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
          {sp.erro === "empresa" ? "Empresa não encontrada." : "Preencha a empresa e a lista."}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-primary text-base">Lista de funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importarLeads} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="empresaId" className="text-xs font-medium text-muted-foreground">
                Empresa parceira
              </label>
              <select
                id="empresaId"
                name="empresaId"
                required
                className="block h-input w-full max-w-md rounded-md border-2 border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={String(e.id)}>{e.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="lista" className="text-xs font-medium text-muted-foreground">
                Uma pessoa por linha — <code>Nome; Matrícula; Telefone</code> (separador <code>;</code>, vírgula ou tab)
              </label>
              <textarea
                id="lista"
                name="lista"
                required
                rows={12}
                placeholder={"MARIA DA SILVA; 12345; 92984778250\nJOÃO SOUZA; 67890; 92991234567"}
                className="block w-full rounded-md border-2 border-input bg-background p-3 font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">Importar leads</Button>
              <a href="/crm" className={cn(buttonVariants({ variant: "ghost" }))}>Voltar ao CRM</a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
