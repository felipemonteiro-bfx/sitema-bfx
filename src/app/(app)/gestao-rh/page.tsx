import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";

async function updateMeta(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  await prisma.usuario.update({
    where: { id },
    data: {
      nomeExibicao: String(formData.get("nome") || ""),
      username: String(formData.get("login") || ""),
      role: String(formData.get("role") || "vendedor"),
      metaMensal: Number(formData.get("meta") || 0),
      comissaoPct: Number(formData.get("comissao") || 0),
    },
  });
  revalidatePath("/gestao-rh");
}

async function addUser(formData: FormData) {
  "use server";
  const nome = String(formData.get("nome") || "");
  const login = String(formData.get("login") || "");
  const senha = String(formData.get("senha") || "");
  const role = String(formData.get("role") || "vendedor");
  if (!nome || !login || !senha) return;
  await prisma.usuario.create({
    data: {
      nomeExibicao: nome,
      username: login.toLowerCase(),
      password: senha,
      role,
    },
  });
  revalidatePath("/gestao-rh");
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const users = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gestão de RH (Equipe)</h1>
      <Tabs defaultValue="metas">
        <TabsList>
          <TabsTrigger value="metas">Metas & Comissões</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="contratar">Contratar</TabsTrigger>
        </TabsList>

        <TabsContent value="metas">
          <Card>
            <CardHeader>
              <CardTitle>Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Comissão %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sem dados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.nomeExibicao}</TableCell>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell>{u.metaMensal}</TableCell>
                        <TableCell>{u.comissaoPct}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detalhes">
          <Card>
            <CardHeader>
              <CardTitle>Editar Funcionário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem dados.</div>
              ) : (
                users.map((u) => (
                  <form
                    key={u.id}
                    action={updateMeta}
                    className="grid gap-3 border-b border-muted pb-4 md:grid-cols-5"
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <Input name="nome" defaultValue={u.nomeExibicao || ""} />
                    <Input name="login" defaultValue={u.username} />
                    <FormSelect
                      name="role"
                      defaultValue={u.role || "vendedor"}
                      options={[
                        { value: "admin", label: "Admin" },
                        { value: "vendedor", label: "Vendedor" },
                      ]}
                    />
                    <Input name="meta" type="number" defaultValue={u.metaMensal || 0} />
                    <Input name="comissao" type="number" defaultValue={u.comissaoPct || 2} />
                    <Button className="md:col-span-5">Salvar</Button>
                  </form>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratar">
          <Card>
            <CardHeader>
              <CardTitle>Novo Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addUser} className="grid gap-3 md:grid-cols-3">
                <Input name="nome" placeholder="Nome Completo" />
                <Input name="login" placeholder="Login" />
                <Input name="senha" placeholder="Senha" />
                <FormSelect
                  name="role"
                  defaultValue="vendedor"
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "vendedor", label: "Vendedor" },
                  ]}
                />
                <Button className="md:col-span-3">Cadastrar</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
