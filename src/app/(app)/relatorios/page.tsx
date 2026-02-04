import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
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
            <CardTitle className="text-blue-900">Relatório de vendas (CSV)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/api/relatorios/vendas" method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <Button type="submit" className="self-end bg-blue-900 hover:bg-blue-800">
                Baixar CSV
              </Button>
            </form>
            <div className="text-xs text-muted-foreground">
              Período padrão: mês atual ({formatDateBR(monthStartStr)} a {formatDateBR(today)}).
            </div>
            <div className="flex flex-wrap gap-2">
              {["Amazonfive", "Gimam"].map((empresa) => (
                <Button key={empresa} asChild variant="outline" size="sm">
                  <a href={`/api/relatorios/vendas?empresa=${encodeURIComponent(empresa)}&from=${monthStartStr}&to=${today}`}>
                    CSV {empresa}
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-900">Atalhos</CardTitle>
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


