import { describe, expect, it } from 'vitest';
import { disponibilidadeIa, estadoRespostasAuto, nadaEnviado, quemRespondePerguntas, respostasAutoLigadas, situacaoProvedor, vaiParaIa } from '@/lib/whatsapp-respostas-auto';

const SEGREDO = 'x'.repeat(32);
const cfgOk = { litellmUrl: 'https://llm.exemplo.test', litellmKey: 'sk-fake', litellmModel: 'bfx-atendimento' };

describe('respostasAutoLigadas', () => {
  it.each([[0, false], [null, false], [undefined, false], [1, true], [2, true]])('valor %s -> %s', (v, esperado) => {
    expect(respostasAutoLigadas({ whatsappPreAtendimento: v })).toBe(esperado);
  });
  it('sem config', () => {
    expect(respostasAutoLigadas(null)).toBe(false);
  });
});

describe('disponibilidadeIa', () => {
  it('disponível com URL, chave e segredo', () => {
    expect(disponibilidadeIa(cfgOk, { MCP_AGENTE_SECRET: SEGREDO })).toEqual({ disponivel: true, motivo: null, modelo: 'bfx-atendimento' });
  });
  it('sem URL: sem_litellm', () => {
    expect(disponibilidadeIa({ ...cfgOk, litellmUrl: null }, { MCP_AGENTE_SECRET: SEGREDO })).toMatchObject({ disponivel: false, motivo: 'sem_litellm' });
  });
  it('sem chave: sem_litellm', () => {
    expect(disponibilidadeIa({ ...cfgOk, litellmKey: '' }, { MCP_AGENTE_SECRET: SEGREDO })).toMatchObject({ disponivel: false, motivo: 'sem_litellm' });
  });
  it('usa URL, chave e modelo do ambiente quando a config não tem', () => {
    const r = disponibilidadeIa({}, { LITELLM_URL: 'llm.test', LITELLM_KEY: 'k', LITELLM_MODEL: 'do-env', MCP_AGENTE_SECRET: SEGREDO });
    expect(r).toEqual({ disponivel: true, motivo: null, modelo: 'do-env' });
  });
  it('segredo curto ou ausente: sem_segredo_mcp', () => {
    expect(disponibilidadeIa(cfgOk, { MCP_AGENTE_SECRET: 'x'.repeat(31) })).toMatchObject({ disponivel: false, motivo: 'sem_segredo_mcp' });
    expect(disponibilidadeIa(cfgOk, {})).toMatchObject({ disponivel: false, motivo: 'sem_segredo_mcp' });
  });
  it('modelo de reserva gpt-4o quando nada define o modelo', () => {
    expect(disponibilidadeIa({ litellmUrl: 'u', litellmKey: 'k' }, { MCP_AGENTE_SECRET: SEGREDO }).modelo).toBe('gpt-4o');
  });
  it('sem LiteLLM tem prioridade sobre sem segredo', () => {
    expect(disponibilidadeIa({}, {}).motivo).toBe('sem_litellm');
  });
});

