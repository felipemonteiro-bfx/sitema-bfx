import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ReportButtonsClient } from "@/components/report-buttons-client";
import { cn } from "@/lib/utils";
import { montarEmpresaOptions } from "@/lib/empresa-options";
import { formatarDataPura } from "@/lib/data-pura";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = format(now, "yyyy-MM-dd");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const [empresas, fornecedores] = await Promise.all([
    prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ where: { deletedAt: null }, select: { nome: true } }),
  ]);
  // DAT-03/D-06: os botoes de Exportacao Rapida vem do banco, sem nenhuma
  // lista de nomes fixa no codigo. montarEmpresaOptions preserva a regra que
  // exclui empresas cujo nome coincida com o de um fornecedor.
  const empresaOptions = montarEmpresaOptions(empresas, fornecedores);

  // Era `new Date(value + "T00:00:00")` (parse LOCAL) formatado em Manaus — dois
  // deslocamentos somados. Data pura se le e se exibe em UTC.
  const formatDateBR = formatarDataPura;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Exporte relatórios de vendas e financeiro."
        breadcrumbs={[{ label: "Relatórios" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-primary">Relatório de vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ReportButtonsClient
              empresaOptions={empresaOptions}
              defaultFrom={monthStartStr}
              defaultTo={today}
            />

            <div className="text-xs text-muted-foreground pt-2">
              Período padrão: mês atual ({formatDateBR(monthStartStr)} a {formatDateBR(today)}).
            </div>
            
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <span className="w-full text-xs font-bold text-muted-foreground uppercase mb-1">Exportação Rápida (PDF)</span>
              {empresaOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma empresa parceira elegível encontrada. Cadastre uma em{" "}
                  <a href="/cadastros?tab=empresas" className="underline">Cadastros → Empresas</a>.
                </p>
              ) : (
                empresaOptions.map((empresa) => (
                  <a
                    key={empresa}
                    href={`/api/relatorios/vendas/pdf?empresa=${encodeURIComponent(empresa)}&from=${monthStartStr}&to=${today}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    PDF {empresa}
                  </a>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Outros Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Inadimplência</Label>
              <div className="flex gap-2">
                <a
                  href={`/api/relatorios/inadimplencia?from=${monthStartStr}&to=${today}&format=csv`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                >
                  CSV
                </a>
                <a
                  href={`/api/relatorios/inadimplencia?from=${monthStartStr}&to=${today}&format=pdf`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                >
                  PDF
                </a>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Margem por Produto</Label>
              <div className="flex gap-2">
                <a
                  href={`/api/relatorios/margem-produto?from=${monthStartStr}&to=${today}&format=csv`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                >
                  CSV
                </a>
                <a
                  href={`/api/relatorios/margem-produto?from=${monthStartStr}&to=${today}&format=pdf`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                >
                  PDF
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/relatorios/mensais"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Relatórios mensais por empresa
            </a>
            <a
              href="/relatorios"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Limpar filtros
            </a>
            <a
              href="/financeiro"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Abrir Financeiro
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
