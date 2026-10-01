import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FechamentoGerarButton } from "@/components/fechamento-gerar-button";
import { formatBRL } from "@/lib/utils";
import { hojeDataPura } from "@/lib/data-pura";
import { ROTULO_STATUS_FECHAMENTO, rotuloCompetencia } from "@/lib/fechamento";
import { lerGradeFechamento } from "@/lib/fechamento-leitura";

export const dynamic = "force-dynamic";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const curta = (c: string) => `${MESES_CURTOS[Number(c.slice(5, 7)) - 1]}/${c.slice(0, 4)}`;

const VARIANTE_STATUS: Record<string, "info" | "outline" | "success" | "warning"> = {
  em_preparacao: "info",
  conferido: "outline",
  enviado: "success",
  pago_parcial: "warning",
  pago: "success",
};

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const grade = await lerGradeFechamento(new Date(`${hojeDataPura()}T00:00:00.000Z`));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fechamento por empresa"
        description="Demonstrativo mensal de cada empresa com cobrança via BFX, pelo mês de vencimento das parcelas."
        breadcrumbs={[{ label: "Fechamento" }]}
      />

      {grade.empresas.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="Nenhuma empresa com cobrança via BFX ligada."
            description="Ligue em Cadastros › Empresas › Regras depois da confirmação da Prudent."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <section aria-labelledby="fechamento-grade" className="px-2 pb-2 pt-4">
            <h2 id="fechamento-grade" className="px-3 pb-2 text-base font-semibold">
              Empresas × competência
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3">Empresa</TableHead>
                  {grade.competencias.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      <abbr title={rotuloCompetencia(c)} className="no-underline">
                        {curta(c)}
                      </abbr>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grade.empresas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-3 font-medium">{e.nome}</TableCell>
                    {grade.competencias.map((c) => {
                      const cel = e.celulas[c];
                      if (cel.tipo === "fechamento") {
                        return (
                          <TableCell key={c} className="align-top">
                            <Link
                              href={`/fechamento/${cel.id}`}
                              className="flex min-w-32 flex-col gap-1 rounded-md py-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Badge variant={VARIANTE_STATUS[cel.status] ?? "outline"} className="w-fit whitespace-nowrap">
                                {ROTULO_STATUS_FECHAMENTO[cel.status] ?? cel.status}
                              </Badge>
                              <span className="valor-sensivel font-semibold tabular-nums">{formatBRL(cel.total)}</span>
                              <span className="text-xs text-muted-foreground">
                                {cel.parcelas} {cel.parcelas === 1 ? "parcela" : "parcelas"}
                                {cel.desatualizado ? " · atualizar" : ""}
                              </span>
                            </Link>
                          </TableCell>
                        );
                      }
                      if (cel.tipo === "gerar") {
                        return (
                          <TableCell key={c} className="align-top">
                            <FechamentoGerarButton
                              empresaParceiraId={e.id}
                              competencia={c}
                              rotulo={`Gerar fechamento de ${e.nome} em ${rotuloCompetencia(c)}`}
                            />
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={c} className="align-top pt-6 text-xs text-muted-foreground">
                          cobrança via BFX desligada
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </Card>
      )}
    </div>
  );
}
