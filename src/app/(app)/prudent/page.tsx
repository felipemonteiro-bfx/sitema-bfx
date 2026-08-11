import { prisma } from "@/lib/db";
import { valorTotalVenda, produtosTexto } from "@/lib/venda-utils";
import { agruparAntecipacoesSemLote, idsEmLotes } from "@/lib/antecipacoes-sem-lote";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";
import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revalidarVenda } from "@/lib/revalidacao";
import AntecipacaoClient from "@/components/antecipacao-client";
import HistoricoAntecipacoes from "@/components/historico-antecipacoes";
import { PageHeader } from "@/components/page-header";
import { formatarMesAnoPuro } from "@/lib/data-pura";

export const dynamic = "force-dynamic";

async function antecipar(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const ids = formData.getAll("id").map((v) => Number(v));
  const mesInicio = formData.get("mesInicio") as string | null; // MM/YYYY
  const mesFim = formData.get("mesFim") as string | null;
  if (!ids.length) return;

  // Range de datas para filtrar parcelas. O parse mora no lib porque a tela, esta
  // action e os relatorios precisam concordar — antes cada um fazia o seu, e um
  // mes invalido como "13/2025" virava janeiro de 2026 so aqui.
  const periodo = parsePeriodoMesAno(mesInicio, mesFim);

  // Periodo pedido mas ilegivel: abortar em vez de antecipar tudo. Sem esta guarda
  // um "13/2025" digitado errado viraria um lote com todas as parcelas em aberto.
  if ((mesInicio || mesFim) && !periodo) return;

  // Buscar parcelas das vendas selecionadas no período.
  // A action repete o filtro de forma de pagamento da fila: a tela ja so lista
  // vendas em desconto em folha, mas o form e postavel com qualquer id.
  const parcelas = await prisma.parcelaVencimento.findMany({
    where: {
      vendaId: { in: ids },
      venda: WHERE_VENDA_ANTECIPAVEL,
      antecipada: false,
      ...(periodo ? {
        dataVencimento: { gte: periodo.inicio, lte: periodo.fim },
      } : {}),
    },
    include: { venda: { include: { itens: { select: { subtotal: true } } } } },
  });

  if (parcelas.length === 0) return;

  const parcelaIds = parcelas.map((p) => p.id);
  const valorTotal = parcelas.reduce((sum, p) => sum + p.valorParcela, 0);
  const vendaIdsAfetados = [...new Set(parcelas.map((p) => p.vendaId))];

  const datas = parcelas.map((p) => new Date(p.dataVencimento)).sort((a, b) => a.getTime() - b.getTime());
  const periodoInicio = datas[0] || null;
  const periodoFim = datas[datas.length - 1] || null;

  // Vencimento e data pura: em Manaus o dia 1 do mes virava o mes anterior no rotulo.
  const formatMesAno = formatarMesAnoPuro;

  const periodoDescricao =
    periodoInicio && periodoFim
      ? periodoInicio.getMonth() === periodoFim.getMonth() &&
        periodoInicio.getFullYear() === periodoFim.getFullYear()
        ? formatMesAno(periodoInicio)
        : `${formatMesAno(periodoInicio)} - ${formatMesAno(periodoFim)}`
      : null;

  // Salvar batch
  await prisma.anticipacaoBatch.create({
    data: {
      vendaIds: JSON.stringify(vendaIdsAfetados),
      valorTotal,
      quantidadeVendas: vendaIdsAfetados.length,
      periodoDescricao,
      periodoInicio,
      periodoFim,
    },
  });

  // Marcar parcelas como antecipadas
  await prisma.parcelaVencimento.updateMany({
    where: { id: { in: parcelaIds } },
    data: { antecipada: true },
  });

  // Atualizar status das vendas baseado nas parcelas
  for (const vendaId of vendaIdsAfetados) {
    const totalParcelas = await prisma.parcelaVencimento.count({ where: { vendaId } });
    const parcelasAntecipadas = await prisma.parcelaVencimento.count({ where: { vendaId, antecipada: true } });

    let novoStatus = 0; // pendente
    if (parcelasAntecipadas === totalParcelas) {
      novoStatus = 1; // totalmente antecipado
    } else if (parcelasAntecipadas > 0) {
      novoStatus = 3; // parcialmente antecipado
    }

    await prisma.venda.update({
      where: { id: vendaId },
      data: { antecipada: novoStatus },
    });
  }

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
          dataVencimento: true,
          valorParcela: true,
          antecipada: true,
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

  const vendasFormatadas = todasVendas.map((v) => {
    const antecipada = v.antecipada ?? 0;
    let status: "pendente" | "em_andamento" | "antecipado" | "parcialmente_antecipado";
    if (antecipada === 1) {
      status = "antecipado";
    } else if (antecipada === 2) {
      status = "em_andamento";
    } else if (antecipada === 3) {
      status = "parcialmente_antecipado";
    } else {
      status = "pendente";
    }

    return {
      id: v.id,
      dataVenda: v.dataVenda,
      produtoNome: v.produtoNome,
      valorVenda: valorTotalVenda(v),
      parcelas: v.parcelas,
      empresaConveniada: v.cliente?.empresa || null,
      clienteNome: v.cliente?.nome || null,
      clienteCpf: v.cliente?.cpf || null,
      clienteCnpj: v.cliente?.cnpj || null,
      status,
      itens: v.itens.map((i) => ({
        produtoNome: i.produtoNome,
        quantidade: i.quantidade,
        subtotal: i.subtotal,
      })),
      parcelas_detalhes: v.parcelasVencimento.map((p) => ({
        numeroParcela: p.numeroParcela,
        dataVencimento: p.dataVencimento.toISOString(),
        valorParcela: p.valorParcela,
        antecipada: p.antecipada,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Antecipação Prudent"
        description="Selecione as vendas para realizar a antecipação de recebíveis com taxa inteligente."
        breadcrumbs={[{ label: "Antecipação Prudent" }]}
      />
      {/* Variante padrao, a mesma do card irmao logo abaixo (Historico de
          Antecipacoes). Antes este era elevado: os dois divergiam em fundo e
          blur nos dois temas, apesar de terem a mesma largura e o mesmo papel
          (fase 16, achado 8). */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Vendas — Antecipação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AntecipacaoClient
            vendasIniciais={vendasFormatadas}
            onSubmit={antecipar}
            vencimentosPorEmpresa={vencimentosPorEmpresa}
            empresasDisponiveis={empresasUnicas}
          />
        </CardContent>
      </Card>
      <HistoricoAntecipacoes batches={batchesFormatados} semLote={antecipacoesSemLote} />
    </div>
  );
}
