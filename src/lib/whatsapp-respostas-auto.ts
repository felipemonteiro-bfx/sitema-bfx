/**
 * Regra única das respostas automáticas do WhatsApp (2026-10-17). Pura: sem prisma e com o ambiente
 * por parâmetro, para o servidor, o webhook, a tela de atendimento e as Configurações decidirem igual.
 *
 * `whatsappPreAtendimento`: 0 desligado; 2 ligado; 1 era o gateway externo e vale como ligado até o
 * dado ser normalizado (scripts/sql/2026-10-17-whatsapp-respostas-auto.sql).
 */

export const MODELO_RESERVA = 'gpt-4o';
const SEGREDO_MCP_MIN = 32;
/** Âncora do bloco de URL e chave do LiteLLM na aba IA das Configurações. */
export const HREF_CONFIGURAR_LITELLM = '/configuracoes?tab=ia#litellm-config';
export const AVISO_GATEWAY_EXTERNO = 'Confira que o gateway externo do mcp-bfx está desligado, para o cliente não receber duas respostas.';

export function respostasAutoLigadas(cfg: { whatsappPreAtendimento?: number | null } | null | undefined): boolean {
  const v = cfg?.whatsappPreAtendimento;
  return v === 1 || v === 2;
}

type CfgIa = { litellmUrl?: string | null; litellmKey?: string | null; litellmModel?: string | null };
/** `process.env` ou um objeto de teste; só LITELLM_URL, LITELLM_KEY, LITELLM_MODEL e MCP_AGENTE_SECRET são lidos. */
type EnvIa = Record<string, string | undefined>;

const aparar = (v: string | null | undefined) => (typeof v === 'string' ? v.trim() : '');

export type SituacaoProvedor = 'ok' | 'nao_meta' | 'sem_credencial';

/**
 * Mesma regra de `resolveWhatsAppProviders` (whatsapp-provider.ts): o provedor é meta_cloud (config ou
 * WHATSAPP_PROVIDER) e há token e número (config ou ambiente). Sem isso o primário é nulo e nada é enviado.
 */
export function situacaoProvedor(
  cfg: { whatsappProvider?: string | null; metaWhatsappToken?: string | null; metaWhatsappPhoneNumberId?: string | null } | null | undefined,
  env: EnvIa,
): SituacaoProvedor {
  const nome = aparar(cfg?.whatsappProvider) || aparar(env.WHATSAPP_PROVIDER) || 'evolution';
  if (nome !== 'meta_cloud') return 'nao_meta';
  const token = aparar(cfg?.metaWhatsappToken) || aparar(env.META_WHATSAPP_TOKEN);
  const numero = aparar(cfg?.metaWhatsappPhoneNumberId) || aparar(env.META_WHATSAPP_PHONE_NUMBER_ID);
  return token && numero ? 'ok' : 'sem_credencial';
}

export type MotivoSemIa = 'sem_litellm' | 'sem_segredo_mcp';
export type DisponibilidadeIa = { disponivel: boolean; motivo: MotivoSemIa | null; modelo: string };

export function disponibilidadeIa(cfg: CfgIa | null | undefined, env: EnvIa): DisponibilidadeIa {
  const url = aparar(cfg?.litellmUrl) || aparar(env.LITELLM_URL);
  const chave = aparar(cfg?.litellmKey) || aparar(env.LITELLM_KEY);
  const modelo = aparar(cfg?.litellmModel) || aparar(env.LITELLM_MODEL) || MODELO_RESERVA;
  if (!url || !chave) return { disponivel: false, motivo: 'sem_litellm', modelo };
  if ((env.MCP_AGENTE_SECRET ?? '').length < SEGREDO_MCP_MIN) return { disponivel: false, motivo: 'sem_segredo_mcp', modelo };
  return { disponivel: true, motivo: null, modelo };
}

