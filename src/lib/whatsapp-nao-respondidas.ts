import { prisma } from '@/lib/db';
import { contarNaoRespondidas } from '@/app/(app)/crm/atendimento/status-mensagem';

/**
 * Para cada telefone cuja última mensagem é do cliente, quantas mensagens dele chegaram depois da
 * última resposta da BFX (bolinha da lista). Só leitura: duas consultas enxutas para todos os
 * telefones juntos (última saída por telefone + datas das entradas posteriores).
 */
export async function naoRespondidasPorTelefone(telefones: string[]): Promise<Map<string, number>> {
  const r = new Map<string, number>();
  if (!telefones.length) return r;
  const saidas = await prisma.whatsAppMensagem.groupBy({ by: ['telefone'], _max: { criadoEm: true }, where: { telefone: { in: telefones }, direcao: 'out' } });
  const ultimaSaida = new Map(saidas.map(s => [s.telefone, s._max.criadoEm]));
  const entradas = await prisma.whatsAppMensagem.findMany({
    where: { direcao: 'in', OR: telefones.map(t => { const s = ultimaSaida.get(t); return s ? { telefone: t, criadoEm: { gt: s } } : { telefone: t }; }) },
    select: { telefone: true, criadoEm: true },
  });
  for (const t of telefones) r.set(t, contarNaoRespondidas(entradas.filter(e => e.telefone === t).map(e => e.criadoEm), ultimaSaida.get(t) ?? null));
  return r;
}
