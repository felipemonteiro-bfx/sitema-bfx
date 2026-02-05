import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { DateInput } from "@/components/ui/date-input";
import { format } from "date-fns";

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
            <CardTitle className="text-primary">Relatório de vendas</CardTitle>
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
                <DateInput name="from" defaultValue={monthStartStr} aria-label="Data inicial" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data final</div>
                <DateInput name="to" defaultValue={today} aria-label="Data final" />
              </div>
            </form>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button
                type="submit"
                form="report-form"
                formAction="/api/relatorios/vendas"
                className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 bg-success text-white hover:bg-success/90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                Baixar CSV (Excel)
              </button>

              <button
                type="submit"
                form="report-form"
                formAction="/api/relatorios/vendas/pdf"
                className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 bg-destructive text-white hover:bg-destructive/90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
                Baixar PDF (Impressão)
              </button>
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              Período padrão: mês atual ({formatDateBR(monthStartStr)} a {formatDateBR(today)}).
            </div>
            
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <span className="w-full text-[10px] font-bold text-muted-foreground uppercase mb-1">Exportação Rápida (PDF)</span>
              {["Amazonfive", "Gimam"].map((empresa) => (
                <Button
                  key={empresa}
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  <a href={`/api/relatorios/vendas/pdf?empresa=${encodeURIComponent(empresa)}&from=${monthStartStr}&to=${today}`}>
                    PDF {empresa}
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <a href="/relatorios">Limpar filtros</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/financeiro">Abrir Financeiro</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


