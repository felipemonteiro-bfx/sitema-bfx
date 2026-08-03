import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import ImportacaoFornecedoresClient from "@/components/importacao-fornecedores-client";
import { analisarImportacaoFornecedores } from "./actions";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação de Fornecedores"
        description="Suba um CSV com nome (obrigatório) e telefone (opcional). A análise mostra o que vai acontecer antes de qualquer gravação."
        breadcrumbs={[{ label: "Importação", href: "/importacao" }, { label: "Fornecedores" }]}
      />
      <ImportacaoFornecedoresClient analisarAction={analisarImportacaoFornecedores} />
    </div>
  );
}
