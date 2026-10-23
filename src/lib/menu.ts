// Menu da casca como módulo puro (sem React, sem lucide): quem consome mapeia a chave de
// ícone para o componente. Os itens por perfil são os mesmos de (app)/layout.tsx e o
// agrupamento reproduz o de sidebar-nav.tsx (redesign Vantage, tarefa A2).

export const CHAVES_ICONE = [
  "inicio",
  "venda",
  "historico",
  "importacao",
  "financeiro",
  "boletos",
  "prudent",
  "obrigacoes",
  "fechamento",
  "ia",
  "crm",
  "relatorios",
  "cadastros",
  "rh",
  "configuracoes",
  "comissoes",
  "perfil",
] as const;

export type ChaveIcone = (typeof CHAVES_ICONE)[number];

export interface ItemMenu {
  href: string;
  label: string;
  icone: ChaveIcone;
  isNew?: boolean;
}

export interface GrupoMenu {
  label: string;
  items: ItemMenu[];
}

const adminMenu: ItemMenu[] = [
  { href: "/dashboard", label: "Início", icone: "inicio" },
  { href: "/venda-rapida", label: "Venda Rápida", icone: "venda" },
  { href: "/historico", label: "Histórico", icone: "historico" },
  { href: "/importacao", label: "Importação", icone: "importacao" },
  { href: "/financeiro", label: "Financeiro & DRE", icone: "financeiro" },
  { href: "/boletos", label: "Boletos", icone: "boletos" },
  { href: "/prudent", label: "Prudent (Antecipação)", icone: "prudent" },
  { href: "/obrigacoes", label: "Obrigações", icone: "obrigacoes" },
  { href: "/fechamento", label: "Fechamento", icone: "fechamento" },
  { href: "/inteligencia", label: "BFX Intelligence", icone: "ia", isNew: true },
  { href: "/crm", label: "CRM", icone: "crm", isNew: true },
  { href: "/relatorios", label: "Relatórios", icone: "relatorios" },
  { href: "/cadastros", label: "Cadastros", icone: "cadastros" },
  { href: "/gestao-rh", label: "Gestão de RH", icone: "rh" },
  { href: "/configuracoes", label: "Configurações", icone: "configuracoes" },
];

const sellerMenu: ItemMenu[] = [
  { href: "/dashboard", label: "Início", icone: "inicio" },
  { href: "/venda-rapida", label: "Venda Rápida", icone: "venda" },
  { href: "/comissoes", label: "Minhas Comissões", icone: "comissoes" },
  { href: "/historico", label: "Histórico", icone: "historico" },
  { href: "/cadastros", label: "Cadastros", icone: "cadastros" },
  { href: "/relatorios", label: "Relatórios PDF", icone: "relatorios" },
  { href: "/perfil", label: "Meu Perfil", icone: "perfil" },
];

// Mesma partição do sidebar-nav: cada grupo lista os hrefs que aceita; a ordem dentro do
// grupo segue a ordem do menu do perfil.
const GRUPOS: { label: string; hrefs: string[] }[] = [
  { label: "Visão geral", hrefs: ["/dashboard"] },
  { label: "Vendas & Operações", hrefs: ["/venda-rapida", "/historico", "/importacao"] },
  {
    label: "Financeiro",
    hrefs: ["/financeiro", "/boletos", "/prudent", "/obrigacoes", "/fechamento"],
  },
  {
    label: "Inteligência & Dados",
    hrefs: ["/inteligencia", "/crm", "/relatorios", "/cadastros", "/gestao-rh", "/comissoes"],
  },
  { label: "Sistema", hrefs: ["/configuracoes", "/perfil"] },
];

/** Grupos do menu do perfil (admin ou, para qualquer outro valor, vendedor); sem grupos vazios. */
export function menuDoPerfil(role: string): GrupoMenu[] {
  const menu = role === "admin" ? adminMenu : sellerMenu;
  return GRUPOS.map((g) => ({
    label: g.label,
    items: menu.filter((i) => g.hrefs.includes(i.href)).map((i) => ({ ...i })),
  })).filter((g) => g.items.length > 0);
}

function rotaCasa(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Label do grupo do item ativo (prefixo de rota) ou null se a rota não está no menu do perfil. */
export function grupoDaRota(pathname: string, role: string): string | null {
  for (const g of menuDoPerfil(role)) {
    if (g.items.some((i) => rotaCasa(pathname, i.href))) return g.label;
  }
  return null;
}
