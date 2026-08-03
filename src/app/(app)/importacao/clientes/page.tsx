import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import ImportacaoClientesClient from "@/components/importacao-clientes-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { analisarImportacaoClientes, confirmarImportacaoClientes } from "./actions";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const empresas = await prisma.empresaParceira.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const csvModel = [
    "nome;cpf;telefone;matricula;email",
    "Maria da Silva;123.456.789-09;92999990000;12345;maria@exemplo.com",
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvModel)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação de Clientes"
        description="Escolha a empresa parceira e suba um CSV com nome (obrigatório), CPF, telefone, matrícula e e-mail (opcionais). Somente o nome é obrigatório: o CPF é a chave de idempotência quando existir, e o nome normalizado assume esse papel quando não há CPF. A análise mostra o que vai acontecer antes de qualquer gravação — rodar o mesmo arquivo duas vezes não duplica ninguém."
        breadcrumbs={[{ label: "Importação", href: "/importacao" }, { label: "Clientes" }]}
        actions={
          <a
            href={csvHref}
            download="modelo-clientes.csv"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-primary text-primary hover:bg-primary/5 cursor-pointer"
            )}
          >
            Baixar Modelo
          </a>
        }
      />
      <ImportacaoClientesClient
        empresas={empresas}
        analisarAction={analisarImportacaoClientes}
        confirmarAction={confirmarImportacaoClientes}
      />
    </div>
  );
}
