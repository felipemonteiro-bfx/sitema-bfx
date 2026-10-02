import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import ImportacaoClient from "@/components/importacao-client";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  
  const count = await prisma.venda.count();
  const empresasParceiras = await prisma.empresaParceira.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const csvModel = [
    "Data (AAAA-MM-DD);Vendedor;Cliente;Produto;Custo Produto;Valor Venda;Frete Cobrado;Custo Envio;Parcelas;Antecipada (S/N);Entrega (S/N)",
    "2026-02-01;Maria;João da Silva;Notebook;2500;3200;120;80;6;S;S",
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvModel)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação Inteligente"
        description={'Revise e edite os dados do arquivo antes de confirmar. Use "Sugerir com IA" para padronizar clientes, produtos e preencher campos em branco.'}
        actions={
          <>
            <div className="text-right shrink-0 whitespace-nowrap">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide leading-none">Total no Banco</Label>
              <div className="text-xl font-bold text-primary leading-tight">{count}</div>
            </div>
            <a
              href={csvHref}
              download="modelo-importacao.csv"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-primary text-primary hover:bg-primary/5 cursor-pointer")}
            >
              Baixar Modelo
            </a>
          </>
        }
      />

      <ImportacaoClient empresasParceiras={empresasParceiras} />

      {/* Os importadores de fornecedores e clientes viviam sem nenhum link na UI —
          so eram alcancaveis digitando a URL. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outras importações</CardTitle>
          <CardDescription>
            Cada uma analisa o arquivo e mostra o que seria criado antes de gravar qualquer coisa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/importacao/fornecedores"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Importar fornecedores
          </Link>
          <Link
            href="/importacao/clientes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Importar clientes
          </Link>
          <Link
            href="/importacao/consignado"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Importar e-Consignado
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}