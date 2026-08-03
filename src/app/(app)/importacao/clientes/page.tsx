import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import ImportacaoClientesClient from "@/components/importacao-clientes-client";
import { analisarImportacaoClientes } from "./actions";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const empresas = await prisma.empresaParceira.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação de Clientes"
        description="Escolha a empresa parceira e suba um CSV com nome (obrigatório), CPF, telefone, matrícula e e-mail (opcionais). A análise mostra o que vai acontecer antes de qualquer gravação — nada é gravado nesta etapa."
        breadcrumbs={[{ label: "Importação", href: "/importacao" }, { label: "Clientes" }]}
      />
      <ImportacaoClientesClient empresas={empresas} analisarAction={analisarImportacaoClientes} />
    </div>
  );
}
