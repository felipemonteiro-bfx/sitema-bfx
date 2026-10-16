// Menu da casca como módulo puro: os conjuntos de itens por perfil têm de ser idênticos aos
// arrays adminMenu/sellerMenu de (app)/layout.tsx (copiados aqui como lista literal) e o
// agrupamento reproduz o do sidebar-nav.tsx (2026-10-16).
import { describe, it, expect } from "vitest";
import { menuDoPerfil, grupoDaRota, CHAVES_ICONE } from "@/lib/menu";

const ADMIN_LAYOUT: [string, string, boolean][] = [
  ["/dashboard", "Início", false],
  ["/venda-rapida", "Venda Rápida", false],
  ["/historico", "Histórico", false],
  ["/importacao", "Importação", false],
  ["/financeiro", "Financeiro & DRE", false],
  ["/boletos", "Boletos", false],
  ["/prudent", "Prudent (Antecipação)", false],
  ["/obrigacoes", "Obrigações", false],
  ["/fechamento", "Fechamento", false],
  ["/inteligencia", "BFX Intelligence", true],
  ["/crm", "CRM", true],
  ["/relatorios", "Relatórios", false],
  ["/cadastros", "Cadastros", false],
  ["/gestao-rh", "Gestão de RH", false],
  ["/configuracoes", "Configurações", false],
];

const SELLER_LAYOUT: [string, string, boolean][] = [
  ["/dashboard", "Início", false],
  ["/venda-rapida", "Venda Rápida", false],
  ["/comissoes", "Minhas Comissões", false],
  ["/historico", "Histórico", false],
  ["/cadastros", "Cadastros", false],
  ["/relatorios", "Relatórios PDF", false],
  ["/perfil", "Meu Perfil", false],
];

function achatar(role: string) {
  return menuDoPerfil(role).flatMap((g) => g.items);
}
function chave(i: { href: string; label: string; isNew?: boolean }) {
  return `${i.href}|${i.label}|${Boolean(i.isNew)}`;
}

describe("menuDoPerfil", () => {
  it("admin tem exatamente os itens do layout", () => {
    expect(achatar("admin").map(chave).sort()).toEqual(
      ADMIN_LAYOUT.map(([h, l, n]) => `${h}|${l}|${n}`).sort(),
    );
  });

  it("vendedor tem exatamente os itens do layout", () => {
    expect(achatar("seller").map(chave).sort()).toEqual(
      SELLER_LAYOUT.map(([h, l, n]) => `${h}|${l}|${n}`).sort(),
    );
  });

  it("qualquer perfil que não seja admin recebe o menu de vendedor", () => {
    expect(achatar("vendedor").map(chave)).toEqual(achatar("seller").map(chave));
  });

  it("vendedor nunca vê financeiro, fechamento e inteligência", () => {
    const hrefs = achatar("seller").map((i) => i.href);
    for (const proibido of ["/financeiro", "/fechamento", "/inteligencia"]) {
      expect(hrefs).not.toContain(proibido);
    }
  });

  it("agrupa e ordena como o sidebar", () => {
    expect(menuDoPerfil("admin").map((g) => g.label)).toEqual([
      "Visão geral",
      "Vendas & Operações",
      "Financeiro",
      "Inteligência & Dados",
      "Sistema",
    ]);
    expect(menuDoPerfil("seller").map((g) => g.label)).toEqual([
      "Visão geral",
      "Vendas & Operações",
      "Inteligência & Dados",
      "Sistema",
    ]);
  });

  it("nenhum grupo vazio, nenhum item duplicado", () => {
    for (const role of ["admin", "seller"]) {
      const grupos = menuDoPerfil(role);
      expect(grupos.every((g) => g.items.length > 0)).toBe(true);
      const hrefs = achatar(role).map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("toda chave de ícone pertence ao conjunto conhecido", () => {
    for (const role of ["admin", "seller"]) {
      for (const i of achatar(role)) expect(CHAVES_ICONE).toContain(i.icone);
    }
  });
});

describe("grupoDaRota", () => {
  it("resolve pelo prefixo da rota", () => {
    expect(grupoDaRota("/historico/x", "admin")).toBe("Vendas & Operações");
    expect(grupoDaRota("/historico", "seller")).toBe("Vendas & Operações");
    expect(grupoDaRota("/dashboard", "admin")).toBe("Visão geral");
    expect(grupoDaRota("/prudent/lote/1", "admin")).toBe("Financeiro");
  });
  it("rota fora do menu do perfil devolve null", () => {
    expect(grupoDaRota("/financeiro", "seller")).toBeNull();
    expect(grupoDaRota("/nada", "admin")).toBeNull();
  });
  it("não confunde prefixos parecidos", () => {
    expect(grupoDaRota("/historicoX", "admin")).toBeNull();
  });
});
