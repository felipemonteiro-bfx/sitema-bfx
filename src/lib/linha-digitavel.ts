/**
 * Linha digitável de boleto (padrão FEBRABAN) — decodificação pura, sem banco.
 *
 * Boleto bancário (47 dígitos):
 *   campo 1  AAABC.CCCCX   banco (3) + moeda (1) + campo livre 1–5 + DV módulo 10
 *   campo 2  DDDDD.DDDDDY  campo livre 6–15 + DV módulo 10
 *   campo 3  EEEEE.EEEEEZ  campo livre 16–25 + DV módulo 10
 *   campo 4  K             DV geral do código de barras (módulo 11)
 *   campo 5  UUUUVVVVVVVVVV fator de vencimento (4) + valor em centavos (10)
 * Código de barras (44): banco+moeda (4) + K + fator (4) + valor (10) + campo livre (25).
 *
 * Arrecadação/convênio (48 dígitos, começa com 8): 4 blocos de 11 dígitos do código de barras,
 * cada um seguido do seu DV. O 3º dígito (identificador de valor) escolhe o módulo dos DVs:
 * 6 ou 7 → módulo 10; 8 ou 9 → módulo 11. Com 6 ou 8 o valor é efetivo (posições 5–15 do código
 * de barras); com 7 ou 9 é valor de referência e não é lido. Convênio não traz vencimento.
 */

export type LinhaDecodificada =
  | { ok: true; tipo: "bancario"; linha: string; codigoBarras: string; valor: number | null; vencimento: Date | null }
  | { ok: true; tipo: "arrecadacao"; linha: string; codigoBarras: string; valor: number | null; vencimento: null }
  | { ok: false; erro: string };

const DIA_MS = 86_400_000;
/** Base original do fator de vencimento: fator 0 = 07/10/1997. */
const BASE_FATOR_ANTIGA = Date.UTC(1997, 9, 7);
/** Reinício do fator (fator 1000) depois de esgotar 9999 em 21/02/2025. */
const BASE_FATOR_NOVA = Date.UTC(2025, 1, 22);

export function somenteDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

