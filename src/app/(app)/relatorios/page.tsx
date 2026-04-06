import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { DateInput } from "@/components/ui/date-input";
import { format } from "date-fns";
import { ReportButtonsClient } from "@/components/report-buttons-client";
import { cn } from "@/lib/utils";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = format(now, "yyyy-MM-dd");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const [empresas, fornecedores] = await Promise.all([
    prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ select: { nome: true } }),
  ]);
  const nomesFornecedores = new Set(fornecedores.map((f) => f.nome.toLowerCase()));
  const extraEmpresas = ["Amazonfive", "Gimam"];
  const empresaOptions = [
    ...empresas
      .map((e) => e.nome)
      .filter((nome) => !nomesFornecedores.has(nome.toLowerCase())),
    ...extraEmpresas.filter(
      (name) =>
        !empresas.some((e) => e.nome.toLowerCase() === name.toLowerCase()) &&
        !nomesFornecedores.has(name.toLowerCase()),
    ),
  ];

  const formatDateBR = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Manaus" }).format(new Date(value + "T00:00:00"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatorios"
        description="Exporte relatorios de vendas e financeiro."
        breadcrumbs={[{ label: "Relatorios" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-primary">Relatório de vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              id="report-form"
              method="GET"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-1">
                <Label htmlFor="rel-empresa">Empresa Parceira</Label>
                <FormSelect
                  id="rel-empresa"
                  name="empresa"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "Todas" },
                    ...empresaOptions.map((nome) => ({ value: nome, label: nome })),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rel-from">Data inicial</Label>
                <DateInput id="rel-from" name="from" defaultValue={monthStartStr} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rel-to">Data final</Label>
                <DateInput id="rel-to" name="to" defaultValue={today} />
              </div>
            </form>

            <ReportButtonsClient />

            <div className="text-xs text-muted-foreground pt-2">
              Período padrão: mês atual ({formatDateBR(monthStartStr)} a {formatDateBR(today)}).
            </div>
            
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <span className="w-full text-[10px] font-bold text-muted-foreground uppercase mb-1">Exportação Rápida (PDF)</span>
              {["Amazonfive", "Gimam"].map((empresa) => (
                <a 
                  key={empresa} 
                  href={`/api/relatorios/vendas/pdf?empresa=${encodeURIComponent(empresa)}&from=${monthStartStr}&to=${today}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-destructive/30 text-destructive hover:bg-destructive/5")}
                >
                  PDF {empresa}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Outros Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Inadimplencia</Label>
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
