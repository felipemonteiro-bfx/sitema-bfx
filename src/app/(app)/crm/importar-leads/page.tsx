import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/form-select";
import { Alert } from "@/components/ui/alert";
import { RotuloCampo } from "@/components/rotulo-campo";
import { NavAreasCrm } from "../nav-areas-crm";
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
        actions={<NavAreasCrm atual="/crm" />}
      />

      {sp.ok && (
        <Alert variant="success" showIcon>
          Importação concluída: {sp.criados ?? 0} novo(s) lead(s), {sp.vinculados ?? 0} já existente(s)
          atualizado(s), {sp.ignorados ?? 0} linha(s) ignorada(s).
        </Alert>
      )}
      {sp.erro && (
        <Alert variant="error" showIcon>
          {sp.erro === "empresa" ? "Empresa não encontrada." : "Preencha a empresa e a lista."}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importarLeads} className="space-y-4">
            <div className="space-y-1.5">
              <RotuloCampo htmlFor="empresaId">Empresa parceira</RotuloCampo>
              <FormSelect
                id="empresaId"
                name="empresaId"
                placeholder="Selecione…"
                className="max-w-md"
                options={empresas.map((e) => ({ value: String(e.id), label: e.nome }))}
              />
            </div>

            <div className="space-y-1.5">
              <RotuloCampo htmlFor="lista">
                Uma pessoa por linha — <code>Nome; Matrícula; Telefone</code> (separador <code>;</code>, vírgula ou tab)
              </RotuloCampo>
              <Textarea
                id="lista"
                name="lista"
                required
                rows={12}
                placeholder={"MARIA DA SILVA; 12345; 92984778250\nJOÃO SOUZA; 67890; 92991234567"}
                className="font-mono text-sm"
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
