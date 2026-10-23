import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const f = readFileSync('src/app/(app)/crm/atendimento/gravador-audio.tsx', 'utf8');

// O Chrome reporta 2 canais no track do MediaStreamAudioDestinationNode mesmo com channelCount=1 explícito.
// Quando o áudio passa pelo grafo mono, confiamos na conversão; a checagem de mono só vale no caminho direto.
describe('gravador: não recusa estéreo quando o grafo já força mono', () => {
  it('verificarMono só roda quando a captura é direta', () => {
    expect(f).toMatch(/captura === 'direto' \? verificarMono\(/);
  });
});
