import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import ImportacaoFornecedoresClient from "@/components/importacao-fornecedores-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { analisarImportacaoFornecedores, confirmarImportacaoFornecedores } from "./actions";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const csvModel = ["nome;telefone", "Acme Distribuidora;92999990000"].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvModel)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação de Fornecedores"
        description="Suba um CSV com nome (obrigatório) e telefone (opcional). A análise mostra o que vai acontecer antes de qualquer gravação. Rodar o mesmo arquivo duas vezes não duplica nenhum fornecedor."
        breadcrumbs={[{ label: "Importação", href: "/importacao" }, { label: "Fornecedores" }]}
        actions={
          <a
            href={csvHref}
            download="modelo-fornecedores.csv"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-primary text-primary hover:bg-primary/5 cursor-pointer"
            )}
          >
            Baixar Modelo
          </a>
        }
      />
      <ImportacaoFornecedoresClient
        analisarAction={analisarImportacaoFornecedores}
        confirmarAction={confirmarImportacaoFornecedores}
      />
    </div>
  );
}
