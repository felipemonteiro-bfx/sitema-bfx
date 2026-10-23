import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cfg = readFileSync('next.config.ts', 'utf8');

// Next 16: `yarn build` usa Turbopack (NEXT_DISABLE_TURBOPACK não desliga mais). Um `webpack` sem `turbopack`
// derruba o build de produção. Os aliases de cliente precisam existir nos dois empacotadores.
describe('next.config: aliases de cliente valem no Turbopack (produção) e no webpack (dev local)', () => {
  it('declara turbopack.resolveAlias para sharp e onnxruntime-node só no navegador', () => {
    expect(cfg).toContain('turbopack:');
    expect(cfg).toContain('resolveAlias');
    expect(cfg).toMatch(/sharp: \{ browser: /);
    expect(cfg).toMatch(/"onnxruntime-node": \{ browser: /);
  });
});
