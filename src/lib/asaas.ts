/**
 * Integração com API Asaas para geração de boleto.
 * Documentação: https://docs.asaas.com/reference/criar-nova-cobranca
 */

const ASAAS_BASE_SANDBOX = "https://api-sandbox.asaas.com";
const ASAAS_BASE_PRODUCTION = "https://api.asaas.com";

export type AsaasConfig = {
  baseUrl: string;
  apiKey: string;
};

/** dbConfig: opcional, de Config (asaasApiKey, asaasEnv). Se ausente, usa ASAAS_API_KEY e ASAAS_ENV do env. */
export function getAsaasConfig(
  dbConfig?: { asaasApiKey?: string | null; asaasEnv?: string | null }
): AsaasConfig | null {
  const apiKey =
    (dbConfig?.asaasApiKey?.trim() || process.env.ASAAS_API_KEY?.trim()) ?? "";
  if (!apiKey) return null;
  const env =
    (dbConfig?.asaasEnv?.toLowerCase() || process.env.ASAAS_ENV?.toLowerCase()) ?? "";
  const baseUrl =
    env === "production" ? ASAAS_BASE_PRODUCTION : ASAAS_BASE_SANDBOX;
  return { baseUrl, apiKey };
}

function onlyNumbers(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.replace(/\D/g, "");
}

/** Cliente do Prisma com campos usados para criar/identificar no Asaas */
export type ClienteForAsaas = {
  id: number;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  asaasCustomerId: string | null;
};

export type CreateBoletoParams = {
  customerId: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  installmentCount?: number;
  totalValue?: number;
  installmentValue?: number;
  description?: string;
  externalReference?: string;
};

export type CreateBoletoResult = {
  id: string;
  bankSlipUrl: string;
};

/** Cobrança retornada pela API de listagem do Asaas */
export type AsaasPaymentListItem = {
  id: string;
  value: number;
  dueDate: string;
  status: string;
  customer?: string;
  description?: string;
  bankSlipUrl?: string;
  externalReference?: string;
  paymentDate?: string;
};

type AsaasPaymentsListResponse = {
  data?: AsaasPaymentListItem[];
  totalCount?: number;
  limit?: number;
  offset?: number;
};

/** Lista cobranças do Asaas com filtros. */
export async function listPayments(config: AsaasConfig, params: {
  billingType?: "BOLETO" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "UNDEFINED";
  status?: "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE" | "RECEIVED_IN_CASH" | "REFUNDED" | "RECEIVED_IN_CASH_UNDONE";
  limit?: number;
  offset?: number;
}): Promise<{ data: AsaasPaymentListItem[]; totalCount: number }> {
  const qs = new URLSearchParams();
  if (params.billingType) qs.set("billingType", params.billingType);
  if (params.status) qs.set("status", params.status);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const query = qs.toString();
  const path = `/v3/payments${query ? `?${query}` : ""}`;
  const res = await asaasFetch<AsaasPaymentsListResponse>(config, path);
  return {
    data: res.data || [],
    totalCount: res.totalCount ?? 0,
  };
}

/**
 * Todas as cobranças de um filtro, paginando pelo `hasMore` do Asaas. A tela de
 * boletos usava só a primeira página (100) e os totais saíam truncados.
 * `teto` limita a varredura.
 */
export async function listAllPayments(
  config: AsaasConfig,
  params: Omit<Parameters<typeof listPayments>[1], "limit" | "offset">,
  teto = 2000
): Promise<AsaasPaymentListItem[]> {
  const todas: AsaasPaymentListItem[] = [];
  for (let offset = 0; offset < teto; ) {
    const qs = new URLSearchParams({ limit: "100", offset: String(offset) });
    if (params.billingType) qs.set("billingType", params.billingType);
    if (params.status) qs.set("status", params.status);
    const res = await asaasFetch<AsaasPaymentsListResponse & { hasMore?: boolean }>(config, `/v3/payments?${qs}`);
    const pagina = res.data ?? [];
    todas.push(...pagina);
    if (!res.hasMore || pagina.length === 0) break;
    offset += pagina.length;
  }
  return todas.slice(0, teto);
}

