// Pix do fechamento que não entrou (Fase 6, spec 2026-09-30 §6): fechamento enviado ou pago em
// parte com o dia do Pix já passado → notificação aos admins e e-mail ao financeiro, uma vez por
// fechamento a cada 20h; o saldo dos fechamentos vira entrada esperada na projeção de caixa.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  alertaPixAtrasado,
  pixAtrasados,
  pixEsperados,
  situacaoPixFechamento,
  type FechamentoPix,
} from "@/lib/pix-fechamento";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const HOJE = d("2026-10-16");

const boleto = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  status: "a_pagar",
  direcionamento: "bfx",
  valorEsperado: 300,
  valorDocumento: null as number | null,
  pagamentos: [] as { valorPrincipal: number; estornadoEm: Date | null }[],
  ...extra,
});

const fechamento = (extra: Partial<FechamentoPix> = {}): FechamentoPix => ({
  id: 11,
  empresa: "Amazon Five",
  competencia: "2026-10",
  status: "enviado",
  totalFinal: 600,
  recebimentos: [],
  dataPix: d("2026-10-15"),
  boletos: [boleto()],
  ...extra,
});

describe("situacaoPixFechamento", () => {
  it("saldo pelo recebido confirmado; boletos da BFX vivos e não pagos somados uma vez cada", () => {
    const s = situacaoPixFechamento(
      fechamento({
        recebimentos: [
          { valor: 100, status: "confirmado" },
          { valor: 999, status: "pendente" },
        ],
        boletos: [
          boleto({ id: 1 }),
          boleto({ id: 1 }), // duas parcelas do mesmo boleto
          boleto({ id: 2, valorEsperado: 200, pagamentos: [{ valorPrincipal: 50, estornadoEm: null }] }),
          boleto({ id: 3, status: "pago" }),
          boleto({ id: 4, direcionamento: "empresa" }),
          boleto({ id: 5, status: "substituido" }),
        ],
      }),
      HOJE
    );
    expect(s).toEqual({ saldo: 500, boletosBfx: 450, atrasado: true });
  });

  it("no dia do Pix ainda não está atrasado; pago ou sem saldo nunca está", () => {
    expect(situacaoPixFechamento(fechamento(), d("2026-10-15")).atrasado).toBe(false);
    expect(situacaoPixFechamento(fechamento({ status: "pago" }), HOJE).atrasado).toBe(false);
    expect(situacaoPixFechamento(fechamento({ recebimentos: [{ valor: 600, status: "confirmado" }] }), HOJE).atrasado).toBe(false);
    expect(situacaoPixFechamento(fechamento({ totalFinal: null }), HOJE).atrasado).toBe(false);
  });
});

describe("pixAtrasados / alertaPixAtrasado", () => {
  it("só os enviados ou pagos em parte, com saldo, depois do dia do Pix", () => {
    const r = pixAtrasados(
      [
        fechamento({ id: 11 }),
        fechamento({ id: 12, status: "pago_parcial", recebimentos: [{ valor: 100, status: "confirmado" }] }),
        fechamento({ id: 13, dataPix: d("2026-10-20") }),
        fechamento({ id: 14, status: "conferido" }),
      ],
      HOJE
    );
    expect(r.map((p) => p.fechamentoId)).toEqual([11, 12]);
  });

  it("mensagem com prefixo por fechamento, empresa, competência, saldo e boletos da BFX; link para o fechamento", () => {
    const [p] = pixAtrasados([fechamento()], HOJE);
    const a = alertaPixAtrasado(p);
    expect(a.prefixo).toBe("[Alerta] Pix do fechamento não entrou (#11)");
    expect(a.mensagem.startsWith(a.prefixo)).toBe(true);
    expect(a.mensagem).toMatch(/Amazon Five — outubro de 2026/);
    expect(a.mensagem).toMatch(/15\/10/);
    expect(a.mensagem).toMatch(/R\$\s600,00/);
    expect(a.mensagem).toMatch(/R\$\s300,00 em boletos/);
    expect(a.link).toBe("/fechamento/11");
    // o prefixo do #1 não pega o #11
    expect(a.mensagem.startsWith("[Alerta] Pix do fechamento não entrou (#1)")).toBe(false);
  });
});

