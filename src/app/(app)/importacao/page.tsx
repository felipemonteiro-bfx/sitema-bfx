import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { uuidv7 } from "@/lib/uuid";

async function importar(formData: FormData) {
  "use server";
  const file = formData.get("file") as File | null;
  if (!file) return;
  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  for (const row of rows) {
    const clienteNome = String(row["Cliente"] || "").trim();
    if (!clienteNome) continue;
    let cliente = await prisma.cliente.findFirst({ where: { nome: clienteNome } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { nome: clienteNome, tipo: "PF" } });
    }
    const parcelas = Number(row["Parcelas"] || 1);
    const valorVenda = Number(row["Valor Venda"] || 0);
    const frete = Number(row["Frete Cobrado"] || 0);
    const custoEnvio = Number(row["Custo Envio"] || 0);
    const custoProduto = Number(row["Custo Produto"] || 0);
    const total = valorVenda + frete;
    const valorParcela = parcelas > 0 ? total / parcelas : 0;
    const ant = String(row["Antecipada (S/N)"] || "").toUpperCase().startsWith("S") ? 1 : 0;

    await prisma.venda.create({
      data: {
        uuid: uuidv7(),
        dataVenda: new Date(row["Data (AAAA-MM-DD)"] || new Date().toISOString().slice(0, 10)),
        vendedor: row["Vendedor"] || "",
        clienteId: cliente.id,
        produtoNome: row["Produto"] || "",
        custoProduto,
        valorVenda,
        valorFrete: frete,
        custoEnvio,
        parcelas,
        valorParcela,
        antecipada: ant,
      },
    });
  }

  revalidatePath("/importacao");
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const count = await prisma.venda.count();
  const csvModel = [
    "Data (AAAA-MM-DD);Vendedor;Cliente;Produto;Custo Produto;Valor Venda;Frete Cobrado;Custo Envio;Parcelas;Antecipada (S/N)",
    "2026-02-01;Maria;João da Silva;Notebook;2500;3200;120;80;6;S",
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvModel)}`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importação de Vendas</h1>
        <p className="text-sm text-muted-foreground">Envie um CSV para atualizar o histórico em lote.</p>
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Upload CSV</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href={csvHref} download="modelo-importacao.csv">Baixar modelo CSV</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Use o modelo para evitar erros de coluna.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">Checklist rápido</div>
            <ul className="mt-2 list-disc pl-5">
              <li>Arquivo .csv com cabeçalho.</li>
              <li>Data no formato AAAA-MM-DD.</li>
              <li>Colunas obrigatórias: Cliente, Produto, Valor Venda.</li>
            </ul>
          </div>
          <div className="text-sm text-muted-foreground">
            Colunas: Data (AAAA-MM-DD), Vendedor, Cliente, Produto, Custo Produto, Valor Venda, Frete Cobrado,
            Custo Envio, Parcelas, Antecipada (S/N)
          </div>
          <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
            Exemplo de linha: 2026-02-01;Maria;João da Silva;Notebook;2500;3200;120;80;6;S
          </div>
          <form action={importar} className="space-y-3">
            <input
              name="file"
              type="file"
              accept=".csv"
              className="block w-full text-sm file:mr-4 file:rounded-md file:border file:border-input file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
            />
            <Button>Processar</Button>
          </form>
          <div className="text-xs text-muted-foreground">Vendas no banco: {count}</div>
        </CardContent>
      </Card>
    </div>
  );
}

