import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/masked-input";
import { buttonVariants } from "@/components/ui/button-variants";
import { revalidatePath } from "next/cache";
import { formatBRL, cn } from "@/lib/utils";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PerfilSenhaForm } from "@/components/perfil-senha-form";

async function savePerfil(formData: FormData) {
  "use server";
  // O id vem da sessao, NUNCA do formulario. Antes vinha de um <input hidden>,
  // e /perfil esta no menu do vendedor: bastava editar o campo no DevTools para
  // reescrever o cadastro de qualquer outro usuario, admin incluso. Server
  // Action nao pode confiar em id enviado pelo cliente.
  //
  // Este formulario so cuida de dados pessoais. A troca de senha vive em
  // PerfilSenhaForm/trocarMinhaSenha, um formulario independente (D-03): um
  // erro na troca de senha nao pode descartar a edicao destes campos, nem
  // o contrario.
  const sessao = await getSession();
  const id = sessao?.id;
  if (!id) return;
  await prisma.usuario.update({
    where: { id },
    data: {
      nomeExibicao: String(formData.get("nome") || ""),
      email: String(formData.get("email") || ""),
      telefone: String(formData.get("telefone") || ""),
      endereco: String(formData.get("endereco") || ""),
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
    select: { valorVenda: true, quantidade: true, valorFrete: true, desconto: true, itens: { select: { subtotal: true } } }
  });

  const pct = user.comissaoPct || 0;
  const totalComissao = vendas.reduce((sum, v) => sum + (valorTotalVenda(v) * pct) / 100, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        description="Atualize seus dados pessoais e acompanhe suas comissões."
        breadcrumbs={[{ label: "Meu Perfil" }]}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Dados Pessoais */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={savePerfil} className="grid gap-3 md:grid-cols-2">
              {/* Sem campo de id: savePerfil usa o id da sessao. */}
              <div className="space-y-1">
                <Label htmlFor="perfil-nome">Nome</Label>
                <Input id="perfil-nome" name="nome" defaultValue={user.nomeExibicao || ""} placeholder="Nome" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perfil-email">E-mail</Label>
                <Input id="perfil-email" name="email" defaultValue={user.email || ""} placeholder="Email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perfil-telefone">Telefone</Label>
                <MaskedInput id="perfil-telefone" name="telefone" mask="phone" defaultValue={user.telefone || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perfil-endereco">Endereço</Label>
                <Input id="perfil-endereco" name="endereco" defaultValue={user.endereco || ""} placeholder="Endereço" />
              </div>
              <button className={cn(buttonVariants(), "md:col-span-2 bg-primary hover:bg-primary/90 cursor-pointer")}>Salvar alterações</button>
            </form>
          </CardContent>
        </Card>

        {/* Alterar senha — formulario independente do de dados pessoais
            (D-03): erro em um nao descarta a edicao do outro. */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <PerfilSenhaForm />
          </CardContent>
        </Card>

        {/* Resumo de Comissões */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Comissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-interno bg-card-elevated p-4">
              <p className="text-sm font-medium text-muted-foreground">Total acumulado</p>
              <div className="valor-sensivel tabular-nums text-2xl font-semibold text-foreground">{formatBRL(totalComissao)}</div>
            </div>
            <div className="rounded-interno bg-card-elevated p-4">
              <p className="text-sm font-medium text-muted-foreground">Sua taxa</p>
              <div className="tabular-nums text-lg font-semibold text-foreground">{pct}%</div>
            </div>
            <Link 
              href="/comissoes"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Ver detalhes completos
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}