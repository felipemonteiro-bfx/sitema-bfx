/**
 * Gravações do boleto Prudent (spec 2026-09-30 §3.4). As regras puras estão em
 * `@/lib/boleto-prudent`; aqui só o que toca o banco.
 */
import type { prisma } from "@/lib/db";
import { DIRECIONAMENTO, STATUS_BOLETO, agruparParcelasPorVencimento } from "@/lib/boleto-prudent";
import { inicioDoMes, regraVigente } from "@/lib/regra-empresa";
import { regrasDaEmpresa } from "@/lib/regra-empresa-db";

export type TxBoleto = Pick<typeof prisma, "boletoPrudent" | "parcelaVencimento">;

/**
 * Cria os boletos esperados de um lote que acabou de ser concluído: um por dia de vencimento das
 * parcelas, aguardando o documento da Prudent. O direcionamento sai da regra vigente da empresa
 * no dia 1º do mês do vencimento — a mesma data que o fechamento da competência usa
 * (`cobrancaViaBfx` → "bfx"); lote sem empresa fica "empresa".
 *
 * Roda dentro da transação de `concluirLote`. A ligação exige `boletoPrudentId: null`: parcela
 * que já tem boleto aborta a conclusão em vez de trocar de boleto em silêncio.
 */
export async function criarBoletosDoLote(
  tx: TxBoleto,
  lote: { id: number; empresaParceiraId: number | null },
  parcelas: { id: number; dataVencimento: Date; valorParcela: number }[]
): Promise<number[]> {
  const grupos = agruparParcelasPorVencimento(parcelas);
  if (grupos.length === 0) return [];
  const regras = lote.empresaParceiraId ? await regrasDaEmpresa(lote.empresaParceiraId) : [];

  const ids: number[] = [];
  for (const g of grupos) {
    const viaBfx = lote.empresaParceiraId != null && regraVigente(regras, inicioDoMes(g.vencimento)).cobrancaViaBfx;
    const boleto = await tx.boletoPrudent.create({
      data: {
        loteId: lote.id,
        empresaParceiraId: lote.empresaParceiraId,
        vencimento: g.vencimento,
        valorEsperado: g.valorEsperado,
        direcionamento: viaBfx ? DIRECIONAMENTO.bfx : DIRECIONAMENTO.empresa,
        status: STATUS_BOLETO.aguardandoDocumento,
      },
      select: { id: true },
    });
    const { count } = await tx.parcelaVencimento.updateMany({
      where: { id: { in: g.parcelaIds }, boletoPrudentId: null },
      data: { boletoPrudentId: boleto.id },
    });
    if (count !== g.parcelaIds.length) {
      throw new Error("Parte das parcelas deste lote já tem boleto da Prudent. Recarregue e confira o lote.");
    }
    ids.push(boleto.id);
  }
  return ids;
}
