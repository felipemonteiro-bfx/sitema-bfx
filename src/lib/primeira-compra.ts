/**
 * Determina se uma venda é a PRIMEIRA compra do cliente.
 *
 * Compartilhado entre o cron `primeira-compra` (que inclui esses casos) e o
 * `agradecimento-pos-venda` (que os exclui quando a primeira compra está ativa),
 * garantindo que o cliente de primeira viagem receba só uma mensagem.
 */
import { prisma } from "@/lib/db";

export async function ehPrimeiraCompra(clienteId: number, vendaId: number): Promise<boolean> {
  const anteriores = await prisma.venda.count({
    where: { clienteId, id: { lt: vendaId } },
  });
  return anteriores === 0;
}
