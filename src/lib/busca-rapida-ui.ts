/**
 * Lógica pura da paleta de busca (⌘K): decide quando a tecla abre e monta os grupos
 * de resultado a partir da resposta do servidor + menu do perfil. Sem React, para
 * ser testável em ambiente node (redesign Vantage, tarefa F2).
 */
import type { GrupoMenu, ChaveIcone } from "@/lib/menu";
import { normalizarBusca, type StatusAssinatura } from "@/lib/busca-rapida";
import { formaPagamentoLabel, type FormaPagamento } from "@/lib/forma-pagamento";

export type Plataforma = "mac" | "outra";

/** Mac/iOS usam ⌘; o resto, Ctrl. Recebe o navegador por parâmetro para não tocar `window` aqui. */
export function detectarPlataforma(nav?: { platform?: string; userAgent?: string } | null): Plataforma {
  const base = `${nav?.platform ?? ""} ${nav?.userAgent ?? ""}`;
  return base.split(/mac|iphone|ipad|ipod/i).length > 1 ? "mac" : "outra";
}

export interface EventoTecla {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
  repeat: boolean;
}

/** ⌘K no Mac, Ctrl+K nos demais; ignora composição IME, tecla repetida e Alt/Shift. */
export function teclaAbreBusca(e: EventoTecla, plataforma: Plataforma): boolean {
  if (e.isComposing || e.repeat) return false;
  if (e.altKey || e.shiftKey) return false;
  if (e.key.toLowerCase() !== "k") return false;
  return plataforma === "mac" ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

// --- Contrato da rota GET /api/busca-rapida ---------------------------------------------

export interface RespostaBusca {
  sugestao: { titulo: string; url: string } | null;
  vendas: { id: number; cliente: string; data: string; valor: number; statusAssinatura: StatusAssinatura }[];
  clientes: { id: number; nome: string }[];
  totalVendas: number;
}

// --- Grupos ------------------------------------------------------------------------------

export type IdGrupo = "sugestao" | "vendas" | "clientes" | "paginas" | "acoes";

export interface ItemBusca {
  /** Chave estável (também é o `value` do cmdk). */
  chave: string;
  rotulo: string;
  url: string;
  /** Segunda linha (sugestão: o filtro aplicado). */
  detalhe?: string;
  // Venda
  codigo?: string;
  valor?: number;
  data?: string;
  statusAssinatura?: StatusAssinatura;
  // Página/ação: chave do ícone do menu ou da ação
  icone?: ChaveIcone | "raio" | "assinatura" | "cadeado";
}

export interface GrupoBusca {
  id: IdGrupo;
  titulo: string;
  /** Ex.: "3 de 82" no grupo Vendas. */
  contador?: string;
  itens: ItemBusca[];
}

export interface ResultadoGrupos {
  grupos: GrupoBusca[];
  /** URL do rodapé "Perguntar ao BFX Intelligence"; null para quem não é admin. */
  perguntarIA: string | null;
}

const ROTULO_ASSINATURA: Record<string, string> = {
  pendente: "Aguardando assinatura",
  assinado: "Assinado",
};

/** Linha de apoio da sugestão: "Filtro · vendedor: Ana · status: Aguardando assinatura". */
function detalheDaSugestao(url: string): string {
  const consulta = url.split("?")[1] ?? "";
  const p = new URLSearchParams(consulta);
  const partes = ["Filtro"];
  const vendedor = p.get("vendedor");
  if (vendedor) partes.push(`vendedor: ${vendedor}`);
  const assinatura = p.get("assinatura");
  if (assinatura) partes.push(`status: ${ROTULO_ASSINATURA[assinatura] ?? assinatura}`);
  const forma = p.get("formaPagamento");
  if (forma) partes.push(`pagamento: ${formaPagamentoLabel(forma as FormaPagamento)}`);
  const q = p.get("q");
  if (q) partes.push(`texto: ${q}`);
  return partes.join(" · ");
}

function casa(texto: string, alvo: string): boolean {
  if (!texto) return true;
  return normalizarBusca(alvo).includes(texto);
}

/**
 * Monta os grupos da paleta. `menu` é o `menuDoPerfil(role)` (só páginas que o perfil vê);
 * `texto` é o que foi digitado. Sem atalhos com modificador nas ações (decisão 5).
 */
export function montarGrupos(
  resposta: RespostaBusca | null,
  menu: GrupoMenu[],
  role: string,
  texto: string,
): ResultadoGrupos {
  const grupos: GrupoBusca[] = [];
  const t = normalizarBusca(texto);
  const paginasDoPerfil = menu.flatMap((g) => g.items);
  const veFechamento = paginasDoPerfil.some((i) => i.href === "/fechamento");

  if (resposta?.sugestao) {
    const s = resposta.sugestao;
    grupos.push({
      id: "sugestao",
      titulo: "Sugestão",
      itens: [{ chave: "sugestao", rotulo: s.titulo, url: s.url, detalhe: detalheDaSugestao(s.url), icone: "raio" }],
    });
  }

  if (resposta && resposta.vendas.length > 0) {
    grupos.push({
      id: "vendas",
      titulo: "Vendas",
      contador: `${resposta.vendas.length} de ${resposta.totalVendas}`,
      itens: resposta.vendas.map((v) => ({
        chave: `venda-${v.id}`,
        rotulo: v.cliente,
        codigo: `#${v.id}`,
        // O Histórico não filtra por id no `q` (é busca por texto); `edit` abre a venda direto.
        url: `/historico?edit=${v.id}`,
        valor: v.valor,
        data: v.data,
        statusAssinatura: v.statusAssinatura,
      })),
    });
  }

  if (resposta && resposta.clientes.length > 0) {
    grupos.push({
      id: "clientes",
      titulo: "Clientes",
      itens: resposta.clientes.map((c) => ({
        chave: `cliente-${c.id}`,
        rotulo: c.nome,
        url: `/historico?cliente=${c.id}`,
      })),
    });
  }

  const paginas = paginasDoPerfil.filter((i) => casa(t, i.label));
  if (paginas.length > 0) {
    grupos.push({
      id: "paginas",
      titulo: "Páginas",
      itens: paginas.map((i) => ({ chave: `pagina-${i.href}`, rotulo: i.label, url: i.href, icone: i.icone })),
    });
  }

  const acoes: ItemBusca[] = [
    { chave: "acao-venda", rotulo: "Nova venda rápida", url: "/venda-rapida", icone: "venda" },
    {
      chave: "acao-assinatura",
      rotulo: "Vendas aguardando assinatura",
      url: "/historico?assinatura=pendente",
      icone: "assinatura",
    },
  ];
  if (veFechamento) {
    acoes.push({ chave: "acao-fechamento", rotulo: "Fechamento do mês", url: "/fechamento", icone: "cadeado" });
  }
  const acoesVisiveis = acoes.filter((a) => casa(t, a.rotulo));
  if (acoesVisiveis.length > 0) {
    grupos.push({ id: "acoes", titulo: "Ações", itens: acoesVisiveis });
  }

  const perguntarIA =
    role === "admin" ? (texto.trim() ? `/inteligencia?pergunta=${encodeURIComponent(texto.trim())}` : "/inteligencia") : null;

  return { grupos, perguntarIA };
}

/**
 * Evento de janela que abre a paleta. O gatilho (qualquer botão na casca) o dispara e o
 * único `<BuscaRapida>` montado o escuta — assim não há contexto a envolver o layout.
 */
export const EVENTO_ABRIR_BUSCA = "bfx:abrir-busca";