/** Cobrança com os campos que a baixa de parcela usa (`src/lib/baixa-parcelas.ts`). */
export type AsaasPagamentoDetalhe = {
  id: string;
  status: string;
  /** Valor bruto da cobrança (o que o pagador pagou) — o recebimento do fechamento usa. */
  value?: number | null;
  externalReference?: string | null;
  installment?: string | null;
  installmentNumber?: number | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  deleted?: boolean | null;
};

/** Cobrança atual no Asaas — fonte da verdade da baixa (o evento do webhook é só gatilho). */
export async function getPayment(config: AsaasConfig, id: string): Promise<AsaasPagamentoDetalhe> {
  return asaasFetch<AsaasPagamentoDetalhe>(config, `/v3/payments/${encodeURIComponent(id)}`);
}

/**
 * Todas as cobranças de uma venda (`externalReference = venda.id`), paginando de 100 em 100.
 * O parcelamento de boleto gera uma cobrança por parcela com a mesma referência.
 */
export async function listPaymentsDaVenda(config: AsaasConfig, vendaId: number): Promise<AsaasPagamentoDetalhe[]> {
  const todas: AsaasPagamentoDetalhe[] = [];
  for (let offset = 0; offset <= 1000; ) {
    const qs = new URLSearchParams({ externalReference: String(vendaId), limit: "100", offset: String(offset) });
    const res = await asaasFetch<{ data?: AsaasPagamentoDetalhe[]; hasMore?: boolean }>(config, `/v3/payments?${qs}`);
    const pagina = res.data ?? [];
    todas.push(...pagina);
    if (!res.hasMore || pagina.length === 0) break;
    offset += pagina.length;
  }
  return todas;
}

type AsaasCustomerResponse = {
  id: string;
  name?: string;
  cpfCnpj?: string;
};

type AsaasCustomersListResponse = {
  data?: AsaasCustomerResponse[];
  totalCount?: number;
};

type AsaasPaymentResponse = {
  id: string;
  bankSlipUrl?: string;
};

type AsaasErrorItem = { code?: string; description?: string };

type AsaasErrorResponse = {
  errors?: AsaasErrorItem[];
};

async function asaasFetch<T>(
  config: AsaasConfig,
  path: string,
  options: { method?: string; headers?: HeadersInit; body?: object } = {}
): Promise<T> {
  const { body, method = "GET", headers: optHeaders } = options;
  const url = `${config.baseUrl}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    access_token: config.apiKey,
    ...((optHeaders as Record<string, string>) || {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    // Sem limite, um Asaas travado prendia o webhook e o cron diário por minutos.
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await res.json().catch(() => ({}))) as T & AsaasErrorResponse;

  if (!res.ok) {
    const firstError = (data as AsaasErrorResponse).errors?.[0];
    const code = firstError?.code || "";
    const desc = firstError?.description || "";
    const msg = code ? `[${code}] ${desc}` : desc || `Asaas API error: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

/** Extrai o code do primeiro erro Asaas de uma mensagem de Error. */
function isAsaasDuplicateError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  // Substrings conhecidas de erro de duplicata (pt-BR e en)
  const duplicateSubstrings = ["invalid", "ja", "already", "duplicate", "ja cadastrado", "cpf_cnpj_already_in_use"];
  return duplicateSubstrings.some((s) => message.includes(s));
}

/**
 * Retorna o ID do cliente no Asaas. Se já existir asaasCustomerId, retorna.
 * Caso contrário, cria o cliente no Asaas, atualiza o banco e retorna o ID.
 * Requer prisma para atualizar Cliente.asaasCustomerId.
 */
