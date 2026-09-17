import { describe, it, expect, vi, beforeEach } from "vitest";
import { WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";
import { lerZip } from "./helpers/ler-zip";

// GET /api/relatorios/folha-xlsx — a planilha da folha (2026-09-17).
const dbMock = { venda: { findMany: vi.fn() }, empresaParceira: { findFirst: vi.fn() } };
const guardsMock = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);

const { GET } = await import("@/app/api/relatorios/folha-xlsx/route");

const VENDA = {
  id: 1,
  status: "ativa",
  dataVenda: new Date("2026-07-12T00:00:00.000Z"),
  parcelas: 1,
  valorVenda: 305,
  quantidade: 1,
  valorFrete: 0,
  desconto: 0,
  itens: [],
  cliente: { id: 1, nome: "LUCIANA FERREIRA DIAS", matricula: "00045", empresa: "AMAZON FIVE" },
  parcelasVencimento: [{ dataVencimento: new Date("2026-09-10T00:00:00.000Z"), valorParcela: 305, paga: false, origemPagamento: null }],
};

const URL_AGOSTO = "http://local/api/relatorios/folha-xlsx?competencia=08%2F2026&empresa=AMAZON%20FIVE";
const URL_SEM_EMPRESA = "http://local/api/relatorios/folha-xlsx?competencia=08%2F2026";
const planilhaDe = async (res: Response) => lerZip(new Uint8Array(await res.arrayBuffer())).get("xl/worksheets/sheet1.xml")!;

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdmin.mockResolvedValue(true);
  dbMock.venda.findMany.mockResolvedValue([VENDA]);
  dbMock.empresaParceira.findFirst.mockResolvedValue({ nome: "AMAZON FIVE", cnpj: "01288370000139" });
});

describe("GET /api/relatorios/folha-xlsx", () => {
  it("só admin baixa: 403 para vendedor, sem consultar o banco", async () => {
    guardsMock.requireAdmin.mockResolvedValue(false);
    const res = await GET(new Request(URL_AGOSTO));
    expect(res.status).toBe(403);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("competência ausente ou inválida: 400, sem consultar o banco", async () => {
    expect((await GET(new Request("http://local/api/relatorios/folha-xlsx"))).status).toBe(400);
    expect((await GET(new Request("http://local/api/relatorios/folha-xlsx?competencia=13%2F2026"))).status).toBe(400);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("devolve um .xlsx com a competência no nome do arquivo", async () => {
    const res = await GET(new Request(URL_AGOSTO));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="folha-desconto-produto-2026-08.xlsx"');
    expect(await planilhaDe(res)).toContain("<v>45</v>");
  });

  it("consulta só venda em desconto em folha", async () => {
    await GET(new Request(URL_AGOSTO));
    expect(dbMock.venda.findMany.mock.calls[0][0].where).toMatchObject(WHERE_VENDA_ANTECIPAVEL);
  });

  it("empresa ausente ou 'todas': 400, sem consultar o banco — o arquivo do Domínio é por empresa", async () => {
    expect((await GET(new Request(URL_SEM_EMPRESA))).status).toBe(400);
    expect((await GET(new Request(`${URL_SEM_EMPRESA}&empresa=todas`))).status).toBe(400);
    expect((await GET(new Request(`${URL_SEM_EMPRESA}&empresa=%20`))).status).toBe(400);
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("com empresa: razão social e CNPJ formatado vêm do cadastro da empresa parceira", async () => {
    dbMock.empresaParceira.findFirst.mockResolvedValue({ nome: "AMAZON FIVE LTDA", cnpj: "01288370000139" });
    const planilha = await planilhaDe(await GET(new Request(`${URL_SEM_EMPRESA}&empresa=Amazon%20Five`)));
    expect(dbMock.empresaParceira.findFirst.mock.calls[0][0].where).toEqual({ nome: { equals: "Amazon Five", mode: "insensitive" } });
    expect(planilha).toContain("AMAZON FIVE LTDA");
    expect(planilha).toContain("01.288.370/0001-39");
  });

  it("empresa filtrada sem cadastro de parceira: razão social é o nome do filtro", async () => {
    dbMock.empresaParceira.findFirst.mockResolvedValue(null);
    const planilha = await planilhaDe(await GET(new Request(URL_AGOSTO)));
    expect(planilha).toContain("AMAZON FIVE");
  });

  it("filtro de empresa na URL tira quem é de outra empresa", async () => {
    dbMock.empresaParceira.findFirst.mockResolvedValue(null);
    const planilha = await planilhaDe(await GET(new Request(`${URL_SEM_EMPRESA}&empresa=OUTRA`)));
    expect(planilha).not.toContain("<v>45</v>");
  });
});
