import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { format } from "date-fns";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const today = format(new Date(), "yyyy-MM-dd");
  const empresas = await prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } });

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
                <select 
                  name="empresa" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">Todas</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.nome}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data inicial</div>
                <Input type="date" name="from" defaultValue={today} aria-label="Data inicial" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data final</div>
                <Input type="date" name="to" defaultValue={today} aria-label="Data final" />
              </div>
              <Button type="submit" className="self-end bg-blue-900 hover:bg-blue-800">
                Baixar CSV
              </Button>
            </form>
            <div className="text-xs text-muted-foreground">Período padrão: hoje ({formatDateBR(today)}).</div>
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


