/**
 * Formatação de DATA PURA — data da venda, vencimento de parcela, data de compra.
 *
 * Esses campos não têm hora significativa: sao gravados com `new Date("YYYY-MM-DD")`,
 * que por spec do JS e meia-noite UTC. Formata-los em `America/Manaus` (UTC-4)
 * devolve 20h do DIA ANTERIOR — a venda de 02/07 aparecia como 01/07, a de 18/06
 * como 17/06. Alem de exibir errado, isso fazia o filtro de periodo parecer
 * quebrado: uma venda de 01/08 aparecia como 31/07, "fora do periodo" que o
 * usuario acabara de pedir.
 *
 * Por isso data pura se formata em UTC — le-se o mesmo dia que foi gravado.
 *
 * NAO use isto para timestamp de verdade (criadaEm, dataHora de auditoria, enviadoEm):
 * ali a hora importa e o fuso do usuario e' o certo.
 */

const FUSO_DATA_PURA = "UTC";

function paraDate(valor: Date | string | null | undefined): Date | null {
  if (valor == null) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "02/07/2026". Devolve "—" quando a data e ausente ou ilegivel. */
export function formatarDataPura(valor: Date | string | null | undefined): string {
  const d = paraDate(valor);
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_DATA_PURA }).format(d);
}

/** Fuso onde a operacao acontece: e o "hoje" de quem usa o sistema. */
const FUSO_OPERACAO = "America/Manaus";

/**
 * Hoje como data pura "YYYY-MM-DD" — o dia civil em Manaus, pronto para comparar
 * com vencimento gravado a meia-noite UTC. Usar o dia UTC do servidor viraria o
 * dia as 20h de Manaus: uma parcela que vence hoje passaria a "vencida" antes da hora.
 */
export function hojeDataPura(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_OPERACAO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

/** "ago. de 2026" — usado nos rotulos de periodo. */
export function formatarMesAnoPuro(valor: Date | string | null | undefined): string {
  const d = paraDate(valor);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: FUSO_DATA_PURA,
  });
}
