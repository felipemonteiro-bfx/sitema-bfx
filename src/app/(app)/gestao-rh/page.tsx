import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { Badge } from "@/components/ui/badge";
import { GestaoRhTabs } from "@/components/gestao-rh-tabs";
import { DeleteUserButton } from "@/components/delete-user-button";
import { cn } from "@/lib/utils";

type Search = { user?: string; tab?: string };

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

async function deleteUser(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  await prisma.usuario.delete({ where: { id } });
  revalidatePath("/gestao-rh");
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const users = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const selectedUser = sp.user && sp.user !== "all" ? Number(sp.user) : 0;
  const filteredUsers = selectedUser ? users.filter((u) => u.id === selectedUser) : users;
  const initialTab = sp.tab || "metas";

  const total = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const metaMedia = total ? users.reduce((s, u) => s + (u.metaMensal || 0), 0) / total : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestão de RH (Equipe)</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie metas, comissões e permissões do time em um só lugar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de usuários</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{admins}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Meta média</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(metaMedia)}</CardContent>
        </Card>
      </div>

      <GestaoRhTabs
        defaultTab={initialTab}
        tabs={[
          {
            value: "metas",
            label: "Metas & Comissões",
            content: (
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
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead className="text-right">Comissão %</TableHead>
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
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={u.role === "admin" ? "bg-indigo-50 text-indigo-700" : ""}
                              >
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(u.metaMensal || 0)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{u.comissaoPct}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "detalhes",
            label: "Detalhes",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Editar Funcionário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form method="get" className="grid gap-2 md:grid-cols-[1fr_auto] items-end">
                    <input type="hidden" name="tab" value="detalhes" />
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Filtrar funcionário</div>
                      <FormSelect
                        name="user"
                        defaultValue={selectedUser ? String(selectedUser) : "all"}
                        options={[
                          { value: "all", label: "Todos" },
                          ...users.map((u) => ({
                            value: String(u.id),
                            label: u.nomeExibicao || u.username,
                          })),
                        ]}
                      />
                    </div>
                    <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                      Aplicar
                    </button>
                  </form>

                  {filteredUsers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sem dados.</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <form
                        key={u.id}
                        action={updateMeta}
                        className="grid gap-3 rounded-xl border border-muted bg-muted/20 p-4 md:grid-cols-6"
                      >
                        <input type="hidden" name="id" value={u.id} />
                        <div className="space-y-1 md:col-span-2">
                          <div className="text-xs font-semibold text-muted-foreground">Nome</div>
                          <Input name="nome" defaultValue={u.nomeExibicao || ""} aria-label="Nome" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <div className="text-xs font-semibold text-muted-foreground">Login</div>
                          <Input name="login" defaultValue={u.username} aria-label="Login" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Role</div>
                          <FormSelect
                            name="role"
                            defaultValue={u.role || "vendedor"}
                            options={[
                              { value: "admin", label: "Admin" },
                              { value: "vendedor", label: "Vendedor" },
                            ]}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Meta</div>
                          <Input name="meta" type="number" defaultValue={u.metaMensal || 0} aria-label="Meta" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Comissão %</div>
                          <Input
                            name="comissao"
                            type="number"
                            defaultValue={u.comissaoPct || 2}
                            aria-label="Comissão"
                          />
                        </div>
                        <div className="md:col-span-6 flex items-center justify-between gap-3 border-t pt-4">
                          <DeleteUserButton 
                            userId={u.id} 
                            userName={u.nomeExibicao || u.username} 
                            onDelete={deleteUser} 
                          />
                          <button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Alterações</button>
                        </div>
                      </form>
                    ))
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            value: "contratar",
            label: "Contratar",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Novo Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={addUser} className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Nome completo</div>
                      <Input name="nome" placeholder="Nome Completo" aria-label="Nome" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Login</div>
                      <Input name="login" placeholder="Login" aria-label="Login" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Senha</div>
                      <Input name="senha" placeholder="Senha" aria-label="Senha" />
                    </div>
                    <FormSelect
                      name="role"
                      defaultValue="vendedor"
                      options={[
                        { value: "admin", label: "Admin" },
                        { value: "vendedor", label: "Vendedor" },
                      ]}
                    />
                    <button className={cn(buttonVariants(), "md:col-span-3 cursor-pointer")}>Cadastrar</button>
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
