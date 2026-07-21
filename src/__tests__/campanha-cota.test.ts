import { describe, it, expect, vi, beforeEach } from "vitest";

const mensagemMock = { contarContatosUnicos24h: vi.fn() };
vi.mock("@/lib/whatsapp-mensagem", () => mensagemMock);
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/crm", () => ({ buildClienteSegmentWhere: vi.fn(() => ({})) }));
// Nesta task `campanha-service` ainda importa `enviarWhatsAppTexto` — a troca
// para `enviarWhatsApp` acontece na Task 10. Ambos são mockados para que o
// módulo carregue em qualquer uma das duas ordens de execução.
vi.mock("@/lib/whatsapp", () => ({
  enviarWhatsAppTexto: vi.fn(),
  enviarWhatsApp: vi.fn(),
  enviarWhatsAppDetalhado: vi.fn(),
}));
vi.mock("@/lib/whatsapp-templates", () => ({ comFallback: vi.fn(), TEMPLATES: {} }));
vi.mock("@/lib/logger", () => ({ logCron: vi.fn() }));

const { verificarCota, LIMITE_TIER_24H, RESERVA_TRANSACIONAL } = await import(
  "@/lib/campanha-service"
);

beforeEach(() => vi.clearAllMocks());

describe("verificarCota", () => {
  it("campanha pequena com pouco uso cabe", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(50);
    const r = await verificarCota(100);
    expect(r.cabe).toBe(true);
    expect(r.usados).toBe(50);
    expect(r.disponivel).toBe(LIMITE_TIER_24H - RESERVA_TRANSACIONAL - 50);
  });

  it("reserva transacional é preservada", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(0);
    const r = await verificarCota(LIMITE_TIER_24H);
    expect(r.cabe).toBe(false);
    expect(r.disponivel).toBe(LIMITE_TIER_24H - RESERVA_TRANSACIONAL);
  });

  it("campanha que estoura o restante não cabe", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(800);
    const r = await verificarCota(100);
    expect(r.cabe).toBe(false);
  });

  it("disponível nunca é negativo", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(5000);
    const r = await verificarCota(1);
    expect(r.disponivel).toBe(0);
    expect(r.cabe).toBe(false);
  });
});
