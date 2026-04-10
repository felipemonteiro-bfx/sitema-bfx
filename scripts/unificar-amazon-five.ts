/**
 * Unifica registros duplicados de "AMAZON FIVE" na tabela de clientes.
 * Padroniza o campo `empresa` de todos os clientes que tenham variações
 * do nome (ex: "Amazon Five", "AMAZON FIVE", "amazon five", "Amazonfive", "AMAOZN FIVE")
 * para "AMAZON FIVE".
 *
 * NOTA: a migration `20260410010000_normalize_amazon_five` ja faz isso
 * automaticamente para clientes E para empresas_parceiras (com merge de IDs).
 * Este script existe como ferramenta manual de re-execucao caso novos
 * registros com variantes apareçam.
 *
 * Uso: npx tsx scripts/unificar-amazon-five.ts
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Buscar todos os clientes que têm alguma variação de "Amazon Five"
  const clientes = await prisma.cliente.findMany({
    where: {
      empresa: { contains: 'amazon', mode: 'insensitive' },
    },
    select: { id: true, nome: true, empresa: true },
  });

  console.log(`Encontrados ${clientes.length} clientes com "amazon" no campo empresa:`);
  const variantes = new Set(clientes.map(c => c.empresa));
  console.log('Variantes encontradas:', [...variantes]);

  if (clientes.length === 0) {
    console.log('Nenhum cliente encontrado. Abortando.');
    return;
  }

  // Definir nome padronizado
  const nomePadrao = 'AMAZON FIVE';

  const idsParaAtualizar = clientes
    .filter(c => c.empresa !== nomePadrao)
    .map(c => c.id);

  if (idsParaAtualizar.length === 0) {
    console.log(`Todos os ${clientes.length} clientes já têm o nome padronizado "${nomePadrao}".`);
    return;
  }

  console.log(`\nAtualizando ${idsParaAtualizar.length} clientes para "${nomePadrao}"...`);

  const result = await prisma.cliente.updateMany({
    where: { id: { in: idsParaAtualizar } },
    data: { empresa: nomePadrao },
  });

  console.log(`${result.count} clientes atualizados com sucesso!`);

  // Verificar resultado
  const depois = await prisma.cliente.findMany({
    where: {
      empresa: { contains: 'amazon', mode: 'insensitive' },
    },
    select: { id: true, nome: true, empresa: true },
  });
  const variantesDepois = new Set(depois.map(c => c.empresa));
  console.log('\nVariantes após correção:', [...variantesDepois]);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
