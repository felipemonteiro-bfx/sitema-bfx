import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Neste design system `--accent` é o VERDE vibrante (não o cinza sutil do shadcn). Usado como fundo de
// hover/foco/aberto ele pinta o controle de verde cheio com ícones e textos cinza por cima (~1,5:1).
// Regra: interação usa `controle`; selecionado/ligado usa `marca-tint`. Esta guarda impede a volta.
function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? (n === '__tests__' || n === 'generated' ? [] : arquivos(p)) : /\.(tsx?|css)$/.test(n) ? [p] : []; });
}
const INTERACAO = ['hover', 'focus', 'focus-visible', 'active', 'aria-expanded', 'data-[state=open]', 'data-[highlighted]', 'group-hover'];

describe('estados de interação nunca pintam com o accent verde', () => {
  it('nenhum hover/foco/ativo/aberto usa bg-accent em src/', () => {
    const achados: string[] = [];
    for (const f of arquivos('src')) {
      const s = readFileSync(f, 'utf8');
      for (const pref of INTERACAO) if (s.includes(`${pref}:bg-accent`)) achados.push(`${f} → ${pref}:bg-accent`);
    }
    expect(achados).toEqual([]);
  });
  it('toggle ligado usa o tint da marca', () => {
    const t = readFileSync('src/components/ui/toggle.tsx', 'utf8');
    expect(t).toContain('data-[state=on]:bg-marca-tint');
    expect(t).toContain('data-[state=on]:text-marca-tint-texto');
  });
  it('pílula "quem responde" sem tooltip nativo com texto antigo', () => {
    expect(readFileSync('src/app/(app)/crm/atendimento/quem-responde.tsx', 'utf8')).not.toContain('title={estadoAutomatico}');
  });
});

describe('foco global não passa por cima dos componentes', () => {
  it(':focus-visible global fica em @layer base (sem camada ele vence o outline-none das utilitárias)', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    const i = css.indexOf(':focus-visible {\n    outline: 2px solid var(--ring);');
    expect(i).toBeGreaterThan(-1);
    const antes = css.slice(0, i);
    expect(antes.lastIndexOf('@layer base {')).toBeGreaterThan(antes.lastIndexOf('\n}\n'));
  });
});

describe('item focado de menu/seleção é visível no escuro (revisão 2, item 2)', () => {
  // No tema escuro o popover (#1A1D1B) é mais claro que o `controle` (#131514): bg-controle sumia.
  // Igual ao command.tsx: o destaque no escuro é o `controle-ativo`.
  for (const f of ['dropdown-menu', 'select']) {
    it(`${f}: todo focus:bg-controle tem o par dark:focus:bg-controle-ativo`, () => {
      const s = readFileSync(`src/components/ui/${f}.tsx`, 'utf8');
      const sem = s.split(/\s+/).filter(c => c === 'focus:bg-controle');
      const com = s.split(/\s+/).filter(c => c === 'dark:focus:bg-controle-ativo');
      expect(sem.length).toBeGreaterThan(0);
      expect(com.length).toBe(sem.length);
    });
  }
  it('dropdown-menu: item de submenu aberto também', () => {
    const s = readFileSync('src/components/ui/dropdown-menu.tsx', 'utf8');
    expect(s).toContain('dark:data-[state=open]:bg-controle-ativo');
  });
  it('o par texto do popover / destaque está nos TOKEN_PAIRS', () => {
    const s = readFileSync('scripts/design-tokens/token-contrast.mjs', 'utf8');
    expect(s).toMatch(/foreground: "popover-foreground", background: "controle-ativo"/);
    expect(s).toMatch(/foreground: "popover-foreground", background: "controle"/);
  });
});
