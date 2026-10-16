import { prisma } from '@/lib/db';

type Grupo = { telefone: string; _max: { criadoEm: Date | null } };
export type UltimaMensagem = { id: number; telefone: string; direcao: string; corpo: string; criadoEm: Date };

/**
 * Última mensagem real (entrada/saída) de cada telefone, para a prévia da lista.
 * Usa o `_max.criadoEm` que o `groupBy` já calculou: a consulta traz só as linhas
 * (telefone, criadoEm) e não carrega o histórico inteiro (o `distinct` do Prisma
 * sem `nativeDistinct` deduplica em memória). Empate de data: vence o maior id.
 */
export async function ultimasMensagensPorTelefone(grupos: Grupo[]): Promise<UltimaMensagem[]> {
  const com = grupos.filter(g => g._max.criadoEm);
  if (!com.length) return [];
  const linhas = await prisma.whatsAppMensagem.findMany({
    where: { direcao: { in: ['in', 'out'] }, OR: com.map(g => ({ telefone: g.telefone, criadoEm: g._max.criadoEm! })) },
    select: { id: true, telefone: true, direcao: true, corpo: true, criadoEm: true },
  });
  const porTelefone = new Map<string, UltimaMensagem>();
  for (const l of linhas) {
    const atual = porTelefone.get(l.telefone);
    if (!atual || l.id > atual.id) porTelefone.set(l.telefone, l);
  }
  return [...porTelefone.values()];
}
