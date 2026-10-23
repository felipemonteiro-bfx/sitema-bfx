// Modelo de voz (Whisper base, ONNX q8) que roda no navegador. Tudo aqui é puro/seguro para o worker:
// revisão do repositório fixa e sha256 de cada arquivo conferido ANTES de o byte ir ao Cache Storage.

export const MODELO_ID = 'onnx-community/whisper-base';
/** Commit fixo do repositório no Hugging Face (nunca `main`). */
export const REVISAO = '1846881b6b3a3024392c1eea3ad983695bc23925';
/** Gravado em `WhatsAppMidia.transcricaoModelo` pelo SERVIDOR; não vem do cliente. */
export const MSG_MODELO_NAO_CONFERE = 'Modelo de voz não confere; transcrição desativada';

/** sha256 (hex) de cada arquivo do modelo nesta revisão. Os .onnx vêm do `lfs.oid` da API do Hugging Face. */
export const HASHES: Readonly<Record<string, string>> = {
  'onnx/encoder_model_quantized.onnx': '5862993336bf33acd23736071aae2b32261d3b1b2f37780194460d4ef974dd46',
  'onnx/decoder_model_merged_quantized.onnx': 'fa3ef9902734ce5ae6f9ef2bdb2ba9a6c4b5785b09f4f420ce036573dc9d090b',
  'config.json': 'f4d0608f7d918166da7edb3e188de5ef1bfe70d9802e785d271fd88111e9cf4b',
  'generation_config.json': '61070cf8de25b1e9256e8e102ded49d8d24a8369ed36ef84fdf21549e68125a0',
  'preprocessor_config.json': 'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d',
  'tokenizer.json': '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566',
  'tokenizer_config.json': '2e036e4dbacfdeb7242c7d4ec4149f4a16e86026048f94d1637e3a8ee9c6a573',
  'added_tokens.json': '9715fd2243b6f06a5858b5e32950d2853f73dd5bc201aafcf76f5082a2d8acd1',
};

const PREFIXO = `https://huggingface.co/${MODELO_ID}/resolve/${REVISAO}/`;

/** Caminho relativo do arquivo quando a URL é do repositório na revisão fixa; senão `null`. */
export function caminhoDoModelo(url: string): string | null {
  if (!url.startsWith(PREFIXO)) return null;
  const rel = url.slice(PREFIXO.length).split('?')[0] ?? '';
  return rel && !rel.includes('..') ? rel : null;
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');

export async function verificarBytes(bytes: Uint8Array, esperado: string): Promise<boolean> {
  const h = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return hex(h) === esperado.toLowerCase();
}

export type ProgressoArquivo = { arquivo: string; carregado: number; total: number };

/**
 * `fetch` que só aceita do repositório fixo arquivos da tabela, lê o corpo inteiro (relatando progresso), confere o
 * sha256 e só então devolve a resposta. Divergência lança `MSG_MODELO_NAO_CONFERE`. Arquivo do repositório que não
 * está na tabela vira 404 (o transformers.js trata como opcional ausente). Outras URLs passam direto.
 */
export function criarFetchVerificado(
  base: typeof fetch,
  opcoes: { tabela?: Readonly<Record<string, string>>; aoProgresso?: (p: ProgressoArquivo) => void } = {},
): typeof fetch {
  const tabela = opcoes.tabela ?? HASHES;
  return (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const arquivo = caminhoDoModelo(url);
    if (arquivo === null) return base(entrada, init);
    const esperado = tabela[arquivo];
    if (!esperado) return new Response(null, { status: 404 });
    const res = await base(url, { ...init, redirect: 'follow' });
    if (!res.ok) return res;
    const total = Number(res.headers.get('content-length')) || 0;
    const partes: Uint8Array[] = [];
    let carregado = 0;
    if (res.body) {
      const leitor = res.body.getReader();
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        partes.push(value);
        carregado += value.length;
        opcoes.aoProgresso?.({ arquivo, carregado, total: total || carregado });
      }
    } else {
      const tudo = new Uint8Array(await res.arrayBuffer());
      partes.push(tudo); carregado = tudo.length;
      opcoes.aoProgresso?.({ arquivo, carregado, total: carregado });
    }
    const bytes = new Uint8Array(carregado);
    let pos = 0;
    for (const p of partes) { bytes.set(p, pos); pos += p.length; }
    if (!(await verificarBytes(bytes, esperado))) throw new Error(MSG_MODELO_NAO_CONFERE);
    return new Response(bytes as BodyInit, { status: 200, headers: { 'content-type': res.headers.get('content-type') ?? 'application/octet-stream', 'content-length': String(bytes.length) } });
  }) as typeof fetch;
}
