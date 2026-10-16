// Regras puras do composer (só interação de digitação; nada aqui envia mensagem).

// Textos das respostas prontas: os mesmos de sempre. Escolher um SÓ preenche o campo.
export const PRONTAS = [
  { titulo: 'Boas-vindas', texto: 'Olá! Seja bem-vindo à BFX. Como posso ajudar você hoje?' },
  { titulo: 'Pedir modelo', texto: 'Qual produto, modelo e quantidade você procura? Vou conferir o estoque e as condições disponíveis.' },
  { titulo: 'Pedido / entrega', texto: 'Pode informar o número do pedido e o que precisa verificar sobre a entrega ou o pós-venda?' },
  { titulo: 'Conferir pagamento', texto: 'Recebemos sua mensagem sobre pagamento. Vamos conferir o comprovante e a baixa no sistema antes de confirmar a quitação.' },
  { titulo: 'Atendimento humano', texto: 'Olá! Sou da equipe BFX e vou continuar seu atendimento por aqui.' },
  { titulo: 'Encerrar atendimento', texto: 'Obrigado pelo contato com a BFX! Se precisar de mais alguma coisa, estamos à disposição.' },
] as const;
export type Pronta = (typeof PRONTAS)[number];

type Tecla = { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number };

/** Enter envia; Shift+Enter quebra linha; Enter durante composição (IME) nunca envia. */
export function acaoDaTecla(e: Tecla): 'enviar' | 'nada' {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return 'nada';
  return 'enviar';
}

/** "/" no início do campo (sem espaço depois) abre as respostas prontas; devolve o termo digitado. */
export function termoDeBarra(texto: string): string | null {
  return /^\/\S*$/.test(texto) ? texto.slice(1) : null;
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra por título ou texto, sem acento e sem diferenciar caixa. */
export function filtrarProntas<T extends { titulo: string; texto: string }>(lista: readonly T[], termo: string): T[] {
  const t = norm(termo.trim());
  return t ? lista.filter(p => norm(p.titulo).includes(t) || norm(p.texto).includes(t)) : [...lista];
}
