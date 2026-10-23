# Atendimento WhatsApp: transcrição de áudio e gravação Opus em WebAssembly

Decisões do André (17/10): transcrição **no navegador do atendente**, modelo **Whisper base (~80 MB)**, gravação com **encoder Opus em WASM**. Artboard: canvas "Atendimento — todos os tipos de mensagem (tela única)", grupo "Transcrição em WebAssembly".

## A. Transcrição (Whisper em WASM, no navegador)

### Hoje
Mensagem de voz só toca. A IA (MCP) e a equipe não têm o texto do áudio.

### Esperado
1. Botão "Transcrever" sob cada áudio (entrada e saída) sem transcrição.
2. Ao clicar: um Web Worker carrega `@huggingface/transformers` (transformers.js, Apache-2.0, ONNX Runtime Web em WASM) e o modelo `onnx-community/whisper-base` quantizado (q8, ~80 MB), `language: "portuguese"`, `task: "transcribe"`, `chunk_length_s: 30` para áudios longos. Progresso (download do modelo e inferência) na bolha. Modelo fica no Cache Storage do navegador.
3. Áudio: mesma rota protegida `/api/whatsapp/midias/[id]` (fetch same-origin), decodificado com `AudioContext.decodeAudioData` e reamostrado para 16 kHz mono com `OfflineAudioContext`. Se o navegador não decodificar OGG/Opus (Safari antigo), decodificar com o decoder Opus em WASM do item B.
4. Resultado salvo no banco (`WhatsAppMidia.transcricao Text?`, `transcricaoEm`, `transcricaoModelo`) por Server Action com a guarda do atendimento, só para mídia `audio`, texto ≤ 10.000 caracteres; regravar só se vazio (ou pelo admin). Exibido a todos: bloco "Transcrição automática · pode conter erros".
5. A IA do atendimento (MCP) passa a ver a transcrição como conteúdo do cliente (não confiável, mesmo tratamento do texto do cliente).
6. Limites: áudio ≤ 10 min; um trabalho por vez por aba; botão desabilitado durante; cancelar ao sair da conversa.

### Origem do modelo
Opção 1 (padrão): CDN do Hugging Face (só pesos públicos; nenhum dado do cliente sai). Opção 2: espelhar os arquivos no storage próprio e apontar `env.remoteHost`. Ver parecer.

## B. Gravação em Opus (WASM)

### Hoje
`MediaRecorder` grava WebM/Opus (Chrome/Firefox) e o servidor remuxa para OGG (`audio-webm-para-ogg.ts`). Safari/iPhone gravam MP4/AAC, que o WhatsApp não aceita como mensagem de voz: o gravador fica indisponível.

### Esperado
- Se `MediaRecorder` não suportar `audio/webm;codecs=opus` nem `audio/ogg;codecs=opus`: gravar PCM pelo AudioWorklet e codificar em **Opus/OGG mono 48 kHz** com encoder libopus em WASM (pacote pequeno, carregado só ao gravar). Saída já em OGG: não passa pelo remux.
- Chrome/Firefox continuam no caminho atual (mais leve).
- Mesmo limite de duração e tamanho atuais; mesmo envio (`enviarMidiaConversa`).

## Segurança / plataforma
- CSP: WASM exige `'wasm-unsafe-eval'` em `script-src`; Worker de módulo same-origin; `connect-src` para a origem do modelo. Sem COOP/COEP (ONNX em thread única; sem SharedArrayBuffer).
- Pacotes novos via yarn (sem `--ignore-optional`). Carregamento dinâmico só quando o usuário pede.
- Nenhum áudio sai do navegador/sistema.

## Fora do escopo
Transcrição automática no servidor; diarização; tradução.

## Ajustes após o parecer do Grok (17/10) — valem sobre o texto acima

### Gravação
- Ordem de formato do `MediaRecorder`: `audio/ogg;codecs=opus` → `audio/webm;codecs=opus` (remux atual para OGG) → **encoder Opus em WASM** (`@audio/encode-opus`, MIT, ~263 KB, import dinâmico) a partir de PCM do AudioWorklet → só então `audio/mp4` como **áudio comum** (não nota de voz).
- **Bug atual**: `escolherFormato` pede mp4 antes de webm; e o envio nunca marca `voice: true`. Corrigir: `voice: true` no payload da Meta quando o arquivo é OGG/Opus mono (mensagem de voz); AAC/M4A vai como áudio comum.
- Safari 18.4+ grava OGG/WebM Opus nativo; o encoder WASM é o fallback de versões antigas.

### Transcrição (no navegador, decisão do André)
- `@huggingface/transformers` 3.x **versão exata** (não v4 enquanto o ORT pinado for `-dev`); `onnxruntime-web` SIMD **thread única** (`numThreads=1`, sem COOP/COEP); o `.wasm` copiado para `public/ort/` e `env.backends.onnx.wasm.wasmPaths='/ort/'`; webpack alias `sharp$`/`onnxruntime-node$` → `false` no cliente e `serverExternalPackages`; worker de módulo importado só no clique; nunca no grafo de Server Component.
- Modelo `onnx-community/whisper-base` com `revision` = SHA do commit fixo e **sha256 de cada .onnx conferido** num `env.fetch` próprio antes de ir ao Cache Storage. Origem: CDN do HF (dev/agora); **pendência**: espelho na própria origem para produção (dono da infra).
- Persistência: colunas próprias em `WhatsAppMidia` (`transcricao`, `transcricaoEm`, `transcricaoAutorId` gravado pelo servidor a partir da sessão, `transcricaoModelo` constante do servidor) — **nunca em `WhatsAppMensagem.corpo`**. Compare-and-set (`updateMany where transcricao is null`). Teto proporcional à duração (ex.: 25 caracteres/s, máx. 6.000), sem NUL. Sem regravação; correção fica fora do escopo.
- Bolha: "Transcrição gerada no navegador · não verificada · pode conter erros".
- MCP/IA: campo delimitado e marcado como não confiável; nenhuma ferramenta dispara só com ele.
- Teto de duração para transcrever: 5 min (memória/tempo no iOS).
- CSP: nenhuma CSP de página nova nesta entrega; não tocar na CSP `sandbox` da rota de mídia.
