import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/guards";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const today = "2026-02-03";
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
            <CardTitle>Relatório de vendas (CSV)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/api/relatorios/vendas" method="get" className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data inicial</div>
                <Input type="date" name="from" defaultValue={today} aria-label="Data inicial" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data final</div>
                <Input type="date" name="to" defaultValue={today} aria-label="Data final" />
              </div>
              <Button type="submit" className="self-end">
                Baixar CSV
              </Button>
            </form>
            <div className="text-xs text-muted-foreground">Período padrão: hoje ({formatDateBR(today)}).</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
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


