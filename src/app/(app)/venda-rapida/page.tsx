import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL, cn } from "@/lib/utils";
import VendaRapidaFormClient from "@/components/venda-rapida-form-client";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { criarVenda } from "./actions";

export default async function Page() {
  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const ultima = await prisma.venda.findFirst({ orderBy: { id: "desc" } });

  const vendedorOptions = vendedores.map((v) => ({
    value: String(v.nomeExibicao || v.username),
    label: String(v.nomeExibicao || v.username),
    comissaoPct: v.comissaoPct || 0,
  }));
  
  const parcelasOptions = Array.from({ length: 12 }).map((_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const totalUltima = ultima ? (ultima.valorVenda || 0) + (ultima.valorFrete || 0) : 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950 tracking-tight">Terminal de Vendas</h1>
          <p className="text-muted-foreground font-medium">PDV Inteligente BFX Intelligence</p>
        </div>
        
        {ultima && (
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-blue-100 pr-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Última Venda</div>
              <div className="text-sm font-black text-slate-900 leading-none">{formatBRL(totalUltima)}</div>
            </div>
            <Separator orientation="vertical" className="h-8 mx-2" />
            <div className="flex gap-2">
              <a 
                href={`/api/recibo?id=${ultima.id}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-[10px] font-bold uppercase tracking-wider cursor-pointer")}
              >
                Recibo
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Segue seu recibo: http://localhost:3000/api/recibo?id=${ultima.id}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "sm" }), "h-8 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold uppercase tracking-wider cursor-pointer")}
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      <VendaRapidaFormClient
        vendedorOptions={vendedorOptions}
        parcelasOptions={parcelasOptions}
        onSubmit={criarVenda}
      />

      {!ultima && (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-10 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhuma venda registrada hoje.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}