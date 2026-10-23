// Regras puras do composer (só interação de digitação; nada aqui envia mensagem).
import { LIMITE_ENVIO_BYTES, limiteMaximoEntrada, type TipoMidia } from '@/lib/whatsapp-midia-politica';

// Textos das respostas prontas: os mesmos de sempre. Escolher um SÓ preenche o campo.
export const PRONTAS = [
  { titulo: 'Boas-vindas', atalho: 'oi', texto: 'Olá! Seja bem-vindo à BFX. Como posso ajudar você hoje?' },
  { titulo: 'Pedir modelo', atalho: 'modelo', texto: 'Qual produto, modelo e quantidade você procura? Vou conferir o estoque e as condições disponíveis.' },
  { titulo: 'Pedido / entrega', atalho: 'entrega', texto: 'Pode informar o número do pedido e o que precisa verificar sobre a entrega ou o pós-venda?' },
  { titulo: 'Conferir pagamento', atalho: 'pagamento', texto: 'Recebemos sua mensagem sobre pagamento. Vamos conferir o comprovante e a baixa no sistema antes de confirmar a quitação.' },
  { titulo: 'Atendimento humano', atalho: 'humano', texto: 'Olá! Sou da equipe BFX e vou continuar seu atendimento por aqui.' },
  { titulo: 'Encerrar', atalho: 'fim', texto: 'Obrigado pelo contato com a BFX! Se precisar de mais alguma coisa, estamos à disposição.' },
] as const;
export type Pronta = (typeof PRONTAS)[number];

type Tecla = { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number };

/** Enter envia; Shift+Enter quebra linha; Enter durante composição (IME) nunca envia. */
export function acaoDaTecla(e: Tecla): 'enviar' | 'nada' {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return 'nada';
  return 'enviar';
}

/** "/" no início do campo (sem espaço depois) abre as respostas prontas; devolve o termo digitado. */
export function termoDeBarra(texto: string): string | null {
  return /^\/\S*$/.test(texto) ? texto.slice(1) : null;
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra por atalho, título ou texto, sem acento e sem diferenciar caixa. Quem começa pelo atalho digitado vem primeiro. */
export function filtrarProntas<T extends { titulo: string; texto: string; atalho?: string }>(lista: readonly T[], termo: string): T[] {
  const t = norm(termo.trim());
  if (!t) return [...lista];
  const porAtalho = lista.filter(p => p.atalho && norm(p.atalho).startsWith(t));
  const outras = lista.filter(p => !porAtalho.includes(p) && (norm(p.titulo).includes(t) || norm(p.texto).includes(t) || (p.atalho ? norm(p.atalho).includes(t) : false)));
  return [...porAtalho, ...outras];
}

// ---- Anexos (B13) ----

/** Opções do menu Anexar (ordem do artboard). `capture` só na câmera. */
export const OPCOES_ANEXO = [
  { nome: 'Documento', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv', capture: undefined },
  { nome: 'Fotos e vídeos', accept: 'image/*,video/*', capture: undefined },
  { nome: 'Câmera', accept: 'image/*', capture: 'environment' },
  { nome: 'Figurinha', accept: 'image/webp', capture: undefined },
] as const;
export type NomeOpcaoAnexo = (typeof OPCOES_ANEXO)[number]['nome'];

type ArquivoLike = { name: string; size: number; type: string };

/** Tipo de mídia pela opção escolhida; fotos/câmera olham o mime para separar vídeo. */
export function tipoDoAnexo(opcao: NomeOpcaoAnexo, a: ArquivoLike): TipoMidia {
  if (opcao === 'Documento') return 'documento';
  if (opcao === 'Figurinha') return 'figurinha';
  return a.type.startsWith('video/') ? 'video' : 'imagem';
}

const MB = 1024 * 1024;
const fmtLimite = (b: number) => (b >= MB ? `${b / MB} MB` : `${b / 1024} KB`);
const ROTULO_TIPO: Record<TipoMidia, string> = { imagem: 'A foto', video: 'O vídeo', audio: 'O áudio', figurinha: 'A figurinha', documento: 'O documento' };

/** Validação no cliente ANTES de enviar: HEIC, vazio, teto de envio (9 MB) e limite do tipo. */
export function validarAnexo(tipo: TipoMidia, a: ArquivoLike): { ok: true } | { ok: false; message: string } {
  if (/^image\/hei[cf]/i.test(a.type) || /\.(heic|heif)$/i.test(a.name)) return { ok: false, message: 'Formato HEIC não é suportado: use JPEG.' };
  if (a.size === 0) return { ok: false, message: 'O arquivo está vazio.' };
  const limite = Math.min(LIMITE_ENVIO_BYTES, limiteMaximoEntrada(tipo));
  if (a.size > limite) return { ok: false, message: `${ROTULO_TIPO[tipo]} passa do limite de ${fmtLimite(limite)} para envio.` };
  return { ok: true };
}

/** Campo vazio: o botão redondo é microfone; com texto, é Enviar. */
export function botaoPrincipal(texto: string): 'microfone' | 'enviar' {
  return texto.trim() ? 'enviar' : 'microfone';
}
