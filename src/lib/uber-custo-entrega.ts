// Modulo PURO: zero imports, zero alias `@/`. Mesmo padrao de
// `src/lib/uber-quote-result.ts` — permite verificacao local via
// `node --input-type=module` nesta maquina, onde `vitest` nao roda
// (ver `<environment_constraints>` do plano 260810-f21).
//
// QK-F21-01/QK-F21-02: este modulo le `full_fee` do Get Delivery Status da
// Uber (custo REAL, nao cotacao) e converte para o formato que
// `Venda.custoEnvio` espera. `full_fee.total` vem em MINOR CURRENCY UNITS
// (centavos) — um erro de conversao aqui corrompe o DRE inteiro (T-F21-02).
// Nenhum texto livre vindo da Uber (mensagem de erro, fee_code) pode
// atravessar para o navegador (T-F21-07).

export type MotivoFalhaCustoUber =
  | "sem_credencial"
  | "delivery_id_invalido"
  | "nao_encontrado"
  | "moeda_inesperada"
  | "resposta_incompleta"
  | "erro_upstream";

export type LinhaCustoUber = {
  codigo: string;
  categoria: string;
  centavos: number;
  valor: number;
};

export type ResultadoCustoEntregaUber =
  | {
      ok: true;
      deliveryId: string;
      status: string;
      totalCentavos: number;
      total: number;
      moeda: string;
      linhas: LinhaCustoUber[];
      /** true so quando o status da entrega e final ("delivered") — antes disso o custo (ex.: BUSY_AREA_FEE) e provisorio. */
      definitivo: boolean;
    }
  | { ok: false; motivo: MotivoFalhaCustoUber; detalhe: string };

/**
 * Converte centavos (minor currency units, como a Uber devolve `full_fee.total`)
 * para reais. So aceita inteiro finito >= 0 — dinheiro invalido nunca vira
 * numero gravavel (T-F21-02).
 */
export function converterCentavosParaReais(centavos: unknown): number | null {
  if (typeof centavos !== "number") return null;
  if (!Number.isFinite(centavos)) return null;
  if (!Number.isInteger(centavos)) return null;
  if (centavos < 0) return null;
  return centavos / 100;
}

const REGEX_CODIGO_TAXA_UBER = /[^A-Z_]/g;
const TAMANHO_MAX_CODIGO_TAXA = 40;

/**
 * Normaliza um `fee_code`/`category` vindo da Uber para uma lista fechada de
 * caracteres (maiusculas e underscore). E o que impede texto livre da Uber
 * (por exemplo um endereco) de atravessar para o navegador (T-F21-07).
 * Nunca usa `.exec()` — so `.replace()` com regex global.
 */
export function normalizarCodigoTaxaUber(valor: unknown): string {
  const texto = typeof valor === "string" ? valor : "";
  const limpo = texto.toUpperCase().replace(REGEX_CODIGO_TAXA_UBER, "").slice(0, TAMANHO_MAX_CODIGO_TAXA);
  return limpo || "DESCONHECIDO";
}

const REGEX_DELIVERY_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Valida um delivery id por lista de caracteres permitidos antes dele ser
 * concatenado numa URL (T-F21-09). Nunca usa `.exec()` — so `.test()`.
 */
export function deliveryIdValido(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return REGEX_DELIVERY_ID.test(id);
}

type CorpoCustoUber = {
  id?: unknown;
  status?: unknown;
  full_fee?: unknown;
  data?: unknown;
};

type FullFeeUber = {
  total?: unknown;
  currency_code?: unknown;
  line_items?: unknown;
};

function extrairEnvelope(corpo: unknown): CorpoCustoUber | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as CorpoCustoUber;
  if (c.full_fee && typeof c.full_fee === "object") return c;
  if (c.data && typeof c.data === "object") {
    const d = c.data as CorpoCustoUber;
    if (d.full_fee && typeof d.full_fee === "object") return d;
  }
  return null;
}

function falha(motivo: MotivoFalhaCustoUber, detalhe: string): ResultadoCustoEntregaUber {
  return { ok: false, motivo, detalhe };
}

/**
 * Interpreta a resposta do Get Delivery Status da Uber. Mapeia o status HTTP
 * para o motivo antes de olhar o corpo; procura `full_fee` na raiz e, se nao
 * achar, dentro de `data`; exige moeda ausente ou "BRL"; converte total e
 * cada line item por `converterCentavosParaReais`, descartando os invalidos.
 */
