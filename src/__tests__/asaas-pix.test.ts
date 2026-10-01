import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelPayment, createPixPayment, getOrCreateCustomerEmpresa, getPixQrCode } from "@/lib/asaas";

const config = { baseUrl: "https://asaas.test", apiKey: "k" };

type Chamada = { url: string; method: string; body: unknown; headers: Record<string, string> };

/** Mock do fetch global: responde em ordem e guarda cada chamada. */
function mockFetch(respostas: { status?: number; corpo: unknown }[]) {
  const chamadas: Chamada[] = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({
        url,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        headers: (init?.headers ?? {}) as Record<string, string>,
      });
      const r = respostas[Math.min(i++, respostas.length - 1)];
      return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 });
    }),
  );
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

describe("createPixPayment", () => {
  it("cria cobrança PIX com valor, vencimento, descrição e referência externa", async () => {
    const chamadas = mockFetch([{ corpo: { id: "pay_1", status: "PENDING" } }]);
    const r = await createPixPayment(
      { customerId: "cus_9", value: 1234.56, dueDate: "2026-10-15", description: "Fechamento 2026-10", externalReference: "FEC-7-2026-10-v2" },
      config,
    );
    expect(r).toEqual({ id: "pay_1", status: "PENDING" });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].url).toBe("https://asaas.test/v3/payments");
    expect(chamadas[0].method).toBe("POST");
    expect(chamadas[0].headers.access_token).toBe("k");
    expect(chamadas[0].body).toEqual({
      customer: "cus_9",
      billingType: "PIX",
      value: 1234.56,
      dueDate: "2026-10-15",
      description: "Fechamento 2026-10",
      externalReference: "FEC-7-2026-10-v2",
    });
  });

  it("arredonda o valor a centavos (saldo calculado em ponto flutuante)", async () => {
    const chamadas = mockFetch([{ corpo: { id: "pay_1", status: "PENDING" } }]);
    await createPixPayment({ customerId: "c", value: 1000 - 999.9, dueDate: "2026-10-15", description: "x", externalReference: "FEC-1-2026-10-v1" }, config);
    expect((chamadas[0].body as { value: number }).value).toBe(0.1);
  });

  it("propaga o erro do Asaas", async () => {
    mockFetch([{ status: 400, corpo: { errors: [{ code: "invalid_value", description: "Valor inválido" }] } }]);
    await expect(
      createPixPayment({ customerId: "c", value: 0, dueDate: "2026-10-15", description: "x", externalReference: "FEC-1-2026-10-v1" }, config),
    ).rejects.toThrow("[invalid_value] Valor inválido");
  });

  it("recusa resposta sem id", async () => {
    mockFetch([{ corpo: { status: "PENDING" } }]);
    await expect(
      createPixPayment({ customerId: "c", value: 10, dueDate: "2026-10-15", description: "x", externalReference: "FEC-1-2026-10-v1" }, config),
    ).rejects.toThrow(/sem id/);
  });
});

describe("getPixQrCode", () => {
  it("busca o QR Code da cobrança", async () => {
    const chamadas = mockFetch([{ corpo: { payload: "000201...", encodedImage: "iVBORw0K", expirationDate: "2026-10-15 23:59:59", success: true } }]);
    const r = await getPixQrCode(config, "pay_1");
    expect(r).toEqual({ payload: "000201...", encodedImage: "iVBORw0K", expirationDate: "2026-10-15 23:59:59" });
    expect(chamadas[0].url).toBe("https://asaas.test/v3/payments/pay_1/pixQrCode");
    expect(chamadas[0].method).toBe("GET");
  });

  it("sem expirationDate devolve null", async () => {
    mockFetch([{ corpo: { payload: "p", encodedImage: "i" } }]);
    const r = await getPixQrCode(config, "pay_1");
    expect(r.expirationDate).toBeNull();
  });

  it.each(["pay/../x", "..", ".", "", "pay 1"])("id inválido %j → erro sem chamar a API", async (id) => {
    const chamadas = mockFetch([{ corpo: { payload: "p", encodedImage: "i" } }]);
    await expect(getPixQrCode(config, id)).rejects.toThrow("Id de cobrança Asaas inválido.");
    expect(chamadas).toHaveLength(0);
  });

  it("recusa resposta sem copia-e-cola ou sem imagem", async () => {
    mockFetch([{ corpo: { encodedImage: "i" } }]);
    await expect(getPixQrCode(config, "pay_1")).rejects.toThrow(/QR Code/);
  });
});

