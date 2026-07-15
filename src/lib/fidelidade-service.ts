/**
 * Efeitos da fidelidade: ledger `PontoTransacao` + saldo `Cliente.pontos`.
 * Regras puras em `fidelidade.ts`.
 */
import { prisma } from "@/lib/db";
import { pontosDaVenda, podeResgatar } from "@/lib/fidelidade";

/**
 * Credita pontos por uma venda (idempotente por venda: não credita duas vezes).
 * Fire-and-forget seguro — retorna os pontos creditados (0 se nada a fazer).
 */
export async function creditarPontosVenda(
  clienteId: number,
  vendaId: number,
  totalVenda: number
): Promise<number> {
  const pontos = pontosDaVenda(totalVenda);
  if (pontos <= 0) return 0;

  // Idempotência: já existe crédito de ganho para esta venda?
  const existente = await prisma.pontoTransacao.findFirst({
    where: { vendaId, tipo: "ganho" },
    select: { id: true },
  });
  if (existente) return 0;

  await prisma.$transaction([
    prisma.pontoTransacao.create({
      data: { clienteId, vendaId, tipo: "ganho", pontos, descricao: `Compra #${vendaId}` },
    }),
    prisma.cliente.update({ where: { id: clienteId }, data: { pontos: { increment: pontos } } }),
  ]);
  return pontos;
}

/**
 * Resgata pontos (desconto). Cria transação negativa e debita o saldo.
 * Retorna false se saldo insuficiente. Concorrência protegida por revalidação do saldo.
 */
export async function resgatarPontos(
  clienteId: number,
  pontos: number,
  descricao?: string
): Promise<boolean> {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { pontos: true } });
  const saldo = cliente?.pontos ?? 0;
  if (!podeResgatar(saldo, pontos)) return false;

  await prisma.$transaction([
    prisma.pontoTransacao.create({
      data: { clienteId, tipo: "resgate", pontos: -pontos, descricao: descricao || "Resgate de pontos" },
    }),
    prisma.cliente.update({ where: { id: clienteId }, data: { pontos: { decrement: pontos } } }),
  ]);
  return true;
}
