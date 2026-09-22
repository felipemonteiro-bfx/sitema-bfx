import { prisma } from "@/lib/db";
import { valorTotalVenda, produtosTexto } from "@/lib/venda-utils";
import { agruparAntecipacoesSemLote, idsEmLotes } from "@/lib/antecipacoes-sem-lote";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";
import {
  chaveComprador,
  parcelasDaVenda,
  resumirAntecipacaoPorComprador,
  resumirAntecipacaoPorMes,
  type VendaParaResumo,
} from "@/lib/antecipacao-compradores";
import { contagensDaFila, mesesEmAberto } from "@/lib/fila-antecipacao";
import { linhasDosItens } from "@/lib/itens-venda";
import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { revalidarVenda } from "@/lib/revalidacao";
import { abrirLote } from "@/lib/lote-antecipacao-db";
import { idsValidos } from "@/app/(app)/prudent/actions";
import AntecipacaoClient from "@/components/antecipacao-client";
import HistoricoAntecipacoes from "@/components/historico-antecipacoes";
import { PageHeader } from "@/components/page-header";
import { hojeDataPura } from "@/lib/data-pura";

export const dynamic = "force-dynamic";

async function antecipar(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const ids = idsValidos(formData.getAll("id"));
  if (!ids.length) return;

  // Range de datas para filtrar parcelas. O parse mora no lib porque a tela, esta
  // action e os relatorios precisam concordar — antes cada um fazia o seu, e um
  // mes invalido como "13/2025" virava janeiro de 2026 so aqui.
  const periodo = parsePeriodoMesAno(formData.get("mesInicio") as string | null, formData.get("mesFim") as string | null);

  // Periodo pedido mas ilegivel: abortar em vez de antecipar tudo. Sem esta guarda
  // um "13/2025" digitado errado viraria um lote com todas as parcelas em aberto.
  if ((formData.get("mesInicio") || formData.get("mesFim")) && !periodo) return;

  // 2026-09-17: o envio abre um lote EM ANDAMENTO. Nada de `paga` nem `antecipada` aqui — isso
  // é o retorno da Prudent, confirmado no histórico (`concluirLoteAction`).
  await abrirLote({ vendaIds: ids, periodo });

  revalidarVenda();
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  // Só vendas em desconto em folha entram na fila: SE desconto em folha, ENTAO a
  // venda e antecipada junto a Prudent. Os demais status de antecipacao (0,1,2,3)
  // continuam todos visiveis — o filtro e por forma de pagamento, nao por status.
  const todasVendas = await prisma.venda.findMany({
    where: WHERE_VENDA_ANTECIPAVEL,
    orderBy: { dataVenda: "desc" },
    include: {
      cliente: {
        select: {
          nome: true,
          cpf: true,
          cnpj: true,
          empresa: true,
          email: true,
        },
      },
      itens: { select: { subtotal: true, produtoNome: true, quantidade: true } },
      parcelasVencimento: {
        select: {
          numeroParcela: true,
          id: true,
          dataVencimento: true,
          valorParcela: true,
          antecipada: true,
          // Vínculo com lote aberto = parcela em andamento (2026-09-17).
          antecipacaoLoteId: true,
          paga: true,
          origemPagamento: true,
        },
      },
    },
  });

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Mesmo recorte da fila: o card "a vencer no mes por empresa" ficaria somando
  // Pix e cartao numa tela que so lista desconto em folha.
  const parcelasDoMes = await prisma.parcelaVencimento.findMany({
    where: {
      venda: WHERE_VENDA_ANTECIPAVEL,
      dataVencimento: {
        gte: inicioMes,
        lte: fimMes,
      },
      paga: false,
    },
    include: {
      venda: {
        include: {
          cliente: {
            select: {
              empresa: true,
            },
          },
        },
      },
    },
  });

  const vencimentosPorEmpresa: Record<string, number> = {};
  parcelasDoMes.forEach((p) => {
    const empresa = p.venda.cliente?.empresa || "Sem empresa";
    vencimentosPorEmpresa[empresa] = (vencimentosPorEmpresa[empresa] || 0) + p.valorParcela;
  });

  // Extrair lista unica de empresas conveniadas
  const empresasUnicas = [...new Set(
    todasVendas
      .map((v) => v.cliente?.empresa)
      .filter((e): e is string => Boolean(e))
  )].sort();

  // Buscar batches de antecipacao para o historico
  const batches = await prisma.anticipacaoBatch.findMany({
    orderBy: { criadaEm: "desc" },
    take: 50,
  });

  const batchesFormatados = batches.map((b) => ({
    id: b.id,
    criadaEm: b.criadaEm,
    vendaIds: b.vendaIds,
    valorTotal: b.valorTotal,
    quantidadeVendas: b.quantidadeVendas,
    periodoDescricao: b.periodoDescricao,
    // O historico precisa do periodo gravado para reemitir o relatorio do lote.
    periodoInicio: b.periodoInicio,
    periodoFim: b.periodoFim,
    // Ciclo do lote (2026-09-17): o histórico é onde o retorno da Prudent é confirmado.
    status: b.status,
    origem: b.origem,
    concluidaEm: b.concluidaEm,
    concluidaPor: b.concluidaPor,
  }));

  // Antecipacoes que existem SEM lote. Medido em producao (2026-08-11):
  // `antecipacao_batches` vazia e 26 vendas com `antecipada = 1`. Sem este
  // bloco o card dizia "Nenhuma antecipacao realizada ainda" enquanto a tela
  // listava vendas como "Antecipado".
  const vendasAntecipadas = await prisma.venda.findMany({
    where: { antecipada: 1 },
    orderBy: { dataVenda: "desc" },
    take: 200,
    select: {
      id: true,
      dataVenda: true,
      valorVenda: true,
      quantidade: true,
      valorFrete: true,
      desconto: true,
      parcelas: true,
      cliente: { select: { nome: true, empresa: true } },
      itens: { select: { subtotal: true, produtoNome: true, quantidade: true } },
    },
  });

  const antecipacoesSemLote = agruparAntecipacoesSemLote(
    vendasAntecipadas.map((v) => ({
      id: v.id,
      dataVenda: v.dataVenda,
      clienteNome: v.cliente?.nome ?? null,
      empresa: v.cliente?.empresa ?? null,
      produtos: produtosTexto(v),
      valorTotal: valorTotalVenda(v),
      parcelas: v.parcelas || 1,
    })),
    idsEmLotes(batches)
  );

  // O que ja foi antecipado de cada comprador e o que falta — as regras moram em
  // src/lib/antecipacao-compradores.ts. "Hoje" e o dia civil de Manaus: o dia UTC
  // do servidor viraria as 20h e daria parcela do dia como vencida.
  const hoje = hojeDataPura();
  const paraResumo = (v: (typeof todasVendas)[number]): VendaParaResumo => ({
    id: v.id,
    status: v.status,
    antecipada: v.antecipada,
    clienteId: v.clienteId,
    clienteNome: v.cliente?.nome ?? null,
    empresa: v.cliente?.empresa ?? null,
    parcelas_detalhes: v.parcelasVencimento.map((p) => ({ ...p, emAndamento: p.antecipacaoLoteId != null })),
  });
  const vendasParaResumo = todasVendas.map(paraResumo);
  const resumoCompradores = resumirAntecipacaoPorComprador(vendasParaResumo, hoje);
  const resumoMeses = resumirAntecipacaoPorMes(vendasParaResumo, hoje);

  type StatusFila = "pendente" | "em_andamento" | "antecipado" | "parcialmente_antecipado";
  const statusDaVenda = (antecipada: number): StatusFila =>
    antecipada === 1 ? "antecipado" : antecipada === 2 ? "em_andamento" : antecipada === 3 ? "parcialmente_antecipado" : "pendente";

  // Tudo que a fila mostra sai calculado daqui, do servidor — a tela só exibe
  // (pedido do André, 2026-09-11). As parcelas cruas não vão mais para o navegador.
  const vendasFormatadas = todasVendas.map((v) => ({
    id: v.id,
    compradorChave: chaveComprador(v),
    dataVenda: v.dataVenda,
    produtoNome: v.produtoNome,
    valorVenda: valorTotalVenda(v),
    parcelas: v.parcelas,
    empresaConveniada: v.cliente?.empresa || null,
    clienteNome: v.cliente?.nome || null,
    clienteCpf: v.cliente?.cpf || null,
    clienteCnpj: v.cliente?.cnpj || null,
    status: statusDaVenda(v.antecipada ?? 0),
    produtos: linhasDosItens(v.itens),
    parcelasInfo: parcelasDaVenda({ ...paraResumo(v), dataVenda: v.dataVenda }, hoje),
    // Sem parcela cadastrada: null — o filtro de vencimento não tem como julgar e
    // deixa a venda na lista, como antes.
    mesesEmAberto:
      v.parcelasVencimento.length > 0
        ? mesesEmAberto(v.parcelasVencimento.map((p) => ({ ...p, emAndamento: p.antecipacaoLoteId != null })))
        : null,
  }));
  const contagens = contagensDaFila(vendasFormatadas.map((v) => ({ empresa: v.empresaConveniada, status: v.status })));
  const valoresPorMes = Object.fromEntries(resumoMeses.map((m) => [m.mes, m.aAntecipar.valor]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Antecipação Prudent"
        description="Veja o que já foi antecipado de cada comprador e o que falta, e selecione as vendas para antecipar com a taxa Smart."
        breadcrumbs={[{ label: "Antecipação Prudent" }]}
      />
      {/* O resumo por comprador e a fila de vendas compartilham o filtro "Ver na
          fila", entao os dois cards sao desenhados dentro do AntecipacaoClient. */}
      <AntecipacaoClient
        vendasIniciais={vendasFormatadas}
        onSubmit={antecipar}
        vencimentosPorEmpresa={vencimentosPorEmpresa}
        empresasDisponiveis={empresasUnicas}
        resumoCompradores={resumoCompradores}
        resumoMeses={resumoMeses}
        contagens={contagens}
        valoresPorMes={valoresPorMes}
        hoje={hoje}
      />
      <HistoricoAntecipacoes batches={batchesFormatados} semLote={antecipacoesSemLote} hoje={hoje} />
    </div>
  );
}