const TITULO_SO_REGRAS = 'Só respostas por regras.';
export const ESTADO_DESLIGADO: EstadoRespostasAuto = { tom: 'neutro', titulo: 'Desligado.', texto: 'As mensagens chegam só para a equipe.' };

export type EstadoRespostasAuto = {
  tom: 'neutro' | 'alerta' | 'ok';
  titulo: string;
  texto: string;
  acao?: { rotulo: string; href: string };
  /** Linha secundária e permanente, em tom discreto. */
  aviso?: string;
};

export function estadoRespostasAuto(e: {
  ligado: boolean;
  masterLigado: boolean;
  provedor: SituacaoProvedor;
  ia: DisponibilidadeIa;
}): EstadoRespostasAuto {
  if (!e.ligado) return ESTADO_DESLIGADO;
  if (!e.masterLigado) {
    return {
      tom: 'alerta', titulo: 'Nada está sendo enviado.', texto: 'Os envios automáticos estão desligados no geral.',
      acao: { rotulo: 'Ligar envios', href: '#whatsappAutoEnabled' },
    };
  }
  if (e.provedor === 'sem_credencial') {
    return {
      tom: 'alerta', titulo: 'Nada está sendo respondido.', texto: 'Falta configurar o token ou o número da API oficial da Meta.',
      acao: { rotulo: 'Configurar conexão', href: '#whatsappProvider' },
    };
  }
  if (e.provedor === 'nao_meta') {
    return {
      tom: 'alerta', titulo: 'Nada está sendo respondido.', texto: 'As respostas automáticas só funcionam com a API oficial da Meta.',
      acao: { rotulo: 'Trocar provedor', href: '#whatsappProvider' },
    };
  }
  if (e.ia.motivo === 'sem_litellm') {
    return {
      tom: 'alerta', titulo: TITULO_SO_REGRAS, texto: 'Falta a URL ou a chave do LiteLLM.',
      acao: { rotulo: 'Configurar LiteLLM', href: HREF_CONFIGURAR_LITELLM },
    };
  }
  if (e.ia.motivo === 'sem_segredo_mcp') {
    return { tom: 'alerta', titulo: TITULO_SO_REGRAS, texto: 'O acesso da IA aos dados da BFX não está configurado no servidor.' };
  }
  return { tom: 'ok', titulo: 'IA respondendo.', texto: `Consulta compras, parcelas e catálogo pelo MCP da BFX · modelo ${e.ia.modelo}.`, aviso: AVISO_GATEWAY_EXTERNO };
}

/** Quem responde as perguntas sobre compras, parcelas, boletos e produtos (2ª linha da tabela da tela). */
export function quemRespondePerguntas(estado: EstadoRespostasAuto): 'IA com MCP' | 'Regras (sem modelo)' | 'Ninguém' {
  if (estado.tom === 'ok') return 'IA com MCP';
  if (estado.titulo === TITULO_SO_REGRAS) return 'Regras (sem modelo)';
  return 'Ninguém';
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Pedido de humano ou de sair: o automático não responde (ATENDENTE pausa; SAIR/PARAR calam até VOLTAR). */
export const humanoOuSaida = (t: string) => /\b(humano|atendente|vendedor|parar|sair|cancelar mensagens)\b/.test(normalizar(t));
/** Saudação/menu: resposta de regras com botões, nunca da IA. */
export const ehMenu = (t: string) => /^(oi|ola|bom dia|boa tarde|boa noite|menu|ajuda|voltar)[!?.\s]*$/.test(normalizar(t).trim());
/** Única regra de "esta mensagem vai para a IA": usada pelo atendimento e pelo webhook (que só adia o que vai para a IA). */
export const vaiParaIa = (t: string) => !ehMenu(t) && !!t.trim() && !t.startsWith('[') && !humanoOuSaida(t);

/** Nada sai para o cliente (desligado, envios gerais desligados, provedor não-Meta ou sem credencial). */
export function nadaEnviado(estado: EstadoRespostasAuto): boolean {
  return quemRespondePerguntas(estado) === 'Ninguém';
}
