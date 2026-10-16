import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import ImportacaoClient from "@/components/importacao-client";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { NavImportacao } from "./nav-importacao";
import { cn } from "@/lib/utils";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const count = await prisma.venda.count();
  const empresasParceiras = await prisma.empresaParceira.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const csvModel = [
    "Data (AAAA-MM-DD);Vendedor;Cliente;Produto;Custo Produto;Valor Venda;Frete Cobrado;Custo Envio;Parcelas;Antecipada (S/N);Entrega (S/N)",
    "2026-02-01;Maria;João da Silva;Notebook;2500;3200;120;80;6;S;S",
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvModel)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação Inteligente"
        description={'Revise e edite os dados do arquivo antes de confirmar. Use "Sugerir com IA" para padronizar clientes, produtos e preencher campos em branco.'}
        breadcrumbs={[{ label: "Importação" }]}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <NavImportacao atual="/importacao" />
            <div className="shrink-0 whitespace-nowrap text-right">
              <div className="text-sm font-medium leading-none text-muted-foreground">Total no banco</div>
              <div className="mt-1 font-mono text-xl font-medium leading-tight text-foreground">{count}</div>
            </div>
            <a
              href={csvHref}
              download="modelo-importacao.csv"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}
            >
              Baixar modelo
            </a>
          </div>
        }
      />

      <ImportacaoClient empresasParceiras={empresasParceiras} />
    </div>
  );
}
