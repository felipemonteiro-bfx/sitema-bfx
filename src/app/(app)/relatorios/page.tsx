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
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Vendas (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action="/api/relatorios/vendas" method="get" className="flex flex-wrap items-center gap-2">
            <Input type="date" name="from" defaultValue={today} />
            <Input type="date" name="to" defaultValue={today} />
            <Button type="submit">Baixar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
