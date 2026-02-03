import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { QueryTabs } from "@/components/query-tabs";

type Search = { tab?: string };

async function addCliente(formData: FormData) {
  "use server";
  const nome = String(formData.get("nome") || "");
  const tipo = String(formData.get("tipo") || "PF");
  if (!nome) return;
  await prisma.cliente.create({
    data: {
      nome,
      cpf: tipo === "PF" ? String(formData.get("doc") || "") : null,
      cnpj: tipo === "PJ" ? String(formData.get("doc") || "") : null,
      renda: Number(formData.get("renda") || 0),
      empresa: String(formData.get("empresa") || ""),
      telefone: String(formData.get("telefone") || ""),
      cep: String(formData.get("cep") || ""),
      matricula: String(formData.get("matricula") || ""),
      tipo,
    },
  });
  revalidatePath("/cadastros");
}

async function addProduto(formData: FormData) {
  "use server";
  const nome = String(formData.get("nome") || "");
  if (!nome) return;
  await prisma.produto.create({
    data: {
      nome,
      custoPadrao: Number(formData.get("custo") || 0),
      marca: String(formData.get("marca") || ""),
      ncm: String(formData.get("ncm") || ""),
      valorVenda: Number(formData.get("valor") || 0),
    },
  });
  revalidatePath("/cadastros");
}

async function addEmpresa(formData: FormData) {
  "use server";
  const nome = String(formData.get("nome") || "");
  if (!nome) return;
  await prisma.empresaParceira.create({
    data: {
      nome,
      responsavelRh: String(formData.get("rh") || ""),
      telefoneRh: String(formData.get("tel") || ""),
      emailRh: String(formData.get("email") || ""),
    },
  });
  revalidatePath("/cadastros");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  const produtos = await prisma.produto.findMany({ orderBy: { nome: "asc" } });
  const empresas = await prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Base de clientes, produtos e empresas.</p>
      </div>
      <QueryTabs
        defaultTab={sp.tab || "clientes"}
        tabs={[
          {
            value: "clientes",
            label: "Clientes",
            content: (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Novo Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addCliente} className="grid gap-3 md:grid-cols-3">
                      <Input name="nome" placeholder="Nome/Razão Social" aria-label="Nome" />
                      <FormSelect
                        name="tipo"
                        options={[
                          { value: "PF", label: "Pessoa Física" },
                          { value: "PJ", label: "Pessoa Jurídica" },
                        ]}
                        defaultValue="PF"
                      />
                      <Input name="doc" placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
                      <Input name="matricula" placeholder="Matrícula" aria-label="Matrícula" />
                      <Input name="renda" placeholder="Renda/Faturamento" type="number" aria-label="Renda" />
                      <Input name="telefone" placeholder="WhatsApp" aria-label="WhatsApp" />
                      <Input name="cep" placeholder="CEP" aria-label="CEP" />
                      <Input name="empresa" placeholder="Empresa/Vínculo" aria-label="Empresa" />
                      <Button className="md:col-span-3">Salvar</Button>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Clientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Doc</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="text-right">Renda</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Sem dados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientes.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>{c.nome}</TableCell>
                              <TableCell>{c.cpf || c.cnpj}</TableCell>
                              <TableCell>{c.telefone}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatBRL(c.renda || 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ),
          },
          {
            value: "produtos",
            label: "Produtos",
            content: (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Novo Produto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addProduto} className="grid gap-3 md:grid-cols-3">
                      <Input name="nome" placeholder="Nome do produto" aria-label="Nome" />
                      <Input name="custo" placeholder="Custo" type="number" aria-label="Custo" />
                      <Input name="marca" placeholder="Marca" aria-label="Marca" />
                      <Input name="ncm" placeholder="NCM" aria-label="NCM" />
                      <Input name="valor" placeholder="Valor de venda" type="number" aria-label="Valor" />
                      <Button className="md:col-span-3">Salvar</Button>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {produtos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              Sem dados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          produtos.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{p.nome}</TableCell>
                              <TableCell>{p.marca}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatBRL(p.valorVenda || 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ),
          },
          {
            value: "empresas",
            label: "Empresas",
            content: (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Empresa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addEmpresa} className="grid gap-3 md:grid-cols-3">
                      <Input name="nome" placeholder="Empresa" aria-label="Empresa" />
                      <Input name="rh" placeholder="Responsável RH" aria-label="Responsável RH" />
                      <Input name="tel" placeholder="Telefone RH" aria-label="Telefone RH" />
                      <Input name="email" placeholder="Email RH" aria-label="Email RH" />
                      <Button className="md:col-span-3">Salvar</Button>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Empresas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>RH</TableHead>
                          <TableHead>Contato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empresas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              Sem dados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          empresas.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>{e.nome}</TableCell>
                              <TableCell>{e.responsavelRh}</TableCell>
                              <TableCell>{e.telefoneRh || e.emailRh}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
