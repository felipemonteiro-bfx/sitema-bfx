import { cache } from "react";
const NCM_URL =
  "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json?perfil=PUBLICO";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type NcmItem = {
  codigo: string;
  descricao: string;
};

type NcmRawItem = {
  Codigo?: string;
  Descricao?: string;
};

type NcmApiResponse = {
  Nomenclaturas?: NcmRawItem[];
};

let cacheData: { items: NcmItem[]; fetchedAt: number } | null = null;

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function normalize(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

async function fetchNcmData(): Promise<NcmItem[]> {
  const res = await fetch(NCM_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao baixar tabela NCM");
  const raw = (await res.json()) as NcmRawItem[] | NcmApiResponse;
  const items = Array.isArray(raw) ? raw : raw.Nomenclaturas ?? [];
  return items
    .map((item) => ({
      codigo: item.Codigo ?? "",
      descricao: stripHtml(item.Descricao ?? ""),
    }))
    .filter((item) => item.codigo && item.descricao);
}

export const getNcmItems = cache(async () => {
  const now = Date.now();
  if (cacheData && now - cacheData.fetchedAt < CACHE_TTL_MS) {
    return cacheData.items;
  }

  const items = await fetchNcmData();

  cacheData = { items, fetchedAt: now };
  return items;
});

export async function searchNcm(query: string, limit = 12) {
  const items = await getNcmItems();
  const q = normalize(query);
  if (!q) return [] as NcmItem[];

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = items
    .map((item) => {
      const desc = normalize(item.descricao);
      const code = item.codigo.replace(/\D/g, "");
      let score = 0;

      if (code.startsWith(q.replace(/\D/g, ""))) score += 5;

      for (const t of tokens) {
        if (desc.includes(t)) score += 2;
      }

      if (desc.startsWith(q)) score += 3;
      if (desc.includes(q)) score += 1;

      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);

  return scored;
}