describe('estadoRespostasAuto', () => {
  const iaOk = { disponivel: true, motivo: null, modelo: 'bfx-atendimento' } as const;
  const base = { ligado: true, masterLigado: true, provedor: 'ok' as const, ia: iaOk };
  it('desligado', () => {
    expect(estadoRespostasAuto({ ...base, ligado: false })).toEqual({ tom: 'neutro', titulo: 'Desligado.', texto: 'As mensagens chegam só para a equipe.' });
  });
  it('envios gerais desligados', () => {
    expect(estadoRespostasAuto({ ...base, masterLigado: false })).toEqual({
      tom: 'alerta', titulo: 'Nada está sendo enviado.', texto: 'Os envios automáticos estão desligados no geral.',
      acao: { rotulo: 'Ligar envios', href: '#whatsappAutoEnabled' },
    });
  });
  it('provedor que não é Meta', () => {
    expect(estadoRespostasAuto({ ...base, provedor: 'nao_meta' })).toEqual({
      tom: 'alerta', titulo: 'Nada está sendo respondido.', texto: 'As respostas automáticas só funcionam com a API oficial da Meta.',
      acao: { rotulo: 'Trocar provedor', href: '#whatsappProvider' },
    });
  });
  it('sem LiteLLM', () => {
    expect(estadoRespostasAuto({ ...base, ia: { disponivel: false, motivo: 'sem_litellm', modelo: 'gpt-4o' } })).toEqual({
      tom: 'alerta', titulo: 'Só respostas por regras.', texto: 'Falta a URL ou a chave do LiteLLM.',
      acao: { rotulo: 'Configurar LiteLLM', href: '/configuracoes?tab=ia#litellm-config' },
    });
  });
  it('sem segredo MCP, sem link', () => {
    const r = estadoRespostasAuto({ ...base, ia: { disponivel: false, motivo: 'sem_segredo_mcp', modelo: 'x' } });
    expect(r).toEqual({ tom: 'alerta', titulo: 'Só respostas por regras.', texto: 'O acesso da IA aos dados da BFX não está configurado no servidor.' });
    expect(r.acao).toBeUndefined();
  });
  it('IA respondendo mostra o modelo e o aviso permanente do gateway externo', () => {
    expect(estadoRespostasAuto(base)).toEqual({
      tom: 'ok', titulo: 'IA respondendo.', texto: 'Consulta compras, parcelas e catálogo pelo MCP da BFX · modelo bfx-atendimento.',
      aviso: 'Confira que o gateway externo do mcp-bfx está desligado, para o cliente não receber duas respostas.',
    });
  });
  it('provedor Meta sem credencial', () => {
    expect(estadoRespostasAuto({ ...base, provedor: 'sem_credencial' })).toEqual({
      tom: 'alerta', titulo: 'Nada está sendo respondido.', texto: 'Falta configurar o token ou o número da API oficial da Meta.',
      acao: { rotulo: 'Configurar conexão', href: '#whatsappProvider' },
    });
  });
  it('prioridade: master vence provedor, provedor vence IA', () => {
    const ruim = { disponivel: false, motivo: 'sem_litellm', modelo: 'x' } as const;
    expect(estadoRespostasAuto({ ligado: true, masterLigado: false, provedor: 'nao_meta', ia: ruim }).titulo).toBe('Nada está sendo enviado.');
    expect(estadoRespostasAuto({ ligado: true, masterLigado: true, provedor: 'nao_meta', ia: ruim }).titulo).toBe('Nada está sendo respondido.');
  });
});

describe('quemRespondePerguntas (2ª linha da tabela)', () => {
  const ok = { disponivel: true, motivo: null, modelo: 'm' } as const;
  const base = { ligado: true, masterLigado: true, provedor: 'ok' as const, ia: ok };
  it('IA com MCP, regras ou ninguém conforme o estado', () => {
    expect(quemRespondePerguntas(estadoRespostasAuto(base))).toBe('IA com MCP');
    expect(quemRespondePerguntas(estadoRespostasAuto({ ...base, ia: { disponivel: false, motivo: 'sem_litellm', modelo: 'm' } }))).toBe('Regras (sem modelo)');
    expect(quemRespondePerguntas(estadoRespostasAuto({ ...base, ia: { disponivel: false, motivo: 'sem_segredo_mcp', modelo: 'm' } }))).toBe('Regras (sem modelo)');
    expect(quemRespondePerguntas(estadoRespostasAuto({ ...base, masterLigado: false }))).toBe('Ninguém');
    expect(quemRespondePerguntas(estadoRespostasAuto({ ...base, provedor: 'nao_meta' }))).toBe('Ninguém');
    expect(quemRespondePerguntas(estadoRespostasAuto({ ...base, ligado: false }))).toBe('Ninguém');
  });
});

