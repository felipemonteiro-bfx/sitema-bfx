// Regras puras de layout do atendimento (painel de dados, celular, rolagem).

/** Painel de dados do contato: fechado por padrão em TODAS as larguras; só ?painel=1 abre (clique no nome/avatar). */
export function painelAberto(param: string | null | undefined): boolean {
  return param === '1';
}

/** Valor de ?painel= depois de alternar. */
export function proximoPainel(param: string | null | undefined): '0' | '1' {
  return painelAberto(param) ? '0' : '1';
}

/** Celular: com telefone escolhido na URL mostra o chat; sem, a lista (como o app do WhatsApp). */
export function visaoMobile(telefoneExplicito: boolean): 'chat' | 'lista' {
  return telefoneExplicito ? 'chat' : 'lista';
}

/** Rolagem "colada no fim": 80px de folga contam como estar no fim. */
export function estaNoFim(scrollHeight: number, scrollTop: number, clientHeight: number): boolean {
  return scrollHeight - scrollTop - clientHeight < 80;
}
