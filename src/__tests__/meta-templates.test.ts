import { describe, it, expect, vi, beforeEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { listarTemplatesAprovados, limparCacheTemplates } = await import("@/lib/meta-templates");

const respostaGraph = {
  data: [
    {
      name: "bfx_promocao",
      language: "pt_BR",
      status: "APPROVED",
      category: "MARKETING",
      components: [{ type: "BODY", text: "Olá {{1}}, temos {{2}} para você!" }],
    },
    {
      name: "bfx_rascunho",
      language: "pt_BR",
      status: "PENDING",
      category: "MARKETING",
      components: [{ type: "BODY", text: "Aguardando" }],
    },
  ],
};

const okResponse = (json: unknown) =>
  ({ ok: true, status: 200, json: async () => json }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  limparCacheTemplates();
  configMock.findFirst.mockResolvedValue({
    metaWhatsappBusinessId: "WABA1",
    metaWhatsappToken: "TKN",
    metaWhatsappApiVersion: "v21.0",
  });
});

describe("listarTemplatesAprovados", () => {
  it("retorna só os APPROVED e conta as variáveis do corpo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(respostaGraph)));
    const out = await listarTemplatesAprovados();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      nome: "bfx_promocao",
      idioma: "pt_BR",
      categoria: "MARKETING",
      corpo: "Olá {{1}}, temos {{2}} para você!",
      variaveis: 2,
    });
  });

  it("chama o endpoint message_templates do WABA", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(respostaGraph));
    vi.stubGlobal("fetch", fetchMock);
    await listarTemplatesAprovados();
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("https://graph.facebook.com/v21.0/WABA1/message_templates");
  });

  it("usa cache na segunda chamada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(respostaGraph));
    vi.stubGlobal("fetch", fetchMock);
    await listarTemplatesAprovados();
    await listarTemplatesAprovados();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forcarAtualizacao ignora o cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(respostaGraph));
    vi.stubGlobal("fetch", fetchMock);
    await listarTemplatesAprovados();
    await listarTemplatesAprovados(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("devolve lista vazia quando não há WABA configurado", async () => {
    configMock.findFirst.mockResolvedValue({});
    expect(await listarTemplatesAprovados()).toEqual([]);
  });

  it("devolve lista vazia em erro HTTP, sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response));
    expect(await listarTemplatesAprovados()).toEqual([]);
  });

  it("conta variáveis sem duplicar índices repetidos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          data: [
            {
              name: "bfx_x",
              language: "pt_BR",
              status: "APPROVED",
              category: "UTILITY",
              components: [{ type: "BODY", text: "{{1}} e de novo {{1}} e {{2}}" }],
            },
          ],
        })
      )
    );
    const out = await listarTemplatesAprovados();
    expect(out[0]!.variaveis).toBe(2);
  });
});
