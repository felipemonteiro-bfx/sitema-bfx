import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { QueryTabs } from "@/components/query-tabs";
import ProdutoFormClient from "@/components/produto-form-client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

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
      categoria: String(formData.get("categoria") || ""),
      ncm: String(formData.get("ncm") || ""),
      valorVenda: Number(formData.get("valor") || 0),
      imagem: String(formData.get("imagem") || ""),
      fornecedorId: formData.get("fornecedorId") ? Number(formData.get("fornecedorId")) : null,
    },
  });
  revalidatePath("/cadastros");
}

async function addFornecedor(formData: FormData) {
  "use server";
  const nome = String(formData.get("nome") || "");
  if (!nome) return;
  await prisma.fornecedor.create({
    data: {
      nome,
      telefone: String(formData.get("telefone") || ""),
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
  const produtos = await prisma.produto.findMany({ 
    include: { 
      fornecedor: true 
    },
    orderBy: { nome: "asc" } 
  });
  const empresas = await prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } });
  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Base de clientes, produtos, fornecedores e empresas.</p>
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
                    <CardTitle className="text-blue-900">Novo Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addCliente} className="grid gap-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Nome/Razão Social</div>
                          <Input name="nome" placeholder="Nome/Razão Social" aria-label="Nome" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Tipo</div>
                          <FormSelect
                            name="tipo"
                            options={[
                              { value: "PF", label: "Pessoa Física" },
                              { value: "PJ", label: "Pessoa Jurídica" },
                            ]}
                            defaultValue="PF"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">CPF/CNPJ</div>
                          <Input name="doc" placeholder="CPF/CNPJ" aria-label="CPF/CNPJ" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Matrícula</div>
                          <Input name="matricula" placeholder="Matrícula" aria-label="Matrícula" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Renda/Faturamento</div>
                          <Input name="renda" placeholder="Renda/Faturamento" type="number" aria-label="Renda" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">WhatsApp</div>
                          <Input name="telefone" placeholder="WhatsApp" aria-label="WhatsApp" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">CEP</div>
                          <Input name="cep" placeholder="CEP" aria-label="CEP" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Empresa/Vínculo</div>
                          <Input name="empresa" placeholder="Empresa/Vínculo" aria-label="Empresa" />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button className="bg-blue-900 hover:bg-blue-800">Salvar Cliente</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Clientes</CardTitle>
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
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Sem clientes cadastrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientes.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.nome}</TableCell>
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
                    <CardTitle className="text-blue-900">Novo Produto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProdutoFormClient 
                      onSuccess={addProduto} 
                      fornecedores={fornecedores.map(f => ({ id: f.id, nome: f.nome }))}
                    />
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Foto</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Marca/Fornecedor</TableHead>
                          <TableHead>NCM</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {produtos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Sem produtos cadastrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          produtos.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                {p.imagem ? (
                                  <div className="relative w-10 h-10 border rounded overflow-hidden">
                                    <Image 
                                      src={p.imagem} 
                                      alt={p.nome} 
                                      fill 
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-[10px] text-muted-foreground">
                                    Sem foto
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{p.nome}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-normal">{p.categoria || "N/A"}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs font-semibold">{p.marca}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {p.fornecedor?.nome || "Sem fornecedor"}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{p.ncm}</TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">{formatBRL(p.valorVenda || 0)}</TableCell>
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
            value: "fornecedores",
            label: "Fornecedores",
            content: (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900">Novo Fornecedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addFornecedor} className="grid gap-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Nome do Fornecedor</div>
                          <Input name="nome" placeholder="Razão Social ou Nome" aria-label="Nome" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Telefone/WhatsApp</div>
                          <Input name="telefone" placeholder="(00) 00000-0000" aria-label="Telefone" />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button className="bg-blue-900 hover:bg-blue-800">Salvar Fornecedor</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Fornecedores Cadastrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fornecedores.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                              Sem fornecedores cadastrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          fornecedores.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">{f.nome}</TableCell>
                              <TableCell>{f.telefone}</TableCell>
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
                    <CardTitle className="text-blue-900">Nova Empresa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={addEmpresa} className="grid gap-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Empresa</div>
                          <Input name="nome" placeholder="Empresa" aria-label="Nome" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Responsável RH</div>
                          <Input name="rh" placeholder="Responsável RH" aria-label="Responsável RH" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Telefone RH</div>
                          <Input name="tel" placeholder="Telefone RH" aria-label="Telefone RH" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Email RH</div>
                          <Input name="email" placeholder="Email RH" aria-label="Email RH" />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button className="bg-blue-900 hover:bg-blue-800">Salvar Empresa</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Empresas Parceiras</CardTitle>
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
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Sem empresas cadastradas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          empresas.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.nome}</TableCell>
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
