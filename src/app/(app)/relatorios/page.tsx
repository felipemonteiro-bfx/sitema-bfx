import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/guards";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Exportação rápida para CSV.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Relatório de vendas (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action="/api/relatorios/vendas" method="get" className="grid gap-3 sm:grid-cols-3">
            <Input type="date" name="from" defaultValue={today} aria-label="Data inicial" />
            <Input type="date" name="to" defaultValue={today} aria-label="Data final" />
            <Button type="submit">Baixar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
