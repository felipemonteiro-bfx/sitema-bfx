/**
 * Limite de tentativas em memória — usado no login (2026-09-11, achado MEDIUM
 * do hook de revisão de segurança).
 *
 * Janela deslizante: guarda o instante de cada falha por chave e descarta o
 * que saiu da janela. Em memória porque o app roda com 1 réplica
 * (`deploy/bfx/app.yaml`); com mais réplicas o limite passa a valer por
 * réplica. `maxChaves` impede que chaves inventadas cresçam o mapa sem fim:
 * passando do teto, sai a chave mexida há mais tempo.
 */

export interface SituacaoLimite {
  bloqueado: boolean;
  /** Segundos até a próxima tentativa ser aceita; 0 quando não está bloqueado. */
  esperarSegundos: number;
}

export interface Limitador {
  situacao(chave: string, agora?: number): SituacaoLimite;
  /** Grava uma falha e devolve o instante gravado — para `desfazerFalha`. */
  registrarFalha(chave: string, agora?: number): number;
  /** Tira só aquele registro (a tentativa que, no fim, deu certo). */
  desfazerFalha(chave: string, instante: number): void;
  limpar(chave: string): void;
  tamanho(): number;
}

export function criarLimitador({
  limite,
  janelaMs,
  maxChaves = 10_000,
}: {
  limite: number;
  janelaMs: number;
  maxChaves?: number;
}): Limitador {
  const falhas = new Map<string, number[]>();

  const recentes = (chave: string, agora: number): number[] => {
    const lista = (falhas.get(chave) ?? []).filter((t) => t > agora - janelaMs);
    if (lista.length === 0) falhas.delete(chave);
    else falhas.set(chave, lista);
    return lista;
  };

  return {
    situacao(chave, agora = Date.now()) {
      const lista = recentes(chave, agora);
      if (lista.length < limite) return { bloqueado: false, esperarSegundos: 0 };
      // Libera quando cair abaixo do limite: quando sair da janela a falha que
      // hoje completa a conta.
      const liberaEm = lista[lista.length - limite] + janelaMs;
      return { bloqueado: true, esperarSegundos: Math.max(1, Math.ceil((liberaEm - agora) / 1000)) };
    },
    registrarFalha(chave, agora = Date.now()) {
      const lista = recentes(chave, agora);
      lista.push(agora);
      // Reinsere no fim: o Map guarda a ordem de inserção, e o começo dele
      // passa a ser a chave mexida há mais tempo.
      falhas.delete(chave);
      falhas.set(chave, lista);
      while (falhas.size > maxChaves) {
        const maisAntiga = falhas.keys().next().value;
        if (maisAntiga === undefined) break;
        falhas.delete(maisAntiga);
      }
      return agora;
    },
    desfazerFalha(chave, instante) {
      const lista = falhas.get(chave);
      if (!lista) return;
      const i = lista.lastIndexOf(instante);
      if (i >= 0) lista.splice(i, 1);
      if (lista.length === 0) falhas.delete(chave);
    },
    limpar(chave) {
      falhas.delete(chave);
    },
    tamanho() {
      return falhas.size;
    },
  };
}
