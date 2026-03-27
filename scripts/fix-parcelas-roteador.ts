/**
 * Corrige as parcelasVencimento da venda do ROTEADOR WI-FI EMP INTELBRAS
 * de FOAM FLAVIA BARRETO (Amazon Five, 30/01/2026) que estão ambas com
 * dataVencimento em março, quando a parcela 2 deveria ser abril.
 *
 * Uso: npx tsx scripts/fix-parcelas-roteador.ts
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Encontrar a venda pelo produto e cliente
  const venda = await prisma.venda.findFirst({
    where: {
      produtoNome: { contains: 'ROTEADOR', mode: 'insensitive' },
      cliente: { nome: { contains: 'FLAVIA BARRETO', mode: 'insensitive' } },
    },
    include: {
      cliente: { select: { nome: true } },
      parcelasVencimento: { orderBy: { numeroParcela: 'asc' } },
    },
  });

  if (!venda) {
    console.log('Venda não encontrada. Listando vendas com ROTEADOR...');
    const vendas = await prisma.venda.findMany({
      where: { produtoNome: { contains: 'ROTEADOR', mode: 'insensitive' } },
      include: {
        cliente: { select: { nome: true } },
        parcelasVencimento: { orderBy: { numeroParcela: 'asc' } },
      },
    });
    console.log(JSON.stringify(vendas.map(v => ({
      id: v.id,
      cliente: v.cliente?.nome,
      produto: v.produtoNome,
      dataVenda: v.dataVenda,
      parcelas: v.parcelasVencimento.map(p => ({ num: p.numeroParcela, data: p.dataVencimento })),
    })), null, 2));
    return;
  }

  console.log(`Venda encontrada: id=${venda.id}, cliente=${venda.cliente?.nome}`);
  console.log('Parcelas atuais:');
  venda.parcelasVencimento.forEach(p => {
    console.log(`  Parcela ${p.numeroParcela}: ${p.dataVencimento.toISOString().split('T')[0]}`);
  });

  if (venda.parcelasVencimento.length !== 2) {
    console.log(`Esperado 2 parcelas, encontrado ${venda.parcelasVencimento.length}. Abortando.`);
    return;
  }

  // Para compra em 30/01/2026: dia > 20 → primeiro vencimento = 10/03/2026
  const parcela1Data = new Date('2026-03-10');
  const parcela2Data = new Date('2026-04-10');

  const [p1, p2] = venda.parcelasVencimento;

  await prisma.parcelaVencimento.update({
    where: { id: p1.id },
    data: { dataVencimento: parcela1Data },
  });
  console.log(`Parcela 1 atualizada para ${parcela1Data.toISOString().split('T')[0]}`);

  await prisma.parcelaVencimento.update({
    where: { id: p2.id },
    data: { dataVencimento: parcela2Data },
  });
  console.log(`Parcela 2 atualizada para ${parcela2Data.toISOString().split('T')[0]}`);

  console.log('Correção concluída!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
