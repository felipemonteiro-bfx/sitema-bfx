// Funções puras de exibição do atendimento (só layout): nenhuma regra de envio mora aqui.
const FUSO = 'America/Manaus';

export type TiqueMensagem = { tique: 'um' | 'dois' | 'erro'; tom: 'neutro' | 'marca' | 'erro'; rotulo: string };

/**
 * Status gravado na mensagem de saída -> desenho do tique + texto acessível.
 * Os rótulos são os mesmos que a tela já exibia por extenso; o tique só os resume.
 * Status desconhecido nunca vira "entregue": cai em um tique neutro com o texto cru.
 */
export function statusTique(status: string): TiqueMensagem {
  switch (status) {
    case 'pendente': return { tique: 'um', tom: 'neutro', rotulo: 'Pendente de confirmação' };
    case 'enviado': return { tique: 'um', tom: 'neutro', rotulo: 'Aceita pela Meta; entrega não confirmada' };
    case 'entregue': return { tique: 'dois', tom: 'neutro', rotulo: 'Entregue' };
    case 'lido': return { tique: 'dois', tom: 'marca', rotulo: 'Lida' };
    case 'falhou': return { tique: 'erro', tom: 'erro', rotulo: 'Falhou' };
    default: return { tique: 'um', tom: 'neutro', rotulo: status };
  }
}

/** Até duas iniciais; telefone puro (sem letras) vira "#". */
export function iniciais(nome: string): string {
  const letras = nome.split(/\s+/).filter(p => /\p{L}/u.test(p)).slice(0, 2).map(p => (p.match(/\p{L}/u) || [''])[0].toUpperCase());
  return letras.join('') || '#';
}

const chaveDia = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: FUSO });
const diasEntre = (a: Date, b: Date) => Math.round((Date.parse(chaveDia(b)) - Date.parse(chaveDia(a))) / 86_400_000);

/** Hora da linha da lista: hoje HH:mm, ontem, dia da semana (até 6 dias) ou dd/MM. */
export function horaCurta(d: Date, agora: Date = new Date()): string {
  const dias = diasEntre(d, agora);
  if (dias <= 0) return d.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false });
  if (dias === 1) return 'ontem';
  if (dias < 7) return d.toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'short' }).replace('.', '');
  return d.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
}

/** Hora dentro da bolha. */
export function horaBolha(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Separador de dia do histórico. */
export function rotuloDia(d: Date, agora: Date = new Date()): string {
  const dias = diasEntre(d, agora);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  // Até 6 dias atrás: dia da semana abreviado ("seg"), como o separador do WhatsApp Web.
  if (dias > 1 && dias < 7) return d.toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'short' }).replace('.', '');
  return d.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
}

export { chaveDia };

/** Quantas mensagens do cliente chegaram depois da última resposta da BFX (só exibição). */
export function contarNaoRespondidas(entradas: Date[], ultimaSaida: Date | null): number {
  return entradas.filter(e => !ultimaSaida || e.getTime() > ultimaSaida.getTime()).length;
}

/** Número da bolinha da lista: acima de 99 vira "99+". */
export const rotuloContagem = (n: number): string => (n > 99 ? '99+' : String(n));

/** Prévia da última mensagem da conversa (saída leva "Você: "). */
export function previaMensagem(direcao: string, corpo: string): string {
  const limpo = corpo.replace(/\s+/g, ' ').trim();
  const texto = limpo.length > 120 ? limpo.slice(0, 120) + '…' : limpo;
  return direcao === 'out' ? `Você: ${texto}` : texto;
}
