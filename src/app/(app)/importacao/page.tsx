import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import ImportacaoClient from "@/components/importacao-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const count = await prisma.venda.count();
  
  const csvModel = [
    "Data (AAAA-MM-DD);Vendedor;Cliente;Produto;Custo Produto;Valor Venda;Frete Cobrado;Custo Envio;Parcelas;Antecipada (S/N)",
    "2026-02-01;Maria;João da Silva;Notebook;2500;3200;120;80;6;S",
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvModel)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title-gradient text-2xl font-semibold">Importação Inteligente</h1>
          <div className="gradient-bar mt-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Revise e edite os dados do arquivo antes de confirmar. Use &quot;Sugerir com IA&quot; para padronizar clientes, produtos e preencher campos em branco.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Total no Banco</div>
            <div className="text-xl font-black text-primary leading-tight">{count}</div>
          </div>
          <a 
            href={csvHref} 
            download="modelo-importacao.csv"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-primary text-primary hover:bg-primary/5 cursor-pointer")}
          >
            Baixar Modelo
          </a>
        </div>
      </div>

      <ImportacaoClient />
    </div>
  );
}