// SEM import de node: — este e' o unico modulo de senha que um componente
// 'use client' pode importar (D-03). gerarSenhaForte roda no browser via
// globalThis.crypto.getRandomValues.

export const TAMANHO_MINIMO_SENHA = 8;

export type ResultadoPolitica = { ok: true } | { ok: false; erro: string };

/**
 * Regra explicita de D-03: so tamanho minimo, sem biblioteca de politica de senha.
 *
 * Mede a senha JA APARADA porque e' isso que `hashSenha` grava — validar o valor
 * cru deixava "        a" (8 espacos + 1 letra) passar como 9 caracteres e virar
 * um hash de 1 caractere.
 */
export function validarForcaMinima(nova: string): ResultadoPolitica {
  const efetiva = (nova ?? "").trim();
  if (efetiva.length < TAMANHO_MINIMO_SENHA) {
    return {
      ok: false,
      erro: `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
    };
  }
  return { ok: true };
}

export function validarTrocaDeSenha(params: {
  nova: string;
  confirmacao: string;
  igualAtual: boolean;
}): ResultadoPolitica {
  const { nova, confirmacao, igualAtual } = params;

  const forca = validarForcaMinima(nova);
  if (!forca.ok) return forca;

  // Comparadas aparadas pelo mesmo motivo: duas entradas que diferem so por
  // espaco nas pontas produzem o mesmo hash, entao recusa-las seria mentir.
  if ((nova ?? "").trim() !== (confirmacao ?? "").trim()) {
    return { ok: false, erro: "A confirmação não confere com a nova senha." };
  }

  if (igualAtual) {
    return { ok: false, erro: "A nova senha não pode ser igual à senha atual." };
  }

  return { ok: true };
}

// Maiusculas, minusculas, digitos e simbolos seguros para copiar/colar, sem
// os caracteres ambiguos 0 O o l 1 I.
const ALFABETO_SENHA_FORTE =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*+=";

/**
 * Sorteia uma senha forte com globalThis.crypto.getRandomValues (sem
 * Math.random, sem regex). Usa amostragem por rejeicao: descarta valores
 * acima do maior multiplo do tamanho do alfabeto que cabe em 32 bits, para
 * nao enviesar a distribuicao dos caracteres sorteados.
 */
export function gerarSenhaForte(tamanho = 16): string {
  const alfabeto = ALFABETO_SENHA_FORTE;
  const tamanhoAlfabeto = alfabeto.length;
  const limite = Math.floor(0x100000000 / tamanhoAlfabeto) * tamanhoAlfabeto;

  const resultado: string[] = [];
  while (resultado.length < tamanho) {
    const restante = tamanho - resultado.length;
    const sorteio = new Uint32Array(restante);
    globalThis.crypto.getRandomValues(sorteio);
    for (const valor of sorteio) {
      if (valor >= limite) continue;
      resultado.push(alfabeto[valor % tamanhoAlfabeto]);
      if (resultado.length === tamanho) break;
    }
  }
  return resultado.join("");
}
