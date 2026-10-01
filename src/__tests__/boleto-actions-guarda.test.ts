// `gerarBoletoAsaas` é server action (o Action ID vive no bundle) e cria cobrança real no Asaas:
// sem sessão, nada é lido nem chamado. Vendedor continua podendo gerar (sessão, não admin).
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = { config: { findFirst: vi.fn() }, venda: { findUnique: vi.fn(), update: vi.fn() } };
const guardsMock = { requireSessionOrThrow: vi.fn(), requireAdminOrThrow: vi.fn() };
const asaasMock = { getAsaasConfig: vi.fn(), getOrCreateCustomer: vi.fn(), createBoletoPayment: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/asaas", () => asaasMock);
vi.mock("@/lib/revalidacao", () => ({ revalidarVenda: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ enviarWhatsApp: vi.fn(), getWhatsAppFlags: vi.fn() }));

const { gerarBoletoAsaas } = await import("@/lib/boleto-actions");

function form() {
  const fd = new FormData();
  fd.set("vendaId", "10");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.config.findFirst.mockResolvedValue(null);
  asaasMock.getAsaasConfig.mockReturnValue(null);
});

describe("gerarBoletoAsaas — guarda", () => {
  it("sem sessão lança antes de ler o banco ou chamar o Asaas", async () => {
    guardsMock.requireSessionOrThrow.mockRejectedValue(new Error("Nao autenticado."));
    await expect(gerarBoletoAsaas(form())).rejects.toThrow("Nao autenticado.");
    expect(dbMock.config.findFirst).not.toHaveBeenCalled();
    expect(dbMock.venda.findUnique).not.toHaveBeenCalled();
    expect(asaasMock.createBoletoPayment).not.toHaveBeenCalled();
  });

  it("com sessão de vendedor segue o fluxo (não exige admin)", async () => {
    guardsMock.requireSessionOrThrow.mockResolvedValue({ id: 2, username: "vendedor", role: "vendedor" });
    const r = await gerarBoletoAsaas(form());
    expect(guardsMock.requireAdminOrThrow).not.toHaveBeenCalled();
    expect(dbMock.config.findFirst).toHaveBeenCalled();
    expect(r.success).toBe(false); // Asaas não configurado no teste
  });
});
