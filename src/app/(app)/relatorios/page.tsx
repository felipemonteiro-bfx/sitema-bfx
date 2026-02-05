import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
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
  const empresas = await prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } });
  const extraEmpresas = ["Amazonfive", "Gimam"];
  const empresaOptions = [
    ...empresas.map((e) => e.nome),
    ...extraEmpresas.filter((name) => !empresas.some((e) => e.nome.toLowerCase() === name.toLowerCase())),
  ];

  const formatDateBR = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value + "T00:00:00"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Gere exportações rápidas e compartilhe com o time financeiro.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-blue-900">Relatório de vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              id="report-form"
              method="GET"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Empresa Parceira</div>
                <FormSelect
                  name="empresa"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "Todas" },
                    ...empresaOptions.map((nome) => ({ value: nome, label: nome })),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data inicial</div>
                <Input type="date" name="from" defaultValue={monthStartStr} aria-label="Data inicial" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data final</div>
                <Input type="date" name="to" defaultValue={today} aria-label="Data final" />
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
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-rose-200 text-rose-700 hover:bg-rose-50")}
                >
                  PDF {empresa}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-900">Atalhos</CardTitle>
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