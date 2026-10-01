// Alertas de obrigacoes da Prudent no cron alertas-admin (Fase 4, spec §6): boleto que a BFX paga
// vencendo em ate 3 dias (ou vencido) e boleto sem documento a ate 5 dias do vencimento. Mesma
// idempotencia de 20h dos alertas existentes; link para /obrigacoes.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { alertasDeBoletos, PREFIXO_BOLETO } from "@/lib/alertas-obrigacoes";
import { normalizarEmailFinanceiro } from "@/lib/alertas-obrigacoes";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const HOJE = d("2026-10-01");

const boleto = (extra: Record<string, unknown> = {}) => ({
  status: "a_pagar",
  direcionamento: "bfx",
  vencimento: d("2026-10-04"),
  vencimentoDocumento: null as Date | null,
  valorEsperado: 300,
  valorDocumento: 300 as number | null,
  pagamentos: [] as { valorPrincipal: number; estornadoEm: Date | null }[],
  ...extra,
});

describe("alertasDeBoletos", () => {
  it("a pagar com vencimento ate hoje + 3 (inclusive) e vencidos: um alerta com contagem e saldo", () => {
    const r = alertasDeBoletos(
      [
        boleto({ vencimento: d("2026-10-04") }), // limite: entra
        boleto({ vencimento: d("2026-09-20") }), // vencido: entra
        boleto({
          status: "pago_parcial",
          vencimento: d("2026-10-02"),
          pagamentos: [{ valorPrincipal: 100, estornadoEm: null }],
        }), // entra com saldo 200
        boleto({ vencimento: d("2026-10-05") }), // fora
        boleto({ vencimento: d("2026-10-02"), direcionamento: "empresa" }), // a empresa paga: fora
        boleto({ vencimento: d("2026-10-02"), status: "pago" }), // pago: fora
      ],
      HOJE
    );
    expect(r).toEqual([
      {
        prefixo: PREFIXO_BOLETO.vencendo,
        mensagem: "[Alerta] Boleto Prudent vencendo: 3 boleto(s) da Prudent vencem até 04/10 ou já venceram — R$ 800,00 a pagar.",
        link: "/obrigacoes",
        contagem: 3,
      },
    ]);
  });

  it("o vencimento do documento manda quando existe", () => {
    const r = alertasDeBoletos([boleto({ vencimento: d("2026-10-10"), vencimentoDocumento: d("2026-10-03") })], HOJE);
    expect(r[0]?.contagem).toBe(1);
  });

  it("sem documento a ate 5 dias do vencimento", () => {
    const r = alertasDeBoletos(
      [
        boleto({ status: "aguardando_documento", vencimento: d("2026-10-06"), valorDocumento: null }),
        boleto({ status: "aguardando_documento", vencimento: d("2026-10-07"), valorDocumento: null }),
        boleto({ status: "aguardando_documento", vencimento: d("2026-10-06"), direcionamento: "empresa" }),
      ],
      HOJE
    );
    expect(r).toEqual([
      {
        prefixo: PREFIXO_BOLETO.semDocumento,
        mensagem: "[Alerta] Boleto Prudent sem documento: 1 boleto(s) vencem até 06/10 e ainda não têm o documento da Prudent.",
        link: "/obrigacoes",
        contagem: 1,
      },
    ]);
  });

  it("substituido e cancelado nunca alertam; nada a alertar → lista vazia", () => {
    expect(
      alertasDeBoletos(
        [boleto({ status: "substituido", vencimento: d("2026-09-01") }), boleto({ status: "cancelado" })],
        HOJE
      )
    ).toEqual([]);
  });
});

describe("normalizarEmailFinanceiro", () => {
  it("vazio vira null; endereco valido e aparado; invalido e recusado", () => {
    expect(normalizarEmailFinanceiro("  ")).toEqual({ ok: true, valor: null });
    expect(normalizarEmailFinanceiro(" financeiro@bfxshop.com.br ")).toEqual({ ok: true, valor: "financeiro@bfxshop.com.br" });
    expect(normalizarEmailFinanceiro("financeiro")).toEqual({ ok: false, erro: "E-mail do financeiro inválido." });
    expect(normalizarEmailFinanceiro("a@b.com\r\nBcc: x@y.com")).toEqual({ ok: false, erro: "E-mail do financeiro inválido." });
  });
});

// --- a rota ---
const dbMock = {
  usuario: { findMany: vi.fn() },
  parcelaVencimento: { count: vi.fn() },
  assinatura: { count: vi.fn() },
  produto: { count: vi.fn() },
  boletoPrudent: { findMany: vi.fn() },
  notificacao: { findFirst: vi.fn(), create: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/segredo", () => ({ autorizarCron: () => true }));
vi.mock("@/lib/logger", () => ({ logCron: vi.fn(), logCronError: vi.fn() }));

describe("GET /api/cron/alertas-admin — boletos Prudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    // 01/10/2026 meio-dia em Manaus
    vi.setSystemTime(new Date("2026-10-01T16:00:00.000Z"));
    dbMock.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    dbMock.parcelaVencimento.count.mockResolvedValue(0);
    dbMock.assinatura.count.mockResolvedValue(0);
    dbMock.produto.count.mockResolvedValue(0);
    dbMock.notificacao.findFirst.mockResolvedValue(null);
    dbMock.boletoPrudent.findMany.mockResolvedValue([
      boleto({ vencimento: d("2026-10-03") }),
      boleto({ status: "aguardando_documento", vencimento: d("2026-10-05"), valorDocumento: null }),
    ]);
  });
  afterEach(() => vi.useRealTimers());

  it("busca so boletos vivos e nao pagos da BFX, e notifica cada admin com link para /obrigacoes", async () => {
    const { GET } = await import("@/app/api/cron/alertas-admin/route");
    const r = await GET(new Request("http://x/api/cron/alertas-admin"));
    expect(r.status).toBe(200);
    expect(dbMock.boletoPrudent.findMany.mock.calls[0][0].where).toEqual({
      direcionamento: "bfx",
      status: { in: ["aguardando_documento", "a_pagar", "pago_parcial"] },
    });
    const criadas = dbMock.notificacao.create.mock.calls.map((c) => c[0].data);
    expect(criadas).toHaveLength(4);
    expect(criadas.every((n) => n.link === "/obrigacoes")).toBe(true);
    expect(criadas.filter((n) => n.mensagem.startsWith(PREFIXO_BOLETO.vencendo))).toHaveLength(2);
    expect(criadas.filter((n) => n.mensagem.startsWith(PREFIXO_BOLETO.semDocumento))).toHaveLength(2);
    const corpo = await r.json();
    expect(corpo.alertas).toMatchObject({ boletosVencendo: 1, boletosSemDocumento: 1 });
  });

  it("idempotente: alerta nao lido nas ultimas 20h nao e recriado", async () => {
    dbMock.notificacao.findFirst.mockResolvedValue({ id: 9 });
    const { GET } = await import("@/app/api/cron/alertas-admin/route");
    await GET(new Request("http://x/api/cron/alertas-admin"));
    expect(dbMock.notificacao.create).not.toHaveBeenCalled();
  });
});
