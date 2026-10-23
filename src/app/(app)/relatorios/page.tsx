import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { ReportButtonsClient } from "@/components/report-buttons-client";
import { cn } from "@/lib/utils";
import { montarEmpresaOptions } from "@/lib/empresa-options";
import { formatarDataPura, hojeDataPura, inicioDoMesDataPura } from "@/lib/data-pura";


export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito a administradores.</div>;
  
  // Dia civil de Manaus: o container roda em UTC, e depois das 20h o "hoje" do servidor
  // já era amanhã (no dia 31 os links saíam com período do mês seguinte, vazio).
  const today = hojeDataPura();
  const monthStartStr = inicioDoMesDataPura(today);
  const [empresas, fornecedores] = await Promise.all([
    prisma.empresaParceira.findMany({ orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ where: { deletedAt: null }, select: { nome: true } }),
  ]);
  // DAT-03/D-06: os botoes de Exportacao Rapida vem do banco, sem nenhuma
  // lista de nomes fixa no codigo. montarEmpresaOptions preserva a regra que
  // exclui empresas cujo nome coincida com o de um fornecedor.
  const empresaOptions = montarEmpresaOptions(empresas, fornecedores);

  // Era `new Date(value + "T00:00:00")` (parse LOCAL) formatado em Manaus — dois
  // deslocamentos somados. Data pura se le e se exibe em UTC.
  const formatDateBR = formatarDataPura;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Baixe vendas, inadimplência e margem, e acompanhe o que foi enviado às empresas."
        breadcrumbs={[{ label: "Relatórios" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle variant="secao">Relatório de vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ReportButtonsClient
              empresaOptions={empresaOptions}
              defaultFrom={monthStartStr}
              defaultTo={today}
            />

            <div className="flex flex-wrap gap-2 rounded-interno bg-poco p-4">
              <div className="mb-2 w-full">
                <h3 className="text-sm font-semibold text-foreground">PDF do mês atual, por empresa</h3>
                <p className="text-sm text-muted-foreground">
                  Vendas de {formatDateBR(monthStartStr)} a {formatDateBR(today)}, sem precisar usar os filtros acima.
                </p>
              </div>
              {empresaOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma empresa parceira elegível encontrada. Cadastre uma em{" "}
                  <a href="/cadastros?tab=empresas" className="underline">Cadastros → Empresas</a>.
                </p>
              ) : (
                empresaOptions.map((empresa) => (
                  <a
                    key={empresa}
                    href={`/api/relatorios/vendas/pdf?empresa=${encodeURIComponent(empresa)}&from=${monthStartStr}&to=${today}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    aria-label={`Baixar PDF das vendas do mês de ${empresa}`}
                  >
                    {empresa}
                  </a>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle variant="secao">Outros relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-3 rounded-interno bg-card-elevated p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Inadimplência</h3>
                <p className="mt-1 text-sm text-muted-foreground">Parcelas vencidas e não pagas até hoje.</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/relatorios/inadimplencia?to=${today}&format=csv`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                  aria-label="Baixar inadimplência em CSV"
                >
                  CSV
                </a>
                <a
                  href={`/api/relatorios/inadimplencia?to=${today}&format=pdf`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                  aria-label="Baixar inadimplência em PDF"
                >
                  PDF
                </a>
              </div>
            </div>
            <div className="space-y-3 rounded-interno bg-card-elevated p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Margem por produto</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vendas de {formatDateBR(monthStartStr)} a {formatDateBR(today)}.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/relatorios/margem-produto?from=${monthStartStr}&to=${today}&format=csv`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                  aria-label="Baixar margem por produto em CSV"
                >
                  CSV
                </a>
                <a
                  href={`/api/relatorios/margem-produto?from=${monthStartStr}&to=${today}&format=pdf`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                  aria-label="Baixar margem por produto em PDF"
                >
                  PDF
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle variant="secao">Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/relatorios/mensais"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Relatório mensal das empresas
            </a>
            <a
              href="/relatorios/emails"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              E-mails enviados
            </a>
            <a
              href="/relatorios"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Limpar filtros de vendas
            </a>
            <a
              href="/financeiro"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Ir para Financeiro
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
