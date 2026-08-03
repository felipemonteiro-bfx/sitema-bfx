// Modulo PURO: zero imports, zero alias `@/`. Mesmo padrao de
// `src/lib/cliente-rapido.ts` — e o que permite verificacao local via
// `node --input-type=module` nesta maquina, onde `vitest` nao roda
// (ver `<environment_constraints>` do plano 09-01).
//
// INT-02 / D-02: antes deste modulo, `getDeliveryQuote()` (`src/lib/uber.ts`)
// devolvia o mesmo `null` em TODOS os caminhos de erro (credencial ausente,
// endereco recusado, erro HTTP da Uber, excecao de rede) — indistinguiveis
// para quem chama. Este modulo classifica cada caso em um `MotivoFalhaUber`
// e produz mensagem legivel em pt-BR, sem nunca expor texto livre vindo da
// Uber (T-09-01) nem credencial (T-09-02).

export type MotivoFalhaUber =
  | "sem_credencial" // UBER_DIRECT_CUSTOMER_ID e/ou UBER_DIRECT_TOKEN ausentes
  | "sem_endereco_coleta" // UBER_PICKUP_ADDRESS_JSON ausente ou nao parseavel
  | "endereco_invalido" // a Uber recusou o endereco (HTTP 400/422)
  | "erro_upstream"; // 401/403/429/5xx, corpo incompleto ou falha de rede

export type ResultadoCotacaoUber =
  | { ok: true; quoteId: string; feeCents: number; fee: number; duration: number; currency: string }
  | { ok: false; motivo: MotivoFalhaUber; detalhe: string };

export type EnderecoColeta = {
  street_address: string[];
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

export type EntradaProntidaoUber = {
  customerId?: string | null;
  token?: string | null;
  pickupAddressJson?: string | null;
};

export type ProntidaoUber =
  | { pronto: true; motivo: null; mensagem: string; pickupAddress: EnderecoColeta }
  | { pronto: false; motivo: MotivoFalhaUber; mensagem: string; pickupAddress: null };

// Lista fechada de codigos de erro da Uber que significam endereco recusado.
// Qualquer coisa fora desta lista vira o codigo generico "http_<status>" —
// o `detalhe` nunca pode carregar texto livre vindo da Uber (T-09-01).
export const CODIGOS_ENDERECO_INVALIDO: string[] = [
  "address_undeliverable",
  "address_undeliverable_limited_couriers",
  "invalid_params",
  "pickup_address_invalid",
  "dropoff_address_invalid",
  "unknown_location",
];

export function falhaCotacaoUber(motivo: MotivoFalhaUber, detalhe: string): ResultadoCotacaoUber {
  return { ok: false, motivo, detalhe };
}

type CorpoRespostaUber = {
  id?: unknown;
  fee?: unknown;
  duration?: unknown;
  currency_type?: unknown;
  errors?: unknown;
  code?: unknown;
};

function extrairCodigoErro(corpo: unknown): string | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as CorpoRespostaUber;
  if (Array.isArray(c.errors) && c.errors.length > 0) {
    const primeiro = c.errors[0] as { code?: unknown };
    if (primeiro && typeof primeiro.code === "string") return primeiro.code;
  }
  if (typeof c.code === "string") return c.code;
  return null;
}

export function interpretarRespostaUber(httpStatus: number, corpo: unknown): ResultadoCotacaoUber {
  if (httpStatus === 400 || httpStatus === 422) {
    const codigo = extrairCodigoErro(corpo);
    const detalhe =
      codigo && CODIGOS_ENDERECO_INVALIDO.includes(codigo) ? codigo : "http_" + httpStatus;
    return falhaCotacaoUber("endereco_invalido", detalhe);
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return falhaCotacaoUber("erro_upstream", "credencial_rejeitada_" + httpStatus);
  }

  if (httpStatus === 429) {
    return falhaCotacaoUber("erro_upstream", "limite_de_uso_429");
  }

  if (httpStatus < 200 || httpStatus > 299) {
    return falhaCotacaoUber("erro_upstream", "http_" + httpStatus);
  }

  const c = (corpo && typeof corpo === "object" ? corpo : {}) as CorpoRespostaUber;
  if (typeof c.id === "string" && typeof c.fee === "number") {
    const feeCents = Math.round(c.fee);
    return {
      ok: true,
      quoteId: c.id,
      feeCents,
      fee: feeCents / 100,
      duration: typeof c.duration === "number" ? c.duration : 0,
      currency: typeof c.currency_type === "string" ? c.currency_type : "BRL",
    };
  }

  return falhaCotacaoUber("erro_upstream", "resposta_incompleta");
}

export function interpretarFalhaDeRede(): ResultadoCotacaoUber {
  return falhaCotacaoUber("erro_upstream", "falha_de_rede");
}

export function mensagemFalhaUber(motivo: MotivoFalhaUber): string {
  switch (motivo) {
    case "sem_credencial":
      return "Cotacao indisponivel: as credenciais da Uber nao estao configuradas no servidor. Informe o frete manualmente.";
    case "sem_endereco_coleta":
      return "Cotacao indisponivel: o endereco de coleta da loja nao esta configurado no servidor. Informe o frete manualmente.";
    case "endereco_invalido":
      return "A Uber nao aceitou o endereco de entrega. Confira o endereco do cliente ou informe o frete manualmente.";
    case "erro_upstream":
      return "A Uber nao respondeu a cotacao agora. Tente de novo em instantes ou informe o frete manualmente.";
  }
}

export function statusHttpParaFalhaUber(motivo: MotivoFalhaUber): number {
  switch (motivo) {
    case "sem_credencial":
      return 503;
    case "sem_endereco_coleta":
      return 503;
    case "endereco_invalido":
      return 422;
    case "erro_upstream":
      return 502;
  }
}

function textoOuVazio(valor: string | null | undefined): string {
  return String(valor ?? "").trim();
}

function parseEnderecoColeta(pickupAddressJson: string | null | undefined): EnderecoColeta | null {
  const bruto = textoOuVazio(pickupAddressJson);
  if (!bruto) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(bruto);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<EnderecoColeta>;
  if (!Array.isArray(p.street_address) || p.street_address.length === 0) return null;
  return {
    street_address: p.street_address as string[],
    city: typeof p.city === "string" ? p.city : "",
    state: typeof p.state === "string" ? p.state : "",
    zip_code: typeof p.zip_code === "string" ? p.zip_code : "",
    country: typeof p.country === "string" ? p.country : "",
  };
}

export function classificarProntidaoUber(entrada: EntradaProntidaoUber): ProntidaoUber {
  const customerId = textoOuVazio(entrada.customerId);
  const token = textoOuVazio(entrada.token);

  if (!customerId || !token) {
    return { pronto: false, motivo: "sem_credencial", mensagem: mensagemFalhaUber("sem_credencial"), pickupAddress: null };
  }

  const pickupAddress = parseEnderecoColeta(entrada.pickupAddressJson);
  if (!pickupAddress) {
    return {
      pronto: false,
      motivo: "sem_endereco_coleta",
      mensagem: mensagemFalhaUber("sem_endereco_coleta"),
      pickupAddress: null,
    };
  }

  return { pronto: true, motivo: null, mensagem: "Cotacao Uber disponivel.", pickupAddress };
}
