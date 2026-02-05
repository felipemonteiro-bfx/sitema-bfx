import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import VendaRapidaFormClient from "@/components/venda-rapida-form-client";

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
  const temNota = formData.get("temNota") === "true";
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  
  const valorDescontoNota = temNota ? (valor * taxaNota) / 100 : 0;
  const total = valor + frete;
  const parcela = parcelas > 0 ? total / parcelas : 0;
  const lucro = total - (custo + envio + valorDescontoNota);

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
      temNota,
      taxaNota,
    },
  });
  revalidatePath("/venda-rapida");
}

export default async function Page() {
  const vendedores = await prisma.usuario.findMany({ orderBy: { nomeExibicao: "asc" } });
  const ultima = await prisma.venda.findFirst({ orderBy: { id: "desc" } });

  const vendedorOptions = vendedores.map((v) => ({
    value: String(v.nomeExibicao || v.username),
    label: String(v.nomeExibicao || v.username),
    comissaoPct: v.comissaoPct || 0,
  }));
  
  const parcelasOptions = Array.from({ length: 12 }).map((_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const totalUltima = ultima ? (ultima.valorVenda || 0) + (ultima.valorFrete || 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Terminal de Vendas (POS)</h1>
        <p className="text-sm text-muted-foreground">Registro rápido com cálculo automático de margem.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Nova venda</CardTitle>
        </CardHeader>
        <CardContent>
          <VendaRapidaFormClient 
            vendedorOptions={vendedorOptions} 
            parcelasOptions={parcelasOptions} 
            onSubmit={criarVenda} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          {ultima ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-3">
                <div>
                  <div className="text-sm text-muted-foreground">Última venda</div>
                  <div className="text-lg font-semibold">#{ultima.id}</div>
                </div>
                <div className="text-2xl font-semibold text-success">
                  {formatBRL(totalUltima)}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline">
                  <a href={`/api/recibo?id=${ultima.id}`}>Baixar recibo PDF</a>
                </Button>
                <Button asChild className="bg-success hover:bg-success/90">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Segue seu recibo: http://localhost:3000/api/recibo?id=${ultima.id}`
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
