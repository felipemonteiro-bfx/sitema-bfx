import { prisma } from "@/lib/db";
import { addMonths } from "date-fns";

/**
 * Limite de crédito do cliente (teto = min(renda × 30%, R$ 475)). `diaCorte` é o da regra da
 * empresa do cliente (spec 2026-09-30 §7): venda até o corte começa a descontar no mês seguinte,
 * depois dele dois meses à frente. Default 20, o comportamento anterior.
 */
export async function checkCredito(clienteId: number, parcNova: number, diaCorte = 20) {
  const cli = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cli || !cli.renda) {
    return { ok: true, disp: 0, tomado: 0, teto: 0 };
  }
  const teto = Math.min(cli.renda * 0.3, 475);
  const vendas = await prisma.venda.findMany({ where: { clienteId, status: { not: { in: ["cancelada", "estornada"] } } } });
  let tomado = 0;
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  for (const v of vendas) {
    const dv = v.dataVenda;
    const dia = dv.getDate();
    const inicio = addMonths(new Date(dv.getFullYear(), dv.getMonth(), 1), dia <= diaCorte ? 1 : 2);
    const fim = addMonths(inicio, v.parcelas || 0);
    if (inicio <= mesAtual && mesAtual < fim) {
      tomado += v.valorParcela || 0;
    }
  }
  return { ok: tomado + parcNova <= teto + 1, disp: teto - tomado, tomado, teto };
}