export async function getOrCreateCustomer(
  cliente: ClienteForAsaas,
  prisma: { cliente: { update: (args: { where: { id: number }; data: { asaasCustomerId: string } }) => Promise<unknown> } },
  asaasConfig?: AsaasConfig | null
): Promise<string> {
  if (cliente.asaasCustomerId) return cliente.asaasCustomerId;

  const config = asaasConfig ?? getAsaasConfig();
  if (!config) throw new Error("Asaas não configurado (ASAAS_API_KEY).");

  const cpfCnpj = onlyNumbers(cliente.cpf || cliente.cnpj || "");
  if (!cpfCnpj) throw new Error("Cliente sem CPF/CNPJ. Configure para gerar boleto no Asaas.");

  const mobilePhone = onlyNumbers(cliente.telefone || "");
  const body: Record<string, string> = {
    name: cliente.nome || "Cliente",
    cpfCnpj,
  };
  if (cliente.email) body.email = cliente.email;
  if (mobilePhone.length >= 10) body.mobilePhone = mobilePhone;

  try {
    const created = await asaasFetch<AsaasCustomerResponse>(config, "/v3/customers", {
      method: "POST",
      body,
    });
    const customerId = created.id;
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { asaasCustomerId: customerId },
    });
    return customerId;
  } catch (err) {
    // Cliente já existe com esse CPF/CNPJ: tentar listar e usar o primeiro
    if (isAsaasDuplicateError(err)) {
      const list = await asaasFetch<AsaasCustomersListResponse>(
        config,
        `/v3/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`
      );
      const first = list.data?.[0];
      if (first?.id) {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: { asaasCustomerId: first.id },
        });
        return first.id;
      }
    }
    throw err;
  }
}

/**
 * Cria uma cobrança tipo BOLETO no Asaas.
 * Para parcela única: value + dueDate.
 * Para parcelado: installmentCount + totalValue (ou installmentValue) + dueDate (primeiro vencimento).
 */
export async function createBoletoPayment(
  params: CreateBoletoParams,
  asaasConfig?: AsaasConfig | null
): Promise<CreateBoletoResult> {
  const config = asaasConfig ?? getAsaasConfig();
  if (!config) throw new Error("Asaas não configurado (ASAAS_API_KEY).");

  const body: Record<string, unknown> = {
    customer: params.customerId,
    billingType: "BOLETO",
    value: params.value,
    dueDate: params.dueDate,
  };
  if (params.description) body.description = params.description;
  if (params.externalReference) body.externalReference = params.externalReference;

  if (params.installmentCount != null && params.installmentCount > 1) {
    body.installmentCount = params.installmentCount;
    if (params.totalValue != null) {
      body.totalValue = params.totalValue;
      // Asaas v3 pode exigir installmentValue; calcular a partir do total
      body.installmentValue = params.installmentValue ?? Math.round((params.totalValue / params.installmentCount) * 100) / 100;
    }
  }

  const res = await asaasFetch<AsaasPaymentResponse>(config, "/v3/payments", {
    method: "POST",
    body,
  });

  const bankSlipUrl = res.bankSlipUrl || "";
  if (!res.id) throw new Error("Resposta Asaas sem id da cobrança.");
  return { id: res.id, bankSlipUrl };
}

// ---------------------------------------------------------------------------
// Pix do fechamento mensal (spec 2026-09-30 §3.6 e §5.2): cobrança PIX, QR Code,
// cancelamento e o cliente Asaas da empresa conveniada (pelo CNPJ).
// ---------------------------------------------------------------------------

export type CreatePixParams = {
  customerId: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference: string;
};

/**
 * Id de cobrança vai no path da URL: só letras, dígitos, `_` e `-` (ex.: "pay_080225913252").
 * Barra, ponto e espaço mudariam o recurso chamado (`..` sobe um nível).
 */
function pathIdCobranca(id: string): string {
  if (!/^[\w-]+$/.test(id)) throw new Error("Id de cobrança Asaas inválido.");
  return id;
}

