// Regras puras da pausa do refresh de 30s (nada aqui envia nem grava dados).

/** Editor do "Organizar atendimento" com alteração ainda não salva. Só ele pausa o refresh. */
export const SELETOR_EDICAO_PENDENTE = '[data-kanban-editor][data-sujo="true"]';

export type CamposOrganizar = { etapa: string; responsavel: string; acao: string };

/** O formulário está "sujo" quando algum campo difere do que está salvo no cartão. */
export function formularioSujo(atual: CamposOrganizar, original: CamposOrganizar): boolean {
  return atual.etapa !== original.etapa || atual.responsavel !== original.responsavel || atual.acao !== original.acao;
}

/** Há edição não salva na tela? (o formulário aberto, mas sem alteração, NÃO pausa o refresh) */
export function edicaoPendente(doc: { querySelector: (seletor: string) => unknown }): boolean {
  return !!doc.querySelector(SELETOR_EDICAO_PENDENTE);
}

/** Clique ou foco fora do painel com edição não salva: não fecha (o `onInteractOutside` do Radix aceita `preventDefault`). */
export function impedirFecharComEdicao(evento: { preventDefault: () => void }, doc: { querySelector: (seletor: string) => unknown }): void {
  if (edicaoPendente(doc)) evento.preventDefault();
}

export const AVISO_EDICAO_PENDENTE = 'Salve ou cancele as alterações antes de fechar.';

/** Abrir outro cartão com edição não salva no atual descarta a edição: só passa para o mesmo cartão, sem aberto ou com formulário limpo. */
export function podeTrocarCartao(doc: { querySelector: (seletor: string) => unknown }, atual: string | null, novo: string): boolean {
  return atual === null || atual === novo || !edicaoPendente(doc);
}

type CartaoAlteravel = { revisao: number; classificado: boolean; estado: unknown };
export type AlteracaoCartao<E> = { revisao: number; estado: E };

/** Cartão salvo localmente (Sheet ou arrasto) vale enquanto o servidor ainda manda uma revisão mais antiga. */
export function aplicarAlteracao<C extends CartaoAlteravel>(cartao: C, alteracao: AlteracaoCartao<C['estado']> | undefined): C {
  return alteracao && alteracao.revisao > cartao.revisao ? { ...cartao, revisao: alteracao.revisao, classificado: true, estado: alteracao.estado } : cartao;
}
