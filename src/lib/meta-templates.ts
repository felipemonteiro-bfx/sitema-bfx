/**
 * Listagem dos templates aprovados na conta WhatsApp Business (WABA).
 *
 * A UI de campanhas monta a galeria a partir daqui em vez de manter uma cópia
 * em código, que sairia de sincronia com o que está realmente aprovado na Meta
 * e faria a campanha falhar só no disparo.
 */
import { prisma } from "@/lib/db";

export type VariavelTemplate = { indice: number };

export type TemplateAprovado = {
  nome: string;
  idioma: string;
  categoria: string;
  corpo: string;
  /** Quantidade de variáveis distintas ({{1}}, {{2}}, ...) no corpo. */
  variaveis: number;
};

type ComponenteGraph = { type?: string; text?: string };
type TemplateGraph = {
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: ComponenteGraph[];
};

const CACHE_MS = 5 * 60 * 1000;
let cache: { em: number; dados: TemplateAprovado[] } | null = null;

export function limparCacheTemplates(): void {
  cache = null;
}

/**
 * Conta variáveis distintas no corpo do template.
 * Usa split em vez de regex com exec — o projeto bloqueia esse padrão.
 */
function contarVariaveis(texto: string): number {
  const indices = new Set<string>();
  const partes = texto.split("{{");
  for (let i = 1; i < partes.length; i++) {
    const fecha = partes[i]!.split("}}")[0];
    if (fecha && fecha.trim().length > 0) indices.add(fecha.trim());
  }
  return indices.size;
}

export async function listarTemplatesAprovados(
  forcarAtualizacao = false
): Promise<TemplateAprovado[]> {
  if (!forcarAtualizacao && cache && Date.now() - cache.em < CACHE_MS) {
    return cache.dados;
  }

  const cfg = (await prisma.config.findFirst()) as Record<string, unknown> | null;
  const wabaId = (cfg?.metaWhatsappBusinessId as string | undefined)?.trim();
  const token = (cfg?.metaWhatsappToken as string | undefined)?.trim();
  const versao = (cfg?.metaWhatsappApiVersion as string | undefined)?.trim() || "v21.0";
  if (!wabaId || !token) return [];

  try {
    const url = `https://graph.facebook.com/${versao}/${wabaId}/message_templates?limit=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error("[MetaTemplates] HTTP", res.status);
      return [];
    }
    const json = (await res.json()) as { data?: TemplateGraph[] };

    const dados: TemplateAprovado[] = [];
    for (const t of json.data ?? []) {
      if (t.status !== "APPROVED" || !t.name) continue;
      const body = (t.components ?? []).find((c) => c.type === "BODY");
      const corpo = body?.text ?? "";
      dados.push({
        nome: t.name,
        idioma: t.language ?? "pt_BR",
        categoria: t.category ?? "UTILITY",
        corpo,
        variaveis: contarVariaveis(corpo),
      });
    }

    cache = { em: Date.now(), dados };
    return dados;
  } catch (err) {
    console.error("[MetaTemplates]", err);
    return [];
  }
}
