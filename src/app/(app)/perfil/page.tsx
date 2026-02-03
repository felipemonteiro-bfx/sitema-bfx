import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Atualize seus dados pessoais e senha.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={savePerfil} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={user.id} />
            <Input name="nome" defaultValue={user.nomeExibicao || ""} placeholder="Nome" aria-label="Nome" />
            <Input name="email" defaultValue={user.email || ""} placeholder="Email" aria-label="Email" />
            <Input name="telefone" defaultValue={user.telefone || ""} placeholder="Telefone" aria-label="Telefone" />
            <Input name="endereco" defaultValue={user.endereco || ""} placeholder="Endereço" aria-label="Endereço" />
            <Input name="senha" defaultValue={user.password} placeholder="Senha" aria-label="Senha" />
            <Button className="md:col-span-2">Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
