import { iconePrevia, rotuloPrevia, type TipoMidia } from '@/lib/whatsapp-midia-politica';

const TIPOS: readonly string[] = ['audio', 'imagem', 'video', 'figurinha', 'documento'];

export type PreviaMidia = { icone: string; rotulo: string; legenda: string };

/**
 * Prévia da lista quando a última mensagem é mídia: nome do ícone lucide, rótulo e legenda.
 * O corpo guardado é o placeholder `[Foto] legenda`; aqui ele é desmontado para a lista nunca
 * mostrar o `[Foto]` cru nem emoji. `null` para texto (ou tipo desconhecido).
 */
export function previaDeMidia(tipo: string | null | undefined, corpo: string): PreviaMidia | null {
  if (!tipo || !TIPOS.includes(tipo)) return null;
  const t = tipo as TipoMidia;
  const rotulo = rotuloPrevia(t);
  const marca = `[${rotulo}]`;
  const limpo = corpo.replace(/\s+/g, ' ').trim();
  const legenda = limpo.startsWith(marca) ? limpo.slice(marca.length).trim() : '';
  return { icone: iconePrevia(t), rotulo, legenda: legenda.length > 120 ? legenda.slice(0, 120) + '…' : legenda };
}
