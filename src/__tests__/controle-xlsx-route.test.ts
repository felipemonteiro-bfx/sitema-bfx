import { describe, it, expect, vi, beforeEach } from "vitest";
import { WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";
import { lerZip } from "./helpers/ler-zip";

// GET /api/relatorios/controle-xlsx — a planilha de controle (2026-09-11).
const dbMock = { venda: { findMany: vi.fn() } };
const guardsMock = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);

const { GET } = await import("@/app/api/relatorios/controle-xlsx/route");

const VENDA = {
  id: 1,
  status: "ativa",
  antecipada: 0,
  dataVenda: new Date("2026-07-12T00:00:00.000Z"),
  produtoNome: "FRITADEIRA ELÉTRICA 4L",
  itens: [],
  cliente: { nome: "LUCIANA FERREIRA DIAS", cpf: "03119321265", cnpj: null, empresa: "AMAZON FIVE" },
  parcelasVencimento: [
    { numeroParcela: 1, dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 305, antecipada: true },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdmin.mockResolvedValue(true);
  dbMock.venda.findMany.mockResolvedValue([VENDA]);
});

describe("GET /api/relatorios/controle-xlsx", () => {
  it("só admin baixa: 403 para vendedor, sem consultar o banco", async () => {
    guardsMock.requireAdmin.mockResolvedValue(false);
    const res = await GET(new Request("http://local/api/relatorios/controle-xlsx"));
    expect(res.status).toBe(403);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("devolve um .xlsx de verdade, com nome de arquivo datado", async () => {
    const res = await GET(new Request("http://local/api/relatorios/controle-xlsx"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="controle-antecipacao-bfx-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    const arquivos = lerZip(new Uint8Array(await res.arrayBuffer()));
    expect(arquivos.get("xl/workbook.xml")).toContain('name="AGOSTO 2026"');
  });

  it("consulta só venda em desconto em folha", async () => {
    await GET(new Request("http://local/api/relatorios/controle-xlsx"));
    expect(dbMock.venda.findMany.mock.calls[0][0].where).toMatchObject(WHERE_VENDA_ANTECIPAVEL);
  });

  const abasDe = async (res: Response) => lerZip(new Uint8Array(await res.arrayBuffer())).get("xl/workbook.xml")!;

  it("filtro de empresa na URL", async () => {
    expect(await abasDe(await GET(new Request("http://local/api/relatorios/controle-xlsx?empresa=OUTRA")))).toContain('name="SEM PARCELAS"');
  });

  it("filtro de meses na URL: dentro do intervalo a aba sai, fora não", async () => {
    const dentro = await GET(new Request("http://local/api/relatorios/controle-xlsx?mesInicio=08%2F2026&mesFim=08%2F2026"));
    expect(await abasDe(dentro)).toContain('name="AGOSTO 2026"');
    const fora = await GET(new Request("http://local/api/relatorios/controle-xlsx?mesInicio=09%2F2026&mesFim=12%2F2026"));
    expect(await abasDe(fora)).toContain('name="SEM PARCELAS"');
  });

  it("passados=0 deixa de fora os meses que já passaram", async () => {
    expect(await abasDe(await GET(new Request("http://local/api/relatorios/controle-xlsx?passados=0")))).toContain('name="SEM PARCELAS"');
  });

  it("período inválido: 400", async () => {
    const res = await GET(new Request("http://local/api/relatorios/controle-xlsx?mesInicio=13%2F2026"));
    expect(res.status).toBe(400);
  });
});