/** Módulo 10: pesos 2,1,2,1… da direita para a esquerda; produto ≥ 10 soma os dígitos. */
export function modulo10(numero: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    const produto = Number(numero[i]) * peso;
    soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

/** Soma ponderada do módulo 11: pesos 2 a 9 ciclando, da direita para a esquerda. */
function somaModulo11(numero: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += Number(numero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  return soma;
}

/** DV geral do código de barras bancário: 11 − resto; resultado 0, 10 ou 11 → 1. */
export function modulo11Bancario(numero: string): number {
  const dv = 11 - (somaModulo11(numero) % 11);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

/** DV de arrecadação em módulo 11: resto 0 ou 1 → 0; senão 11 − resto. */
export function modulo11Arrecadacao(numero: string): number {
  const resto = somaModulo11(numero) % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

export function codigoBarrasDeLinhaBancaria(linha47: string): string {
  const l = somenteDigitos(linha47);
  if (l.length !== 47) throw new Error("Linha digitável com 47 dígitos esperada.");
  const campoLivre = l.slice(4, 9) + l.slice(10, 20) + l.slice(21, 31);
  return l.slice(0, 4) + l[32] + l.slice(33, 47) + campoLivre;
}

export function linhaBancariaDeCodigoBarras(codigo44: string): string {
  const c = somenteDigitos(codigo44);
  if (c.length !== 44) throw new Error("Código de barras com 44 dígitos esperado.");
  const campoLivre = c.slice(19, 44);
  const campo1 = c.slice(0, 4) + campoLivre.slice(0, 5);
  const campo2 = campoLivre.slice(5, 15);
  const campo3 = campoLivre.slice(15, 25);
  return (
    campo1 + modulo10(campo1) +
    campo2 + modulo10(campo2) +
    campo3 + modulo10(campo3) +
    c[4] +
    c.slice(5, 19)
  );
}

function moduloArrecadacao(idValor: string): ((n: string) => number) | null {
  if (idValor === "6" || idValor === "7") return modulo10;
  if (idValor === "8" || idValor === "9") return modulo11Arrecadacao;
  return null;
}

/** Monta a linha de 48 dígitos a partir do código de barras de arrecadação (usada nos testes). */
export function linhaArrecadacaoDeCodigoBarras(codigo44: string): string {
  const c = somenteDigitos(codigo44);
  if (c.length !== 44) throw new Error("Código de barras com 44 dígitos esperado.");
  const dv = moduloArrecadacao(c[2]);
  if (!dv) throw new Error("Identificador de valor do convênio inválido (3º dígito deve ser 6, 7, 8 ou 9).");
  let linha = "";
  for (let b = 0; b < 4; b++) {
    const bloco = c.slice(b * 11, b * 11 + 11);
    linha += bloco + dv(bloco);
  }
  return linha;
}

/**
 * Fator de vencimento → data pura (meia-noite UTC). O fator reiniciou em 1000 no dia 22/02/2025,
 * então o mesmo fator tem dois candidatos; vale o mais próximo da data de referência.
 */
function vencimentoDoFator(fator: number, referencia: Date): Date | null {
  if (fator === 0) return null;
  const candidatos = [BASE_FATOR_ANTIGA + fator * DIA_MS];
  if (fator >= 1000) candidatos.push(BASE_FATOR_NOVA + (fator - 1000) * DIA_MS);
  const ref = Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate());
  let escolhido = candidatos[0];
  for (const c of candidatos) {
    // empate (improvável: candidatos distam 9000 dias) fica com o mais novo
    if (Math.abs(c - ref) <= Math.abs(escolhido - ref)) escolhido = c;
  }
  return new Date(escolhido);
}

function decodificarBancaria(linha: string, referencia: Date): LinhaDecodificada {
  const campos: [string, string][] = [
    [linha.slice(0, 9), linha[9]],
    [linha.slice(10, 20), linha[20]],
    [linha.slice(21, 31), linha[31]],
  ];
  for (let i = 0; i < campos.length; i++) {
    const [corpo, dv] = campos[i];
    if (modulo10(corpo) !== Number(dv)) {
      return { ok: false, erro: `Dígito verificador do campo ${i + 1} não confere.` };
    }
  }
  const codigoBarras = codigoBarrasDeLinhaBancaria(linha);
  const semDv = codigoBarras.slice(0, 4) + codigoBarras.slice(5);
  if (modulo11Bancario(semDv) !== Number(codigoBarras[4])) {
    return { ok: false, erro: "Dígito verificador geral não confere." };
  }
  const centavos = Number(codigoBarras.slice(9, 19));
  return {
    ok: true,
    tipo: "bancario",
    linha,
    codigoBarras,
    valor: centavos === 0 ? null : centavos / 100,
    vencimento: vencimentoDoFator(Number(codigoBarras.slice(5, 9)), referencia),
  };
}

function decodificarArrecadacao(linha: string): LinhaDecodificada {
  if (linha[0] !== "8") {
    return { ok: false, erro: "Linha de 48 dígitos é de convênio e deve começar com 8." };
  }
  const idValor = linha[2];
  const dv = moduloArrecadacao(idValor);
  if (!dv) {
    return { ok: false, erro: "Identificador de valor do convênio inválido (3º dígito deve ser 6, 7, 8 ou 9)." };
  }
  let codigoBarras = "";
  for (let b = 0; b < 4; b++) {
    const bloco = linha.slice(b * 12, b * 12 + 11);
    if (dv(bloco) !== Number(linha[b * 12 + 11])) {
      return { ok: false, erro: `Dígito verificador do bloco ${b + 1} não confere.` };
    }
    codigoBarras += bloco;
  }
  const semDvGeral = codigoBarras.slice(0, 3) + codigoBarras.slice(4);
  if (dv(semDvGeral) !== Number(codigoBarras[3])) {
    return { ok: false, erro: "Dígito verificador geral não confere." };
  }
  const efetivo = idValor === "6" || idValor === "8";
  const centavos = Number(codigoBarras.slice(4, 15));
  return {
    ok: true,
    tipo: "arrecadacao",
    linha,
    codigoBarras,
    valor: efetivo && centavos > 0 ? centavos / 100 : null,
    vencimento: null,
  };
}

export function decodificarLinhaDigitavel(entrada: string, referencia: Date = new Date()): LinhaDecodificada {
  const linha = somenteDigitos(entrada);
  if (linha.length === 47) return decodificarBancaria(linha, referencia);
  if (linha.length === 48) return decodificarArrecadacao(linha);
  return { ok: false, erro: "Linha digitável deve ter 47 (boleto) ou 48 (convênio) dígitos." };
}
