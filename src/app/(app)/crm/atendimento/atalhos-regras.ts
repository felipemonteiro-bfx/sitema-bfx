// Regras puras dos atalhos rápidos do atendimento. Nada aqui envia mensagem:
// inserir só preenche o campo.

/** Busca de estoque: espera o fim da digitação e exige 2 caracteres úteis. */
export const DEBOUNCE_MS = 250;
export const TERMO_MINIMO = 2;

export function termoBuscavel(termo: string): boolean {
  return termo.trim().length >= TERMO_MINIMO;
}

/**
 * Campo vazio (ou só espaço) é preenchido direto. Com texto, quem decide é a
 * pessoa: substituir apaga o que ela digitou. Mesmo texto não perde nada.
 */
export function decidirInsercao(atual: string, novo: string): 'preencher' | 'confirmar' {
  if (!atual.trim() || atual === novo) return 'preencher';
  return 'confirmar';
}

type ComSituacao = { situacao: 'paga' | 'vencida' | 'a_vencer'; dataVencimento: string };

export function contarVencidas(parcelas: readonly ComSituacao[]): number {
  return parcelas.filter((p) => p.situacao === 'vencida').length;
}

/** Menor vencimento entre as a vencer ("YYYY-MM-DD": a ordem do texto é a do calendário). */
export function proximoVencimento(parcelas: readonly ComSituacao[]): string | null {
  const datas = parcelas.filter((p) => p.situacao === 'a_vencer').map((p) => p.dataVencimento.slice(0, 10)).sort();
  return datas[0] ?? null;
}

export const ROTULO_SITUACAO = { paga: 'Paga', vencida: 'Vencida', a_vencer: 'A vencer' } as const;
