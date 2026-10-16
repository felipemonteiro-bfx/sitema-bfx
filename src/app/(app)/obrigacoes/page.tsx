import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { KpiCard } from "@/components/kpi-card";
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
import { lerFechamentosComPix } from "@/lib/fechamento-leitura";
import { pixAtrasados, pixEsperados } from "@/lib/pix-fechamento";

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

  const [boletos, lotesEmAndamento, fechamentosPix] = await Promise.all([
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
    // Fase 6: o saldo de cada fechamento aguardando o Pix entra no caixa no dia do Pix.
    lerFechamentosComPix(),
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

  const projecao = projetarCaixa(
    entradaDaProjecao({ hoje, boletos: agenda, lotesEmAndamento, pixEsperados: pixEsperados(fechamentosPix) })
  );
  const atrasados = pixAtrasados(fechamentosPix, hoje);

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
        .concat(fechamentosPix.map((f) => iso(f.dataPix)))
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

      {atrasados.map((p) => (
        <Alert key={p.fechamentoId} variant="error" showIcon>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="min-w-0 flex-1">
              <strong className="font-semibold">O Pix de {p.empresa} não entrou</strong> e o dia {ddmm(iso(p.dataPix))} passou
              {" "}— faltam {formatBRL(p.saldo)}.
              {p.boletosBfx > 0 ? ` A BFX cobre ${formatBRL(p.boletosBfx)} em boletos com capital próprio.` : ""}
            </p>
            <Link href={`/fechamento/${p.fechamentoId}`} className="shrink-0 font-semibold underline underline-offset-4">
              Abrir fechamento
            </Link>
          </div>
        </Alert>
      ))}

      {/* Indicadores num painel só (padrão Vantage): cartões internos neutros, o rótulo diz o que é. */}
      <section
        aria-label="Indicadores de obrigações"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2"
      >
        <KpiCard
          ordem={0}
          rotulo="A pagar antes do Pix"
          valor={formatBRL(projecao.antesDoPix)}
          rodape={
            diaPixPadrao
              ? `${plural(projecao.boletosAntesDoPix, "boleto", "boletos")} antes do dia ${diaPixPadrao}`
              : plural(projecao.boletosAntesDoPix, "boleto", "boletos")
          }
        />
        <KpiCard
          ordem={1}
          rotulo="A pagar depois do Pix"
          valor={formatBRL(projecao.depoisDoPix)}
          rodape={plural(projecao.boletosDepoisDoPix, "boleto", "boletos")}
        />
        <KpiCard
          ordem={2}
          rotulo="Maior valor a financiar"
          valor={formatBRL(projecao.pico?.valor ?? 0)}
          rodape={
            projecao.pico
              ? `pico em ${ddmm(projecao.pico.data)}, já contando depósitos da Prudent`
              : "nenhum dia sem cobertura nos próximos 60 dias"
          }
        />
      </section>

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
