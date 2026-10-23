// Copia o runtime WASM do ONNX Runtime (usado pelo Whisper no navegador) para public/ort/, servido em /ort/.
// Só os arquivos que o transformers.js empacota (versão exata do ORT dele). Roda no `predev` e no `prebuild`;
// public/ort/ não vai para o git (são ~22 MB gerados). Idempotente.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'node_modules', '@huggingface', 'transformers', 'dist');
const destino = join(raiz, 'public', 'ort');
const arquivos = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];

if (!existsSync(origem)) {
  console.warn('[copiar-ort] @huggingface/transformers não instalado; nada a copiar.');
  process.exit(0);
}
mkdirSync(destino, { recursive: true });
for (const a of arquivos) {
  const de = join(origem, a);
  const para = join(destino, a);
  if (!existsSync(de)) { console.error(`[copiar-ort] arquivo ausente no pacote: ${a}`); process.exit(1); }
  if (!existsSync(para) || statSync(para).size !== statSync(de).size) copyFileSync(de, para);
}
console.log(`[copiar-ort] ${arquivos.length} arquivos em public/ort/`);