describe("cancelPayment", () => {
  it("usa DELETE na cobrança", async () => {
    const chamadas = mockFetch([{ corpo: { deleted: true, id: "pay_1" } }]);
    await expect(cancelPayment(config, "pay_1")).resolves.toBeUndefined();
    expect(chamadas[0].url).toBe("https://asaas.test/v3/payments/pay_1");
    expect(chamadas[0].method).toBe("DELETE");
  });

  it.each(["..", "pay/x"])("id inválido %j → erro sem chamar a API", async (id) => {
    const chamadas = mockFetch([{ corpo: {} }]);
    await expect(cancelPayment(config, id)).rejects.toThrow("Id de cobrança Asaas inválido.");
    expect(chamadas).toHaveLength(0);
  });

  it("propaga o erro do Asaas", async () => {
    mockFetch([{ status: 400, corpo: { errors: [{ code: "invalid_action", description: "Cobrança já recebida" }] } }]);
    await expect(cancelPayment(config, "pay_1")).rejects.toThrow("Cobrança já recebida");
  });
});

describe("getOrCreateCustomerEmpresa", () => {
  const empresa = { id: 7, nome: "Prefeitura X", cnpj: "12.345.678/0001-90", emailRh: "rh@x.gov.br", asaasCustomerId: null };

  function prismaFake() {
    const update = vi.fn(async () => ({}));
    return { prisma: { empresaParceira: { update } }, update };
  }

  it("devolve o id já gravado sem chamar a API", async () => {
    const chamadas = mockFetch([{ corpo: {} }]);
    const { prisma, update } = prismaFake();
    const id = await getOrCreateCustomerEmpresa({ ...empresa, asaasCustomerId: "cus_existente" }, prisma, config);
    expect(id).toBe("cus_existente");
    expect(chamadas).toHaveLength(0);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ["nulo", null],
    ["vazio", "   "],
    ["CPF (11 dígitos)", "123.456.789-01"],
    ["curto", "12.345.678/0001"],
  ])("CNPJ %s → erro sem chamar a API", async (_rotulo, cnpj) => {
    const chamadas = mockFetch([{ corpo: {} }]);
    const { prisma, update } = prismaFake();
    await expect(getOrCreateCustomerEmpresa({ ...empresa, cnpj }, prisma, config)).rejects.toThrow(
      "Cadastre o CNPJ da empresa para gerar o Pix.",
    );
    expect(chamadas).toHaveLength(0);
    expect(update).not.toHaveBeenCalled();
  });

  it("cria o cliente pelo CNPJ e grava o id na empresa", async () => {
    const chamadas = mockFetch([{ corpo: { id: "cus_novo" } }]);
    const { prisma, update } = prismaFake();
    const id = await getOrCreateCustomerEmpresa(empresa, prisma, config);
    expect(id).toBe("cus_novo");
    expect(chamadas[0].url).toBe("https://asaas.test/v3/customers");
    expect(chamadas[0].method).toBe("POST");
    expect(chamadas[0].body).toEqual({ name: "Prefeitura X", cpfCnpj: "12345678000190", email: "rh@x.gov.br" });
    expect(update).toHaveBeenCalledWith({ where: { id: 7 }, data: { asaasCustomerId: "cus_novo" } });
  });

  it("sem e-mail do RH não envia email", async () => {
    const chamadas = mockFetch([{ corpo: { id: "cus_novo" } }]);
    const { prisma } = prismaFake();
    await getOrCreateCustomerEmpresa({ ...empresa, emailRh: "  " }, prisma, config);
    expect(chamadas[0].body).toEqual({ name: "Prefeitura X", cpfCnpj: "12345678000190" });
  });

  it("duplicata → busca pelo CNPJ e reaproveita o cliente existente", async () => {
    const chamadas = mockFetch([
      { status: 400, corpo: { errors: [{ code: "invalid_cpfCnpj", description: "CPF/CNPJ já cadastrado" }] } },
      { corpo: { data: [{ id: "cus_antigo", cpfCnpj: "12345678000190" }] } },
    ]);
    const { prisma, update } = prismaFake();
    const id = await getOrCreateCustomerEmpresa(empresa, prisma, config);
    expect(id).toBe("cus_antigo");
    expect(chamadas).toHaveLength(2);
    expect(chamadas[1].method).toBe("GET");
    expect(chamadas[1].url).toBe("https://asaas.test/v3/customers?cpfCnpj=12345678000190");
    expect(update).toHaveBeenCalledWith({ where: { id: 7 }, data: { asaasCustomerId: "cus_antigo" } });
  });

  it("duplicata sem cliente na busca → propaga o erro original", async () => {
    mockFetch([
      { status: 400, corpo: { errors: [{ code: "invalid_cpfCnpj", description: "CPF/CNPJ já cadastrado" }] } },
      { corpo: { data: [] } },
    ]);
    const { prisma, update } = prismaFake();
    await expect(getOrCreateCustomerEmpresa(empresa, prisma, config)).rejects.toThrow("CPF/CNPJ já cadastrado");
    expect(update).not.toHaveBeenCalled();
  });
});
