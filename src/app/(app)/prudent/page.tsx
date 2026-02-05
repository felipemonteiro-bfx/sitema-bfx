import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revalidatePath } from "next/cache";
import AntecipacaoClient from "@/components/antecipacao-client";

async function antecipar(formData: FormData) {
  "use server";
  const ids = formData.getAll("id").map((v) => Number(v));
  if (!ids.length) return;
  await prisma.venda.updateMany({
    where: { id: { in: ids } },
    data: { antecipada: 1 },
  });
  revalidatePath("/prudent");
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const pend = await prisma.venda.findMany({ 
    where: { antecipada: 0 },
    orderBy: { dataVenda: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Central de Antecipação</h1>
        <p className="text-sm text-muted-foreground">Selecione as vendas para realizar a antecipação de recebíveis.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">Vendas Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <AntecipacaoClient vendasIniciais={pend} onSubmitAction={antecipar} />
        </CardContent>
      </Card>
    </div>
  );
}