export function interpretarCustoEntregaUber(httpStatus: number, corpo: unknown): ResultadoCustoEntregaUber {
  if (httpStatus === 404) return falha("nao_encontrado", "http_404");
  if (httpStatus === 401 || httpStatus === 403) return falha("erro_upstream", "credencial_rejeitada_" + httpStatus);
  if (httpStatus === 429) return falha("erro_upstream", "limite_de_uso_429");
  if (httpStatus < 200 || httpStatus > 299) return falha("erro_upstream", "http_" + httpStatus);

  const envelope = extrairEnvelope(corpo);
  if (!envelope) return falha("resposta_incompleta", "sem_full_fee");

  const fullFee = envelope.full_fee as FullFeeUber;
  const moeda = typeof fullFee.currency_code === "string" && fullFee.currency_code ? fullFee.currency_code : "BRL";
  if (moeda !== "BRL") return falha("moeda_inesperada", moeda);

  const total = converterCentavosParaReais(fullFee.total);
  if (total === null) return falha("resposta_incompleta", "total_invalido");

  const linhasBrutas = Array.isArray(fullFee.line_items) ? fullFee.line_items : [];
  const linhas: LinhaCustoUber[] = [];
  for (const item of linhasBrutas) {
    if (!item || typeof item !== "object") continue;
    const li = item as { fee_code?: unknown; category?: unknown; amount?: unknown };
    const valor = converterCentavosParaReais(li.amount);
    if (valor === null) continue;
    linhas.push({
      codigo: normalizarCodigoTaxaUber(li.fee_code),
      categoria: normalizarCodigoTaxaUber(li.category),
      centavos: Math.round(li.amount as number),
      valor,
    });
  }

  const status = typeof envelope.status === "string" ? envelope.status : "";

  return {
    ok: true,
    deliveryId: typeof envelope.id === "string" ? envelope.id : "",
    status,
    totalCentavos: Math.round(fullFee.total as number),
    total,
    moeda,
    linhas,
    definitivo: custoEntregaDefinitivo(status),
  };
}

/** Status final de entrega concluida — o unico em que o custo deixa de ser provisorio. */
const STATUS_ENTREGA_FINAL = "delivered";

/**
 * `true` so quando a entrega ja concluiu ("delivered"). Antes disso,
 * BUSY_AREA_FEE e outras taxas dinamicas ainda podem mudar — o custo lido e
 * provisorio e precisa ser reconciliado depois (T-F21-04).
 */
export function custoEntregaDefinitivo(status: unknown): boolean {
  if (typeof status !== "string") return false;
  return status.toLowerCase() === STATUS_ENTREGA_FINAL;
}

/**
 * Decide se um novo custo de entrega pode ser gravado sobre o que ja existe
 * na venda. Regra de ouro: valor que nao veio desta integracao (fonte nula
 * com custo maior que zero) foi digitado a mao e nunca e sobrescrito
 * (T-F21-04). Um custo ja definitivo ("uber_final") tambem nunca e rebaixado
 * por um valor provisorio.
 */
export type DecisaoGravacaoCustoEnvio =
  | { gravar: true; fonteResultante: "uber_provisorio" | "uber_final" }
  | {
      gravar: false;
      motivo: "custo_manual_preservado" | "custo_final_ja_gravado";
      httpStatus: number;
    };

export function decidirGravacaoCustoEnvio(params: {
  custoEnvioAtual: unknown;
  fonteAtual: unknown;
  novoCusto: number;
  novoDefinitivo: boolean;
}): DecisaoGravacaoCustoEnvio {
  const custoAtualNum = typeof params.custoEnvioAtual === "number" ? params.custoEnvioAtual : 0;
  const fonte = typeof params.fonteAtual === "string" ? params.fonteAtual : null;

  // Fonte nula com custo > 0: nunca passou por esta integracao — foi digitado a mao.
  if (fonte === null && custoAtualNum > 0) {
    return { gravar: false, motivo: "custo_manual_preservado", httpStatus: 409 };
  }

  // Ja definitivo: um valor provisorio novo nunca rebaixa o que ja foi reconciliado.
  if (fonte === "uber_final" && !params.novoDefinitivo) {
    return { gravar: false, motivo: "custo_final_ja_gravado", httpStatus: 409 };
  }

  return { gravar: true, fonteResultante: params.novoDefinitivo ? "uber_final" : "uber_provisorio" };
}

/** Status HTTP a devolver ao navegador para cada motivo de falha. */
export function statusHttpParaFalhaCustoUber(motivo: MotivoFalhaCustoUber): number {
  switch (motivo) {
    case "sem_credencial":
      return 503;
    case "delivery_id_invalido":
      return 400;
    case "nao_encontrado":
      return 404;
    case "moeda_inesperada":
      return 422;
    case "resposta_incompleta":
      return 502;
    case "erro_upstream":
      return 502;
  }
}

/** Mensagem em pt-BR para o operador — nunca texto vindo da Uber, nunca credencial (T-F21-07/T-F21-08). */
export function mensagemFalhaCustoUber(motivo: MotivoFalhaCustoUber): string {
  switch (motivo) {
    case "sem_credencial":
      return "Captura de custo indisponivel: as credenciais da Uber nao estao configuradas no servidor.";
    case "delivery_id_invalido":
      return "Delivery id invalido. Confira o valor copiado do painel da Uber.";
    case "nao_encontrado":
      return "Entrega nao encontrada na Uber para o delivery id informado.";
    case "moeda_inesperada":
      return "A Uber devolveu o custo em moeda diferente de reais. O valor nao foi gravado.";
    case "resposta_incompleta":
      return "A Uber nao devolveu o custo da entrega. Tente novamente em instantes.";
    case "erro_upstream":
      return "A Uber nao respondeu a captura de custo agora. Tente de novo em instantes.";
  }
}
