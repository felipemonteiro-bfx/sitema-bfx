import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import ImportacaoClient from "@/components/importacao-client";
import { buttonVariants } from "@/components/ui/button";
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
          <h1 className="text-2xl font-semibold">Importação Inteligente</h1>
          <p className="text-sm text-muted-foreground">Revise e edite os dados do arquivo antes de confirmar a subida.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Total no Banco</div>
            <div className="text-xl font-black text-blue-900 leading-tight">{count}</div>
          </div>
          <a 
            href={csvHref} 
            download="modelo-importacao.csv"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-blue-900 text-blue-900 hover:bg-blue-50 cursor-pointer")}
          >
            Baixar Modelo
          </a>
        </div>
      </div>

      <ImportacaoClient />
    </div>
  );
}