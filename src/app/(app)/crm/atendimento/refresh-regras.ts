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