describe('situacaoProvedor (mesma regra do resolveWhatsAppProviders)', () => {
  const meta = { whatsappProvider: 'meta_cloud', metaWhatsappToken: 'tok', metaWhatsappPhoneNumberId: '123' };
  it('ok com provedor, token e número', () => {
    expect(situacaoProvedor(meta, {})).toBe('ok');
  });
  it('evolution ou ausente é nao_meta', () => {
    expect(situacaoProvedor({ ...meta, whatsappProvider: 'evolution' }, {})).toBe('nao_meta');
    expect(situacaoProvedor({}, {})).toBe('nao_meta');
  });
  it('meta_cloud sem token ou sem número é sem_credencial', () => {
    expect(situacaoProvedor({ ...meta, metaWhatsappToken: '' }, {})).toBe('sem_credencial');
    expect(situacaoProvedor({ ...meta, metaWhatsappPhoneNumberId: null }, {})).toBe('sem_credencial');
  });
  it('provedor vazio na config usa WHATSAPP_PROVIDER do ambiente; token e número também', () => {
    expect(situacaoProvedor({ whatsappProvider: '' }, { WHATSAPP_PROVIDER: 'meta_cloud', META_WHATSAPP_TOKEN: 't', META_WHATSAPP_PHONE_NUMBER_ID: '9' })).toBe('ok');
    expect(situacaoProvedor({ whatsappProvider: '' }, { WHATSAPP_PROVIDER: 'meta_cloud' })).toBe('sem_credencial');
  });
  it('espaços em branco não contam como credencial', () => {
    expect(situacaoProvedor({ ...meta, metaWhatsappToken: '   ' }, {})).toBe('sem_credencial');
  });
});

describe('trim em disponibilidadeIa', () => {
  it('URL e chave só com espaços não contam', () => {
    expect(disponibilidadeIa({ litellmUrl: '   ', litellmKey: 'k' }, { MCP_AGENTE_SECRET: 'x'.repeat(32) }).motivo).toBe('sem_litellm');
    expect(disponibilidadeIa({ litellmUrl: 'u', litellmKey: ' \n ' }, { MCP_AGENTE_SECRET: 'x'.repeat(32) }).motivo).toBe('sem_litellm');
    expect(disponibilidadeIa({ litellmUrl: ' ', litellmKey: ' ' }, { LITELLM_URL: ' llm.test ', LITELLM_KEY: ' k ', MCP_AGENTE_SECRET: 'x'.repeat(32) }).disponivel).toBe(true);
  });
});

describe('vaiParaIa (o que de fato vai para a IA)', () => {
  it.each(['tem iphone?', 'quando vence minha parcela?', 'qual o preço do 13'])('%s vai', (t) => {
    expect(vaiParaIa(t)).toBe(true);
  });
  it.each(['oi', 'Olá!', 'bom dia', 'menu', 'voltar', 'ATENDENTE', 'quero falar com humano', 'SAIR', 'parar', '', '   ', '[Foto] legenda'])('%j não vai', (t) => {
    expect(vaiParaIa(t)).toBe(false);
  });
});

describe('nadaEnviado', () => {
  const ok = { disponivel: true, motivo: null, modelo: 'm' } as const;
  const base = { ligado: true, masterLigado: true, provedor: 'ok' as const, ia: ok };
  it('verdadeiro quando nada sai: desligado, master, não-Meta, sem credencial', () => {
    for (const parte of [{ ligado: false }, { masterLigado: false }, { provedor: 'nao_meta' as const }, { provedor: 'sem_credencial' as const }]) {
      expect(nadaEnviado(estadoRespostasAuto({ ...base, ...parte }))).toBe(true);
    }
  });
  it('falso com IA ou só regras', () => {
    expect(nadaEnviado(estadoRespostasAuto(base))).toBe(false);
    expect(nadaEnviado(estadoRespostasAuto({ ...base, ia: { disponivel: false, motivo: 'sem_litellm', modelo: 'm' } }))).toBe(false);
  });
});
