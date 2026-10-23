// Modelo Whisper no navegador: revisão fixa, tabela de sha256 e recusa em divergência.
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { MODELO_ID, REVISAO, HASHES, caminhoDoModelo, verificarBytes, criarFetchVerificado, MSG_MODELO_NAO_CONFERE } from '@/app/(app)/crm/atendimento/transcricao-modelo';

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const bytes = new TextEncoder().encode('conteudo de exemplo do modelo');

describe('tabela fixa do modelo', () => {
  it('revisão é um SHA de commit de 40 hex e o modelo é o whisper-base da comunidade ONNX', () => {
    expect(REVISAO).toMatch(/^[0-9a-f]{40}$/);
    expect(MODELO_ID).toBe('onnx-community/whisper-base');
  });
  it('cada entrada tem sha256 de 64 hex e inclui os dois .onnx quantizados', () => {
    for (const [arq, h] of Object.entries(HASHES)) expect(h, arq).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(HASHES)).toEqual(expect.arrayContaining(['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx', 'tokenizer.json', 'config.json']));
  });
  it('caminhoDoModelo só reconhece URLs do repositório na revisão fixa', () => {
    const base = `https://huggingface.co/${MODELO_ID}/resolve/${REVISAO}/`;
    expect(caminhoDoModelo(`${base}config.json`)).toBe('config.json');
    expect(caminhoDoModelo(`${base}onnx/encoder_model_quantized.onnx`)).toBe('onnx/encoder_model_quantized.onnx');
    expect(caminhoDoModelo(`https://huggingface.co/${MODELO_ID}/resolve/main/config.json`)).toBeNull();
    expect(caminhoDoModelo('https://exemplo.com/x.json')).toBeNull();
  });
});

describe('verificarBytes', () => {
  it('aceita quando o sha256 confere e recusa quando diverge', async () => {
    expect(await verificarBytes(bytes, sha(bytes))).toBe(true);
    expect(await verificarBytes(new Uint8Array([...bytes, 1]), sha(bytes))).toBe(false);
  });
});

describe('fetch verificado', () => {
  const caminho = 'config.json';
  const url = `https://huggingface.co/${MODELO_ID}/resolve/${REVISAO}/${caminho}`;
  const base = (corpo: Uint8Array) => vi.fn(async () => new Response(corpo as BodyInit, { status: 200, headers: { 'content-length': String(corpo.length) } }));

  it('devolve o corpo quando o hash confere e relata progresso', async () => {
    const progresso = vi.fn();
    const f = criarFetchVerificado(base(bytes) as unknown as typeof fetch, { tabela: { [caminho]: sha(bytes) }, aoProgresso: progresso });
    const res = await f(url);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    expect(progresso).toHaveBeenCalledWith(expect.objectContaining({ arquivo: caminho, carregado: bytes.length }));
  });
  it('hash divergente lança o erro fixo e não devolve corpo', async () => {
    const f = criarFetchVerificado(base(bytes) as unknown as typeof fetch, { tabela: { [caminho]: 'a'.repeat(64) } });
    await expect(f(url)).rejects.toThrow(MSG_MODELO_NAO_CONFERE);
    expect(MSG_MODELO_NAO_CONFERE).toBe('Modelo de voz não confere; transcrição desativada');
  });
  it('arquivo fora da tabela do repositório vira 404 (opcional ausente), sem baixar', async () => {
    const b = base(bytes);
    const f = criarFetchVerificado(b as unknown as typeof fetch, { tabela: { [caminho]: sha(bytes) } });
    const res = await f(`https://huggingface.co/${MODELO_ID}/resolve/${REVISAO}/outro.json`);
    expect(res.status).toBe(404);
    expect(b).not.toHaveBeenCalled();
  });
  it('URL que não é do modelo passa direto ao fetch original', async () => {
    const b = base(bytes);
    const f = criarFetchVerificado(b as unknown as typeof fetch, { tabela: {} });
    await f('https://exemplo.com/a');
    expect(b).toHaveBeenCalledTimes(1);
  });
});
