import { CalendarClock, Landmark, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import { CardStats } from "@/components/ui/card";
import ObrigacoesClient, { type LinhaBoleto } from "@/components/obrigacoes-client";
import ObrigacoesGrafico from "@/components/obrigacoes-grafico";
import { formatBRL } from "@/lib/utils";
import { formatarDataPura, hojeDataPura } from "@/lib/data-pura";
import { regraVigente, type RegraComVigencia } from "@/lib/regra-empresa";
import { STATUS_LOTE } from "@/lib/lote-antecipacao";
import { saldoDoBoleto } from "@/lib/boleto-prudent";
import { projetarCaixa } from "@/lib/projecao-caixa";
import {
  abaDoBoleto,
  dataPixDoMes,
  documentoDiverge,
  entradaDaProjecao,
  situacaoDoBoleto,
  vencimentoEfetivo,
} from "@/lib/obrigacoes-agenda";

export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ddmm = (s: string) => s.slice(5).split("-").reverse().join("/");
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  // "Hoje" é o dia em Manaus, como data pura: `new Date()` cru vira o dia seguinte às 20h.
  const hojeIso = hojeDataPura();
  const hoje = new Date(`${hojeIso}T00:00:00.000Z`);

  const [boletos, lotesEmAndamento] = await Promise.all([
    prisma.boletoPrudent.findMany({
      orderBy: [{ vencimento: "asc" }, { id: "asc" }],
      select: {
        id: true,
        loteId: true,
        empresaParceiraId: true,
        vencimento: true,
        valorEsperado: true,
        valorDocumento: true,
        vencimentoDocumento: true,
        linhaDigitavel: true,
        pdfArquivoId: true,
        direcionamento: true,
        status: true,
        divergenciaJustificativa: true,
        substituiId: true,
        _count: { select: { parcelas: true } },
        pagamentos: {
          orderBy: { dataPagamento: "asc" },
          select: {
            id: true,
            dataPagamento: true,
            valorPrincipal: true,
            valorEncargos: true,
            comprovanteArquivoId: true,
            autenticacao: true,
            estornadoEm: true,
          },
        },
      },
    }),
    prisma.anticipacaoBatch.findMany({
      where: { status: STATUS_LOTE.emAndamento },
      select: { valorAprovado: true, valorLiquidoSolicitado: true, dataDepositoPrevista: true },
    }),
  ]);

  const empresaIds = [...new Set(boletos.map((b) => b.empresaParceiraId).filter((id): id is number => id != null))];
  const [empresas, regras] = empresaIds.length
    ? await Promise.all([
        prisma.empresaParceira.findMany({ where: { id: { in: empresaIds } }, select: { id: true, nome: true } }),
        prisma.regraEmpresa.findMany({ where: { empresaParceiraId: { in: empresaIds } }, orderBy: { vigenteDe: "asc" } }),
      ])
    : [[], []];
  const nomeEmpresa = new Map(empresas.map((e) => [e.id, e.nome]));
  const regrasPorEmpresa = new Map<number, RegraComVigencia[]>();
  for (const r of regras) {
    const lista = regrasPorEmpresa.get(r.empresaParceiraId) ?? [];
    lista.push({ ...r, repasseBase: r.repasseBase === "venda" ? "venda" : null });
    regrasPorEmpresa.set(r.empresaParceiraId, lista);
  }

  // O dia do Pix sai da regra vigente da empresa no mês do vencimento; boleto sem empresa não tem Pix.
  const agenda = boletos.map((b) => {
    const dataPix =
      b.empresaParceiraId != null
        ? dataPixDoMes(b.vencimento, regraVigente(regrasPorEmpresa.get(b.empresaParceiraId) ?? [], b.vencimento).diaPix)
        : null;
    return { ...b, dataPix };
  });

  const projecao = projetarCaixa(entradaDaProjecao({ hoje, boletos: agenda, lotesEmAndamento }));

  const linhas: LinhaBoleto[] = agenda.map((b) => ({
    id: b.id,
    loteId: b.loteId,
    empresa: b.empresaParceiraId != null ? (nomeEmpresa.get(b.empresaParceiraId) ?? "—") : "Sem empresa parceira",
    vence: iso(vencimentoEfetivo(b)),
    vencimentoContratual: iso(b.vencimento),
    parcelas: b._count.parcelas,
    esperado: b.valorEsperado,
    noBoleto: b.valorDocumento,
    diverge: documentoDiverge(b),
    divergenciaJustificativa: b.divergenciaJustificativa,
    linhaDigitavel: b.linhaDigitavel,
    pdfArquivoId: b.pdfArquivoId,
    direcionamento: b.direcionamento,
    status: b.status,
    substituiId: b.substituiId,
    aba: abaDoBoleto(b),
    situacao: situacaoDoBoleto(b, hoje),
    saldo: saldoDoBoleto(b, b.pagamentos),
    pagamentos: b.pagamentos.map((p) => ({
      id: p.id,
      data: iso(p.dataPagamento),
      principal: p.valorPrincipal,
      encargos: p.valorEncargos,
      comprovanteArquivoId: p.comprovanteArquivoId,
      autenticacao: p.autenticacao,
      estornado: p.estornadoEm != null,
    })),
  }));

  // Os marcadores de Pix do gráfico: os dias de Pix dos boletos da BFX dentro do horizonte.
  const fimIso = projecao.serie[projecao.serie.length - 1]?.data ?? hojeIso;
  const diasPix = [
    ...new Set(
      agenda
        .filter((b) => b.direcionamento === "bfx" && b.dataPix)
        .map((b) => iso(b.dataPix as Date))
        .filter((d) => d >= hojeIso && d <= fimIso)
    ),
  ].sort();

  const diaPixPadrao = diasPix[0] ? Number(diasPix[0].slice(8)) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obrigações da BFX"
        description="Boletos da Prudent que a BFX paga, e o caixa dos próximos 60 dias"
        breadcrumbs={[{ label: "Obrigações" }]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CardStats
          title="A pagar antes do Pix"
          value={formatBRL(projecao.antesDoPix)}
          description={
            diaPixPadrao
              ? `${plural(projecao.boletosAntesDoPix, "boleto", "boletos")} antes do dia ${diaPixPadrao}`
              : plural(projecao.boletosAntesDoPix, "boleto", "boletos")
          }
          icon={CalendarClock}
          color="warning"
        />
        <CardStats
          title="A pagar depois do Pix"
          value={formatBRL(projecao.depoisDoPix)}
          description={plural(projecao.boletosDepoisDoPix, "boleto", "boletos")}
          icon={Landmark}
        />
        <CardStats
          title="Maior valor a financiar"
          value={formatBRL(projecao.pico?.valor ?? 0)}
          description={
            projecao.pico
              ? `pico em ${ddmm(projecao.pico.data)}, já contando depósitos da Prudent`
              : "nenhum dia sem cobertura nos próximos 60 dias"
          }
          icon={TrendingUp}
          color="error"
        />
      </div>

      <ObrigacoesGrafico serie={projecao.serie} pico={projecao.pico} diasPix={diasPix} vencidos={projecao.vencidos} />

      <ObrigacoesClient linhas={linhas} hoje={hojeIso} />

      <p className="text-sm text-muted-foreground">
        Boleto substituído fica listado junto do original, em Todos. Juros, diferença e pagamento parcial ficam no
        registro do pagamento; o mesmo comprovante não baixa duas vezes.
        {projecao.vencidos > 0 ? ` ${plural(projecao.vencidos, "boleto vencido entra", "boletos vencidos entram")} no caixa de hoje (${formatarDataPura(hoje)}).` : ""}
      </p>
    </div>
  );
}
