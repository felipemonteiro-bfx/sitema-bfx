import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

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

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const aviso = await prisma.aviso.findFirst({ where: { ativo: 1 }, orderBy: { id: "desc" } });
  const cfg = await prisma.config.findFirst();
  const countWrong = await prisma.venda.count({ where: { vendedor: "Jaqueline" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <Tabs defaultValue="mural">
        <TabsList>
          <TabsTrigger value="mural">Mural</TabsTrigger>
          <TabsTrigger value="recibo">Recibo</TabsTrigger>
          <TabsTrigger value="ia">IA</TabsTrigger>
          <TabsTrigger value="tools">Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="mural">
          <Card>
            <CardHeader><CardTitle>Mensagem para Vendedores</CardTitle></CardHeader>
            <CardContent>
              <form action={saveAviso} className="space-y-3">
                <Textarea name="mensagem" defaultValue={aviso?.mensagem || ""} />
                <Button>Publicar Aviso</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recibo">
          <Card>
            <CardHeader><CardTitle>Texto do Recibo/Contrato</CardTitle></CardHeader>
            <CardContent>
              <form action={saveContrato} className="space-y-3">
                <Textarea name="texto" defaultValue={cfg?.modeloContrato || "Texto Padrão..."} />
                <Button>Salvar Texto</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ia">
          <Card>
            <CardHeader><CardTitle>Chave de IA</CardTitle></CardHeader>
            <CardContent>
              <form action={saveApiKey} className="space-y-3">
                <Input name="key" placeholder="OpenAI API Key" defaultValue={cfg?.openaiKey || ""} />
                <Input name="gkey" placeholder="Gemini API Key" defaultValue={cfg?.geminiKey || ""} />
                <Button>Salvar API Key</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <Card>
            <CardHeader><CardTitle>Correção de Vendedores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>Vendas com nome "Jaqueline": {countWrong}</div>
              <form action={corrigirVendedor}>
                <Button variant="destructive">Corrigir Todas</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