/** Cria uma cobrança tipo PIX no Asaas. O valor vai arredondado a centavos. */
export async function createPixPayment(
  p: CreatePixParams,
  config: AsaasConfig
): Promise<{ id: string; status: string }> {
  const res = await asaasFetch<{ id?: string; status?: string }>(config, "/v3/payments", {
    method: "POST",
    body: {
      customer: p.customerId,
      billingType: "PIX",
      value: Math.round(p.value * 100) / 100,
      dueDate: p.dueDate,
      description: p.description,
      externalReference: p.externalReference,
    },
  });
  if (!res.id) throw new Error("Resposta Asaas sem id da cobrança.");
  return { id: res.id, status: res.status ?? "" };
}

/** QR Code da cobrança PIX: `payload` é o copia-e-cola; `encodedImage` é o PNG em base64. */
export async function getPixQrCode(
  config: AsaasConfig,
  paymentId: string
): Promise<{ payload: string; encodedImage: string; expirationDate?: string | null }> {
  const res = await asaasFetch<{ payload?: string; encodedImage?: string; expirationDate?: string | null }>(
    config,
    `/v3/payments/${pathIdCobranca(paymentId)}/pixQrCode`
  );
  if (!res.payload || !res.encodedImage) throw new Error("Resposta Asaas sem o QR Code do Pix.");
  return { payload: res.payload, encodedImage: res.encodedImage, expirationDate: res.expirationDate ?? null };
}

/**
 * Remove a cobrança no Asaas. Não confere o status antes: quem chama deve buscar a cobrança
 * (`getPayment`) e só cancelar se não estiver paga.
 */
export async function cancelPayment(config: AsaasConfig, paymentId: string): Promise<void> {
  await asaasFetch<unknown>(config, `/v3/payments/${pathIdCobranca(paymentId)}`, { method: "DELETE" });
}

/** Empresa conveniada com os campos usados para criar/identificar o cliente no Asaas. */
export type EmpresaForAsaas = {
  id: number;
  nome: string;
  cnpj: string | null;
  emailRh: string | null;
  asaasCustomerId: string | null;
};

/**
 * ID do cliente Asaas **da empresa** (não do colaborador). Exige CNPJ com 14 dígitos. Se o
 * Asaas recusar por duplicata, busca o cliente pelo CNPJ e reaproveita, como `getOrCreateCustomer`.
 * Grava `EmpresaParceira.asaasCustomerId`.
 */
export async function getOrCreateCustomerEmpresa(
  empresa: EmpresaForAsaas,
  prisma: {
    empresaParceira: {
      update: (args: { where: { id: number }; data: { asaasCustomerId: string } }) => Promise<unknown>;
    };
  },
  config: AsaasConfig
): Promise<string> {
  if (empresa.asaasCustomerId) return empresa.asaasCustomerId;

  const cnpj = onlyNumbers(empresa.cnpj);
  if (cnpj.length !== 14) throw new Error("Cadastre o CNPJ da empresa para gerar o Pix.");

  // `notificationDisabled`: a BFX manda o próprio demonstrativo com o Pix; o RH não deve receber
  // também os e-mails/SMS de cobrança do Asaas.
  const body: Record<string, string | boolean> = { name: empresa.nome, cpfCnpj: cnpj, notificationDisabled: true };
  const email = empresa.emailRh?.trim();
  if (email) body.email = email;

  let customerId: string;
  try {
    const created = await asaasFetch<AsaasCustomerResponse>(config, "/v3/customers", { method: "POST", body });
    if (!created.id) throw new Error("Resposta Asaas sem id do cliente.");
    customerId = created.id;
  } catch (err) {
    if (!isAsaasDuplicateError(err)) throw err;
    const list = await asaasFetch<AsaasCustomersListResponse>(
      config,
      `/v3/customers?cpfCnpj=${encodeURIComponent(cnpj)}`
    );
    const first = list.data?.[0];
    if (!first?.id) throw err;
    customerId = first.id;
    // O cliente já existia (cadastro de outra origem): desliga as notificações dele também.
    await asaasFetch<unknown>(config, `/v3/customers/${pathIdCobranca(customerId)}`, {
      method: "POST",
      body: { notificationDisabled: true },
    });
  }

  await prisma.empresaParceira.update({ where: { id: empresa.id }, data: { asaasCustomerId: customerId } });
  return customerId;
}
