import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";
import { formatBRL } from "@/lib/utils";
import Link from "next/link";

async function savePerfil(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  await prisma.usuario.update({
    where: { id },
    data: {
      nomeExibicao: String(formData.get("nome") || ""),
      email: String(formData.get("email") || ""),
      telefone: String(formData.get("telefone") || ""),
      endereco: String(formData.get("endereco") || ""),
      password: String(formData.get("senha") || ""),
    },
  });
  revalidatePath("/perfil");
}

export default async function Page() {
  const session = await getSession();
  const user = session?.id ? await prisma.usuario.findUnique({ where: { id: session.id } }) : null;
  if (!user) return <div>Usuário não encontrado.</div>;

  // Buscar comissões do usuário (vendedor)
  const vendas = await prisma.venda.findMany({
    where: { vendedor: user.nomeExibicao || user.username || undefined },
    select: { lucroLiquido: true }
  });

  const pct = user.comissaoPct || 0;
  const totalComissao = vendas.reduce((sum, v) => sum + ((v.lucroLiquido || 0) * pct) / 100, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Atualize seus dados pessoais e acompanhe suas comissões.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Dados Pessoais */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-primary">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={savePerfil} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={user.id} />
              <Input name="nome" defaultValue={user.nomeExibicao || ""} placeholder="Nome" aria-label="Nome" />
              <Input name="email" defaultValue={user.email || ""} placeholder="Email" aria-label="Email" />
              <Input name="telefone" defaultValue={user.telefone || ""} placeholder="Telefone" aria-label="Telefone" />
              <Input name="endereco" defaultValue={user.endereco || ""} placeholder="Endereço" aria-label="Endereço" />
              <Input name="senha" defaultValue={user.password} placeholder="Senha" aria-label="Senha" />
              <Button className="md:col-span-2 bg-primary hover:bg-primary/90">Salvar Alterações</Button>
            </form>
          </CardContent>
        </Card>

        {/* Resumo de Comissões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Suas Comissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Acumulado</p>
              <div className="text-2xl font-bold text-success">{formatBRL(totalComissao)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sua Taxa</p>
              <div className="text-lg font-semibold text-primary">{pct}%</div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/comissoes">Ver Detalhes Completo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
