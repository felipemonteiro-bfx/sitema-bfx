import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";
import { headers } from "next/headers";

async function criarVenda(formData: FormData) {
  "use server";
  const data = String(formData.get("data") || "");
  const vendedor = String(formData.get("vendedor") || "");
  const clienteId = Number(formData.get("cliente") || 0);
  const produto = String(formData.get("produto") || "");
  const custo = Number(formData.get("custo") || 0);
  const valor = Number(formData.get("valor") || 0);
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const parcelas = Number(formData.get("parcelas") || 1);
  const total = valor + frete;
  const parcela = parcelas > 0 ? total / parcelas : 0;
  const lucro = total - (custo + envio);

  if (!data || !vendedor || !clienteId) return;
  await prisma.venda.create({
    data: {
      dataVenda: new Date(data),
      vendedor,
      clienteId,
      produtoNome: produto,
      custoProduto: custo,
      valorVenda: valor,
      valorFrete: frete,
      custoEnvio: envio,
      parcelas,
      valorParcela: parcela,
      lucroLiquido: lucro,
      antecipada: 1,
    },
  });
  revalidatePath("/venda-rapida");
}

export default async function Page() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const produtos = await prisma.produto.findMany({ orderBy: { nome: "asc" } });
  const ultima = await prisma.venda.findFirst({ orderBy: { id: "desc" } });

  const vendedorOptions = vendedores.map((v) => ({
    value: String(v.nomeExibicao || v.username),
    label: String(v.nomeExibicao || v.username),
  }));
  const clienteOptions = clientes.map((c) => ({
    value: String(c.id),
    label: c.nome,
  }));
  const produtoOptions = produtos.map((p) => ({
    value: p.nome,
    label: p.nome,
  }));
  const parcelasOptions = Array.from({ length: 12 }).map((_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const totalUltima = ultima ? (ultima.valorVenda || 0) + (ultima.valorFrete || 0) : 0;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3000");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Terminal de Vendas (POS)</h1>
        <p className="text-sm text-muted-foreground">Registro rápido com cálculo automático de margem.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nova venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarVenda} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Data da venda</div>
                <Input name="data" type="date" aria-label="Data" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Vendedor</div>
                <FormSelect
                  name="vendedor"
                  options={vendedorOptions}
                  defaultValue={vendedorOptions[0]?.value}
                  placeholder="Vendedor"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Cliente</div>
                <FormSelect
                  name="cliente"
                  options={clienteOptions}
                  defaultValue={clienteOptions[0]?.value}
                  placeholder="Cliente"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Produto</div>
                <FormSelect
                  name="produto"
                  options={produtoOptions}
                  defaultValue={produtoOptions[0]?.value}
                  placeholder="Produto"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Parcelas</div>
                <FormSelect name="parcelas" options={parcelasOptions} defaultValue="1" placeholder="Parcelas" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Custo do produto</div>
                <Input name="custo" placeholder="Custo do produto" type="number" step="0.01" aria-label="Custo" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Valor da venda</div>
                <Input name="valor" placeholder="Valor da venda" type="number" step="0.01" aria-label="Valor" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Frete cobrado</div>
                <Input name="frete" placeholder="Frete cobrado" type="number" step="0.01" aria-label="Frete" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Custo de envio</div>
                <Input name="envio" placeholder="Custo de envio" type="number" step="0.01" aria-label="Envio" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Preencha os valores para calcular total, parcelas e lucro automaticamente.
              </div>
              <Button>Finalizar venda</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          {ultima ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-3">
                <div>
                  <div className="text-sm text-muted-foreground">Última venda</div>
                  <div className="text-lg font-semibold">#{ultima.id}</div>
                </div>
                <div className="text-2xl font-semibold text-emerald-700">
                  {formatBRL(totalUltima)}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline">
                  <a href={`/api/recibo?id=${ultima.id}`}>Baixar recibo PDF</a>
                </Button>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Segue seu recibo: ${baseUrl}/api/recibo?id=${ultima.id}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Enviar no WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sem vendas ainda.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
