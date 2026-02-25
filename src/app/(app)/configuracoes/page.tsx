import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button-variants";
import { revalidatePath } from "next/cache";
import { QueryTabs } from "@/components/query-tabs";
import { Separator } from "@/components/ui/separator";
import { LogoUploadForm } from "@/components/logo-upload-form";
import { ReceiptEditorClient } from "@/components/receipt-editor-client";
import { cn } from "@/lib/utils";

type Search = { tab?: string };

async function saveAviso(formData: FormData) {
  "use server";
  const msg = String(formData.get("mensagem") || "");
  await prisma.aviso.updateMany({ data: { ativo: 0 } });
  await prisma.aviso.create({ data: { mensagem: msg, ativo: 1 } });
  revalidatePath("/configuracoes");
}

async function saveContrato(formData: FormData) {
  "use server";
  const texto = String(formData.get("texto") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { modeloContrato: texto } });
  } else {
    await prisma.config.create({ data: { modeloContrato: texto } });
  }
  revalidatePath("/configuracoes");
}

async function saveReciboVenda(formData: FormData) {
  "use server";
  const texto = String(formData.get("texto") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { modeloReciboVenda: texto } });
  } else {
    await prisma.config.create({ data: { modeloReciboVenda: texto } });
  }
  revalidatePath("/configuracoes");
}

async function saveApiKey(formData: FormData) {
  "use server";
  const gkey = String(formData.get("gkey") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { geminiKey: gkey } });
  } else {
    await prisma.config.create({ data: { geminiKey: gkey } });
  }
  revalidatePath("/configuracoes");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const aviso = await prisma.aviso.findFirst({ where: { ativo: 1 }, orderBy: { id: "desc" } });
  const cfg = await prisma.config.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize comunicados, recibos e integrações.</p>
      </div>
      <QueryTabs
        defaultTab={sp.tab || "mural"}
        tabs={[
          {
            value: "mural",
            label: "Mural",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Mensagem para vendedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 text-sm text-muted-foreground">
                    Esta mensagem aparece no painel dos vendedores.
                  </div>
                  <form action={saveAviso} className="space-y-3">
                    <Textarea name="mensagem" defaultValue={aviso?.mensagem || ""} />
                    <button className={cn(buttonVariants(), "cursor-pointer")}>Publicar aviso</button>
                  </form>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "recibo",
            label: "Recibo",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Modelos de Recibo e Logo</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure os dois tipos de recibo: padrão de venda de mercadoria e autorização de desconto em folha.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-8">
                    <LogoUploadForm currentLogoPath={cfg?.logoPath ?? undefined} />
                    <Separator />
                    <ReceiptEditorClient
                      titulo="1. Recibo de Venda de Mercadoria"
                      descricao="Documento padrão de comprovante de compra. Placeholders: {CLIENTE}, {MATRICULA}, {PRODUTO}, {VALOR}, {PARCELAS}, {DATA}."
                      initialText={cfg?.modeloReciboVenda ?? "Declaro ter recebido o(s) produto(s) acima descrito(s) e estar ciente das condições da compra. Este documento serve como comprovante de venda de mercadoria."}
                      logoPath={cfg?.logoPath ?? undefined}
                      saveAction={saveReciboVenda}
                      previewLabel="Prévia do Recibo de Venda"
                    />
                    <Separator />
                    <ReceiptEditorClient
                      titulo="2. Autorização de Desconto em Folha"
                      descricao="Texto da autorização para descontos em folha. Placeholders: {CLIENTE}, {MATRICULA}, {PRODUTO}, {VALOR}, {PARCELAS}, {DATA}."
                      initialText={cfg?.modeloContrato ?? "RECIBO Eu, {CLIENTE}, mat. {MATRICULA}, confirmo a compra de: {PRODUTO}. Valor: R$ {VALOR} em {PARCELAS}x. Data: {DATA}. Estou ciente de que esse valor será descontado parceladamente na minha remuneração do mês seguinte à data da compra. Entendo que este desconto será efetuado de acordo com as regras e políticas estabelecidas na parceria da BFXSHOP e empresa conveniada. Além disso, estou ciente de que, em caso de rescisão do meu contrato de trabalho com a minha empresa, o valor remanescente, se houver, será descontado integralmente do valor a que eu tiver direito em minha rescisão, conforme previsto na legislação vigente. Esta autorização é concedida de livre e espontânea vontade, sem qualquer forma de coação ou pressão por parte da empresa."}
                      logoPath={cfg?.logoPath ?? undefined}
                      saveAction={saveContrato}
                      previewLabel="Prévia da Autorização de Desconto em Folha"
                    />
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "ia",
            label: "IA",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Chaves de IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={saveApiKey} className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Gemini API Key</div>
                      <Input
                        name="gkey"
                        type="password"
                        placeholder={cfg?.geminiKey ? "•••••••• (salva)" : "Gemini API Key"}
                      />
                      {cfg?.geminiKey && (
                        <div className="text-xs text-muted-foreground">Chave Gemini salva.</div>
                      )}
                    </div>
                    <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                  </form>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
