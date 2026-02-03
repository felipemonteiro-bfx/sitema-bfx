import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FormSelect } from "@/components/form-select";

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Terminal de Vendas (POS)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Nova Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarVenda} className="grid gap-3 md:grid-cols-3">
            <Input name="data" type="date" />
            <FormSelect
              name="vendedor"
              options={vendedorOptions}
              defaultValue={vendedorOptions[0]?.value}
              placeholder="Vendedor"
            />
            <FormSelect
              name="cliente"
              options={clienteOptions}
              defaultValue={clienteOptions[0]?.value}
              placeholder="Cliente"
            />
            <FormSelect
              name="produto"
              options={produtoOptions}
              defaultValue={produtoOptions[0]?.value}
              placeholder="Produto"
            />
            <Input name="custo" placeholder="Custo Produto" type="number" step="0.01" />
            <Input name="valor" placeholder="Valor Venda" type="number" step="0.01" />
            <Input name="frete" placeholder="Frete Cobrado" type="number" step="0.01" />
            <Input name="envio" placeholder="Custo Envio" type="number" step="0.01" />
            <FormSelect
              name="parcelas"
              options={parcelasOptions}
              defaultValue="1"
              placeholder="Parcelas"
            />
            <Button className="md:col-span-3">Finalizar Venda</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-500">
          {ultima ? (
            <>
              <div>
                Última venda #{ultima.id} - {formatBRL((ultima.valorVenda || 0) + (ultima.valorFrete || 0))}
              </div>
              <a className="text-blue-600" href={`/api/recibo?id=${ultima.id}`}>
                Baixar recibo PDF
              </a>
              <div>
                <a
                  className="text-green-700"
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Segue seu recibo: http://localhost:3000/api/recibo?id=${ultima.id}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar no WhatsApp
                </a>
              </div>
            </>
          ) : (
            <div>Sem vendas ainda.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
