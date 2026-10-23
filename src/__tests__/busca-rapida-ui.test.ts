import { describe, it, expect } from "vitest";
import { teclaAbreBusca, montarGrupos, type RespostaBusca } from "@/lib/busca-rapida-ui";
import { menuDoPerfil } from "@/lib/menu";

const ev = (o: Partial<Parameters<typeof teclaAbreBusca>[0]> = {}) => ({
  key: "k",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  repeat: false,
  ...o,
});

const resposta: RespostaBusca = {
  sugestao: { titulo: "Vendas de Ana · aguardando assinatura", url: "/historico?vendedor=ana&assinatura=pendente" },
  vendas: [
    { id: 258, cliente: "José", data: "2026-10-05", valor: 1240, statusAssinatura: "pendente" },
    { id: 256, cliente: "Maria", data: "2026-10-04", valor: 760, statusAssinatura: "assinado" },
    { id: 254, cliente: "Ana", data: "2026-10-02", valor: 455, statusAssinatura: null },
  ],
  clientes: [{ id: 7, nome: "José da Silva" }],
  totalVendas: 82,
};

const grupo = (r: ReturnType<typeof montarGrupos>, id: string) => r.grupos.find((g) => g.id === id);

describe("teclaAbreBusca", () => {
  it("Cmd+K abre no Mac", () => {
    expect(teclaAbreBusca(ev({ metaKey: true }), "mac")).toBe(true);
  });
  it("Ctrl+K abre fora do Mac", () => {
    expect(teclaAbreBusca(ev({ ctrlKey: true }), "outra")).toBe(true);
  });
  it("Ctrl+K no Mac não abre (e Cmd+K fora do Mac também não)", () => {
    expect(teclaAbreBusca(ev({ ctrlKey: true }), "mac")).toBe(false);
    expect(teclaAbreBusca(ev({ metaKey: true }), "outra")).toBe(false);
  });
  it("aceita K maiúsculo (caps lock)", () => {
    expect(teclaAbreBusca(ev({ key: "K", metaKey: true }), "mac")).toBe(true);
  });
  it("ignora composição IME e tecla repetida", () => {
    expect(teclaAbreBusca(ev({ metaKey: true, isComposing: true }), "mac")).toBe(false);
    expect(teclaAbreBusca(ev({ metaKey: true, repeat: true }), "mac")).toBe(false);
  });
  it("ignora outras teclas e combinações com Alt/Shift", () => {
    expect(teclaAbreBusca(ev({ key: "j", metaKey: true }), "mac")).toBe(false);
    expect(teclaAbreBusca(ev({ metaKey: true, shiftKey: true }), "mac")).toBe(false);
    expect(teclaAbreBusca(ev({ metaKey: true, altKey: true }), "mac")).toBe(false);
    expect(teclaAbreBusca(ev(), "mac")).toBe(false);
  });
});

describe("montarGrupos", () => {
  it("vendedor não vê a página Fechamento nem o rodapé de IA", () => {
    const r = montarGrupos(null, menuDoPerfil("vendedor"), "vendedor", "");
    const urls = r.grupos.flatMap((g) => g.itens.map((i) => i.url));
    expect(urls).not.toContain("/fechamento");
    expect(r.perguntarIA).toBeNull();
    expect(grupo(r, "acoes")!.itens.map((i) => i.rotulo)).not.toContain("Fechamento do mês");
  });

  it("admin vê Fechamento (página e ação) e o rodapé de IA com o texto codificado", () => {
    const r = montarGrupos(null, menuDoPerfil("admin"), "admin", "");
    const urls = r.grupos.flatMap((g) => g.itens.map((i) => i.url));
    expect(urls).toContain("/fechamento");
    expect(grupo(r, "acoes")!.itens.map((i) => i.rotulo)).toContain("Fechamento do mês");
    const r2 = montarGrupos(null, menuDoPerfil("admin"), "admin", "quanto vendi?");
    expect(r2.perguntarIA).toBe("/inteligencia?pergunta=quanto%20vendi%3F");
  });

  it("vazio mostra Páginas e Ações", () => {
    const r = montarGrupos(null, menuDoPerfil("admin"), "admin", "");
    expect(r.grupos.map((g) => g.id)).toEqual(["paginas", "acoes"]);
  });

  it("filtra páginas sem acento e sem caixa", () => {
    const r = montarGrupos(null, menuDoPerfil("admin"), "admin", "inicio");
    expect(grupo(r, "paginas")!.itens.map((i) => i.url)).toEqual(["/dashboard"]);
    const r2 = montarGrupos(null, menuDoPerfil("admin"), "admin", "OBRIGACOES");
    expect(grupo(r2, "paginas")!.itens.map((i) => i.url)).toEqual(["/obrigacoes"]);
  });

  it("sem página casando, o grupo some", () => {
    const r = montarGrupos(null, menuDoPerfil("admin"), "admin", "zzzxx");
    expect(grupo(r, "paginas")).toBeUndefined();
  });

  it("a ação de assinatura usa a URL única do contador (período e vendedor)", () => {
    const url = "/historico?assinatura=pendente&from=2000-01-01&to=2026-10-16&vendedor=Ana";
    const r = montarGrupos(null, menuDoPerfil("vendedor"), "vendedor", "", url);
    expect(grupo(r, "acoes")!.itens.find((i) => i.chave === "acao-assinatura")!.url).toBe(url);
  });

  it("ações não têm atalho com modificador", () => {
    const r = montarGrupos(null, menuDoPerfil("admin"), "admin", "");
    const acoes = grupo(r, "acoes")!;
    expect(acoes.itens.map((i) => i.url)).toEqual([
      "/venda-rapida",
      "/historico?assinatura=pendente",
      "/fechamento",
    ]);
    expect(JSON.stringify(acoes)).not.toMatch(/⌘|Ctrl|Meta|atalho/);
  });

  it("vendas: contador '3 de N', link e metadados", () => {
    const r = montarGrupos(resposta, menuDoPerfil("admin"), "admin", "jose");
    const vendas = grupo(r, "vendas")!;
    expect(vendas.contador).toBe("3 de 82");
    expect(vendas.itens).toHaveLength(3);
    expect(vendas.itens[0]).toMatchObject({
      rotulo: "José",
      codigo: "#258",
      url: "/historico?edit=258",
      statusAssinatura: "pendente",
      valor: 1240,
      data: "2026-10-05",
    });
  });

  it("clientes levam ao Histórico filtrado pelo cliente", () => {
    const r = montarGrupos(resposta, menuDoPerfil("admin"), "admin", "jose");
    expect(grupo(r, "clientes")!.itens[0]).toMatchObject({ rotulo: "José da Silva", url: "/historico?cliente=7" });
  });

  it("sugestão vem primeiro, com linha de filtro derivada da url", () => {
    const r = montarGrupos(resposta, menuDoPerfil("admin"), "admin", "ana pendentes");
    expect(r.grupos[0].id).toBe("sugestao");
    expect(r.grupos[0].itens[0]).toMatchObject({
      rotulo: "Vendas de Ana · aguardando assinatura",
      url: "/historico?vendedor=ana&assinatura=pendente",
    });
    expect(r.grupos[0].itens[0].detalhe).toMatch(/^Filtro/);
  });

  it("grupos de servidor vazios não aparecem", () => {
    const vazia: RespostaBusca = { sugestao: null, vendas: [], clientes: [], totalVendas: 0 };
    const r = montarGrupos(vazia, menuDoPerfil("vendedor"), "vendedor", "xyzxyz");
    expect(r.grupos).toEqual([]);
  });
});
