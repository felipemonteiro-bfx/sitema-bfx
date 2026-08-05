import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revalidatePath } from "next/cache";
import AntecipacaoClient from "@/components/antecipacao-client";
import HistoricoAntecipacoes from "@/components/historico-antecipacoes";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

async function antecipar(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const ids = formData.getAll("id").map((v) => Number(v));
  const mesInicio = formData.get("mesInicio") as string | null; // MM/YYYY
  const mesFim = formData.get("mesFim") as string | null;
  if (!ids.length) return;

  // Calcular range de datas para filtrar parcelas
  let inicioDate: Date | null = null;
  let fimDate: Date | null = null;
  if (mesInicio && mesFim) {
    const [mi, ai] = mesInicio.split("/").map(Number);
    const [mf, af] = mesFim.split("/").map(Number);
    if (mi && ai && mf && af) {
      inicioDate = new Date(Date.UTC(ai, mi - 1, 1));
      fimDate = new Date(Date.UTC(af, mf, 0, 23, 59, 59)); // ultimo dia do mes fim
    }
  }

  // Buscar parcelas das vendas selecionadas no período
  const parcelas = await prisma.parcelaVencimento.findMany({
    where: {
      vendaId: { in: ids },
      antecipada: false,
      ...(inicioDate && fimDate ? {
        dataVencimento: { gte: inicioDate, lte: fimDate },
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

  const formatMesAno = (d: Date) =>
    d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "America/Manaus" });

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

  revalidatePath("/prudent");
}

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  // Buscar TODAS as vendas (antecipada 0, 1, 2)
  const todasVendas = await prisma.venda.findMany({
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

  const parcelasDoMes = await prisma.parcelaVencimento.findMany({
    where: {
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
  }));

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
      <HistoricoAntecipacoes batches={batchesFormatados} />
    </div>
  );
}
