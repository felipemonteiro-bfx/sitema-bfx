import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL, cn } from "@/lib/utils";
import VendaRapidaFormV2 from "@/components/venda-rapida-form-v2";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { LinkAssinaturaButton } from "@/components/link-assinatura-button";
import { ReciboDownloadLink } from "@/components/recibo-download-link";
import { Separator } from "@/components/ui/separator";
import { criarVendaV2 } from "./actions";
import { signReciboId } from "@/lib/recibo-url";

export default async function Page() {
  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const ultima = await prisma.venda.findFirst({
    orderBy: { id: "desc" },
    include: { itens: true, assinatura: true },
  });

  const vendedorOptions = vendedores.map((v) => ({
    value: String(v.nomeExibicao || v.username),
    label: String(v.nomeExibicao || v.username),
    comissaoPct: v.comissaoPct || 0,
  }));

  const parcelasOptions = Array.from({ length: 12 }).map((_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const totalUltima = ultima ? valorTotalVenda(ultima) : 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-gradient text-3xl font-black tracking-tight">Terminal de Vendas</h1>
          <div className="gradient-bar mt-2" />
          <p className="text-muted-foreground font-medium mt-2">PDV Inteligente BFX Intelligence</p>
        </div>

        {ultima && (
          <div className="flex items-center gap-3 bg-card p-2 rounded-2xl shadow-sm border border-border pr-4">
            <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Última Venda</div>
              <div className="text-sm font-black text-foreground leading-none">{formatBRL(totalUltima)}</div>
            </div>
            <Separator orientation="vertical" className="h-8 mx-2" />
            <div className="flex flex-wrap gap-2">
              <ReciboDownloadLink
                vendaId={ultima.id}
                tipo={ultima.descontoEmFolha ? "autorizacao" : "venda"}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-[10px] font-bold uppercase tracking-wider cursor-pointer")}
                label={ultima.descontoEmFolha ? "Autorização" : "Recibo"}
              />
              {ultima.descontoEmFolha && ultima.assinaturaToken && (
                <LinkAssinaturaButton
                  token={ultima.assinaturaToken}
                  status={ultima.assinatura?.assinaturaStatus}
                  label="Link Assinatura"
                  showQr
                />
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  ultima.descontoEmFolha && ultima.assinaturaToken
                    ? `Segue o link para assinar sua autorização: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008"}/assinatura/${ultima.assinaturaToken}`
                    : `Segue seu recibo: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008"}/api/recibo?id=${ultima.id}&sig=${signReciboId(ultima.id)}${ultima.descontoEmFolha ? "&tipo=autorizacao" : ""}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "success", size: "sm" }), "h-8 text-[10px] font-bold uppercase tracking-wider cursor-pointer")}
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      <VendaRapidaFormV2
        vendedorOptions={vendedorOptions}
        parcelasOptions={parcelasOptions}
        onSubmit={criarVendaV2}
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
