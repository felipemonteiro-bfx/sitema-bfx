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

async function savePerfil(formData: FormData) {
  "use server";
  // O id vem da sessao, NUNCA do formulario. Antes vinha de um <input hidden>,
  // e /perfil esta no menu do vendedor: bastava editar o campo no DevTools para
  // reescrever o cadastro — inclusive a senha — de qualquer outro usuario, admin
  // incluso. Server Action nao pode confiar em id enviado pelo cliente.
  const sessao = await getSession();
  const id = sessao?.id;
  if (!id) return;
  // Senha so e' gravada se veio preenchida. Antes, salvar o formulario com o
  // campo em branco zerava a senha e trancava o usuario para fora da conta.
  const senha = String(formData.get("senha") || "").trim();
  await prisma.usuario.update({
    where: { id },
    data: {
      nomeExibicao: String(formData.get("nome") || ""),
      email: String(formData.get("email") || ""),
      telefone: String(formData.get("telefone") || ""),
      endereco: String(formData.get("endereco") || ""),
      ...(senha ? { password: senha } : {}),
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
            <CardTitle className="text-primary">Dados pessoais</CardTitle>
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
              <div className="space-y-1">
                <Label htmlFor="perfil-senha">Senha</Label>
                {/* Sem defaultValue: a senha era servida em texto claro no HTML
                    de toda visita ao perfil. Em branco mantem a atual. */}
                <Input
                  id="perfil-senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Deixe em branco para manter a atual"
                />
              </div>
              <button className={cn(buttonVariants(), "md:col-span-2 bg-primary hover:bg-primary/90 cursor-pointer")}>Salvar Alterações</button>
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
              <div className="text-2xl font-bold text-primary">{formatBRL(totalComissao)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sua Taxa</p>
              <div className="text-lg font-semibold text-primary">{pct}%</div>
            </div>
            <Link 
              href="/comissoes"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Ver Detalhes Completo
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}