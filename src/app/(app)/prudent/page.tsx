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
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Central de Antecipação Prudent</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Selecione as vendas para realizar a antecipação de recebíveis com taxa inteligente.
        </p>
      </div>
      <Card variant="elevated" className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Vendas Pendentes de Antecipação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AntecipacaoClient vendasIniciais={pend} onSubmit={antecipar} />
        </CardContent>
      </Card>
    </div>
  );
}