describe("pixEsperados", () => {
  it("saldo de cada fechamento enviado ou pago em parte, no dia do Pix", () => {
    expect(
      pixEsperados([
        fechamento({ id: 11 }),
        fechamento({ id: 12, status: "pago_parcial", recebimentos: [{ valor: 250, status: "confirmado" }], dataPix: d("2026-11-15") }),
        fechamento({ id: 13, status: "pago" }),
        fechamento({ id: 14, status: "em_preparacao" }),
      ])
    ).toEqual([
      { data: d("2026-10-15"), valor: 600 },
      { data: d("2026-11-15"), valor: 350 },
    ]);
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
  config: { findFirst: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/segredo", () => ({ autorizarCron: () => true }));
vi.mock("@/lib/logger", () => ({ logCron: vi.fn(), logCronError: vi.fn() }));
const emailMock = { sendEmail: vi.fn() };
vi.mock("@/lib/email", () => emailMock);
const leituraMock = { lerFechamentosComPix: vi.fn() };
vi.mock("@/lib/fechamento-leitura", () => leituraMock);

describe("GET /api/cron/alertas-admin — Pix do fechamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    // 16/10/2026 meio-dia em Manaus
    vi.setSystemTime(new Date("2026-10-16T16:00:00.000Z"));
    dbMock.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    dbMock.parcelaVencimento.count.mockResolvedValue(0);
    dbMock.assinatura.count.mockResolvedValue(0);
    dbMock.produto.count.mockResolvedValue(0);
    dbMock.boletoPrudent.findMany.mockResolvedValue([]);
    dbMock.notificacao.findFirst.mockResolvedValue(null);
    dbMock.config.findFirst.mockResolvedValue({ emailFinanceiro: "financeiro@bfxshop.com.br" });
    emailMock.sendEmail.mockResolvedValue(undefined);
    leituraMock.lerFechamentosComPix.mockResolvedValue([fechamento({ empresa: "Amazon <Five>" })]);
  });
  afterEach(() => vi.useRealTimers());

  it("notifica cada admin e manda um e-mail ao financeiro com o saldo e os boletos, escapado", async () => {
    const { GET } = await import("@/app/api/cron/alertas-admin/route");
    const r = await GET(new Request("http://x/api/cron/alertas-admin"));
    expect(r.status).toBe(200);
    const criadas = dbMock.notificacao.create.mock.calls.map((c) => c[0].data);
    expect(criadas).toHaveLength(2);
    expect(criadas.every((n) => n.mensagem.startsWith("[Alerta] Pix do fechamento não entrou (#11)") && n.link === "/fechamento/11")).toBe(true);
    expect(emailMock.sendEmail).toHaveBeenCalledTimes(1);
    const email = emailMock.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("financeiro@bfxshop.com.br");
    expect(email.subject).toContain("Pix não entrou");
    expect(email.html).toContain("Amazon &lt;Five&gt;");
    expect(email.html).not.toContain("<Five>");
    expect(email.html).toMatch(/R\$\s300,00/);
    expect((await r.json()).alertas).toMatchObject({ pixAtrasados: 1 });
  });

  it("já avisado nas últimas 20h (mesmo lido) → nem notificação nem e-mail de novo", async () => {
    dbMock.notificacao.findFirst.mockResolvedValue({ id: 9 });
    const { GET } = await import("@/app/api/cron/alertas-admin/route");
    await GET(new Request("http://x/api/cron/alertas-admin"));
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
    expect(dbMock.notificacao.create).not.toHaveBeenCalled();
    // a checagem do e-mail não filtra por lida
    const filtros = dbMock.notificacao.findFirst.mock.calls.map((c) => c[0].where);
    expect(filtros.some((w) => w.lida === undefined && w.mensagem.startsWith === "[Alerta] Pix do fechamento não entrou (#11)")).toBe(true);
  });

  it("sem e-mail do financeiro → só notificação", async () => {
    dbMock.config.findFirst.mockResolvedValue({ emailFinanceiro: null });
    const { GET } = await import("@/app/api/cron/alertas-admin/route");
    await GET(new Request("http://x/api/cron/alertas-admin"));
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
    expect(dbMock.notificacao.create).toHaveBeenCalledTimes(2);
  });

  it("falha no e-mail não derruba as notificações", async () => {
    emailMock.sendEmail.mockRejectedValue(new Error("SMTP não configurado"));
    const { GET } = await import("@/app/api/cron/alertas-admin/route");
    const r = await GET(new Request("http://x/api/cron/alertas-admin"));
    expect(r.status).toBe(200);
    expect(dbMock.notificacao.create).toHaveBeenCalledTimes(2);
  });
});
