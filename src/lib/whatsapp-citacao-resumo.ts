/**
 * Resumo de uma mensagem para a CITAÇÃO (bloco no topo da bolha e faixa "Respondendo a" do composer).
 * Puro e sem Prisma: roda no servidor (resolução em lote) e no navegador (a própria bolha vira citação ao
 * clicar em Responder).
 */

export type MidiaCitada = {
  id: string; tipo: string; status: string; voz: boolean; nomeExibicao: string | null; legenda: string | null;
};

export type MensagemCitavel = { id: number; direcao: string; tipo?: string | null; corpo: string; midia?: MidiaCitada | null };

export type ResumoCitado = {
  id: number;
  direcao: string;
  tipo: string;
  /** Texto (mensagem de texto) ou rótulo fixo do tipo ("Mensagem de voz", "Foto", nome do documento...). */
  corpoResumo: string;
  legenda?: string;
  /** Mídia de áudio salva: o cliente lê a duração do próprio arquivo. */
  midiaId?: string;
  /** Foto, vídeo ou figurinha salvos: miniatura à direita. */
  miniaturaId?: string;
  /** A mensagem citada não está no banco. */
  indisponivel?: true;
};

const TEXTO_MAX = 200;
const ROTULO: Record<string, string> = { audio: "Áudio", imagem: "Foto", video: "Vídeo", figurinha: "Figurinha", documento: "Documento" };
const COM_MINIATURA = ["imagem", "video", "figurinha"];

export const CITACAO_INDISPONIVEL: ResumoCitado = { id: 0, direcao: "", tipo: "indisponivel", corpoResumo: "Mensagem indisponível", indisponivel: true };

const limpo = (s: string) => s.replace(/\s+/g, " ").trim();

export function resumirMensagem(m: MensagemCitavel): ResumoCitado {
  const tipo = m.tipo ?? "texto";
  const base = { id: m.id, direcao: m.direcao, tipo };
  if (tipo === "texto") return { ...base, corpoResumo: limpo(m.corpo).slice(0, TEXTO_MAX) };
  const md = m.midia;
  const salva = md?.status === "salva";
  const legenda = md?.legenda ? limpo(md.legenda).slice(0, TEXTO_MAX) : undefined;
  const r: ResumoCitado = { ...base, corpoResumo: ROTULO[tipo] ?? "Mensagem" };
  if (tipo === "audio") {
    if (md?.voz) r.corpoResumo = "Mensagem de voz";
    if (salva && md) r.midiaId = md.id;
  }
  if (tipo === "documento" && md?.nomeExibicao) r.corpoResumo = md.nomeExibicao;
  if (legenda && tipo !== "audio" && tipo !== "figurinha") r.legenda = legenda;
  if (salva && md && COM_MINIATURA.includes(tipo)) r.miniaturaId = md.id;
  return r;
}
