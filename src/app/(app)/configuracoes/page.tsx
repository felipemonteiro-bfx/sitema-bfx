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

async function saveApiKey(formData: FormData) {
  "use server";
  const key = String(formData.get("key") || "");
  const gkey = String(formData.get("gkey") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { openaiKey: key, geminiKey: gkey } });
  } else {
    await prisma.config.create({ data: { openaiKey: key, geminiKey: gkey } });
  }
  revalidatePath("/configuracoes");
}

async function corrigirVendedor() {
  "use server";
  await prisma.venda.updateMany({
    where: { vendedor: "Jaqueline" },
    data: { vendedor: "Jakeline" },
  });
  revalidatePath("/configuracoes");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const aviso = await prisma.aviso.findFirst({ where: { ativo: 1 }, orderBy: { id: "desc" } });
  const cfg = await prisma.config.findFirst();
  const countWrong = await prisma.venda.count({ where: { vendedor: "Jaqueline" } });

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
                  <CardTitle>Texto do recibo/contrato e Logo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-6">
                    <LogoUploadForm currentLogoPath={cfg?.logoPath ?? undefined} />
                    <Separator />
                    <ReceiptEditorClient
                      initialModeloContrato={cfg?.modeloContrato || "Texto padrão..."}
                      logoPath={cfg?.logoPath ?? undefined}
                      saveContrato={saveContrato}
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
                      <div className="text-xs font-semibold text-muted-foreground">OpenAI API Key</div>
                      <Input
                        name="key"
                        type="password"
                        placeholder={cfg?.openaiKey ? "•••••••• (salva)" : "OpenAI API Key"}
                      />
                      {cfg?.openaiKey && (
                        <div className="text-xs text-muted-foreground">Chave OpenAI salva.</div>
                      )}
                    </div>
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
          {
            value: "tools",
            label: "Manutenção",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Correção de vendedores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">Vendas com nome "Jaqueline": {countWrong}</div>
                  <form action={corrigirVendedor}>
                    <button className={cn(buttonVariants({ variant: "destructive" }), "cursor-pointer")}>Corrigir todas</button>
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
