/**
 * Regras por empresa conveniada e por período (spec 2026-09-30 §3.1): dia de corte, dia de
 * vencimento das parcelas, dia do Pix do fechamento, repasse e a chave do fluxo novo de cobrança.
 * Puro — a leitura do banco está em `@/lib/regra-empresa-db`.
 *
 * `REGRA_PADRAO` reproduz o que o código fazia antes (corte 20, vencimento dia 10): empresa sem
 * regra cadastrada não muda de comportamento.
 */
export type RegraVencimento = { diaCorte: number; diaVencimento: number };
export type RegraEmpresaDados = RegraVencimento & {
  diaPix: number;
  repassePct: number | null;
  repasseBase: "venda" | null;
  cobrancaViaBfx: boolean;
};
export type RegraComVigencia = RegraEmpresaDados & { id?: number; vigenteDe: Date; vigenteAte: Date | null };

export const REGRA_PADRAO: RegraEmpresaDados = Object.freeze({
  diaCorte: 20,
  diaVencimento: 10,
  diaPix: 15,
  repassePct: null,
  repasseBase: null,
  cobrancaViaBfx: false,
}) as RegraEmpresaDados;

function contem(r: Pick<RegraComVigencia, "vigenteDe" | "vigenteAte">, t: number): boolean {
  return r.vigenteDe.getTime() <= t && (r.vigenteAte === null || t < r.vigenteAte.getTime());
}

export function regraVigente(regras: RegraComVigencia[], data: Date): RegraEmpresaDados {
  const t = data.getTime();
  const r = regras.find((x) => contem(x, t));
  if (!r) return { ...REGRA_PADRAO };
  return {
    diaCorte: r.diaCorte,
    diaVencimento: r.diaVencimento,
    diaPix: r.diaPix,
    repassePct: r.repassePct,
    repasseBase: r.repasseBase,
    cobrancaViaBfx: r.cobrancaViaBfx,
  };
}

export function vigenciasSobrepostas(
  regras: Pick<RegraComVigencia, "id" | "vigenteDe" | "vigenteAte">[]
): [number, number] | null {
  const fim = (r: { vigenteAte: Date | null }) => (r.vigenteAte ? r.vigenteAte.getTime() : Infinity);
  for (let i = 0; i < regras.length; i++) {
    for (let j = i + 1; j < regras.length; j++) {
      const a = regras[i];
      const b = regras[j];
      if (a.vigenteDe.getTime() < fim(b) && b.vigenteDe.getTime() < fim(a)) return [i, j];
    }
  }
  return null;
}

function dataPura(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  const partes = s.split("-");
  if (partes.length !== 3 || partes[0].length !== 4) return null;
  const [a, m, dd] = partes.map(Number);
  if (!a || !m || !dd) return null;
  const d = new Date(Date.UTC(a, m - 1, dd));
  return d.getUTCMonth() === m - 1 && d.getUTCDate() === dd ? d : null;
}

function dia(v: unknown): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : null;
}

export function validarRegra(
  input: Record<string, unknown>
): { ok: true; valor: Omit<RegraComVigencia, "id"> } | { ok: false; erro: string } {
  const vigenteDe = dataPura(input.vigenteDe);
  if (!vigenteDe) return { ok: false, erro: "Início da vigência inválido." };
  const ateTxt = String(input.vigenteAte ?? "").trim();
  const vigenteAte = ateTxt ? dataPura(ateTxt) : null;
  if (ateTxt && !vigenteAte) return { ok: false, erro: "Fim da vigência inválido." };
  if (vigenteAte && vigenteAte.getTime() <= vigenteDe.getTime()) {
    return { ok: false, erro: "O fim da vigência deve ser depois do início." };
  }
  const diaCorte = dia(input.diaCorte);
  if (diaCorte === null) return { ok: false, erro: "Dia de corte deve ser entre 1 e 28." };
  const diaVencimento = dia(input.diaVencimento);
  if (diaVencimento === null) return { ok: false, erro: "Dia de vencimento deve ser entre 1 e 28." };
  const diaPix = dia(input.diaPix);
  if (diaPix === null) return { ok: false, erro: "Dia do Pix deve ser entre 1 e 28." };
  const pctTxt = String(input.repassePct ?? "").trim().replace(",", ".");
  let repassePct: number | null = null;
  if (pctTxt) {
    const n = Number(pctTxt);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, erro: "Repasse deve ser entre 0 e 100%." };
    repassePct = n;
  }
  const flag = String(input.cobrancaViaBfx ?? "").trim().toLowerCase();
  return {
    ok: true,
    valor: {
      vigenteDe,
      vigenteAte,
      diaCorte,
      diaVencimento,
      diaPix,
      repassePct,
      repasseBase: repassePct === null ? null : "venda",
      cobrancaViaBfx: flag === "on" || flag === "true" || flag === "1",
    },
  };
}
