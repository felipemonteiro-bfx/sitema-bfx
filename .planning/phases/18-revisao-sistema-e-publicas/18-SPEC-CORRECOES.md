# Fase 18 — Spec das correções

Escopo: os 13 achados de `18-ACHADOS.md` + o rótulo errado, mais a migração dos call sites de
token de cor que sobraram no sistema inteiro. Fases 15, 16 e 17 já corrigidas.

Método de medição: `/tmp/bfx/measure.mjs` — compõe alfa em sRGB gama sobre a superfície real e
usa `contrastRatio` do próprio `token-contrast.mjs`. Calibrado contra os 13 números já
documentados em `globals.css` (5.18 / 5.23 / 5.22 / 5.60 / 4.68 / 4.88 / 4.59 / 4.69 / 4.04 /
4.82 / 2.97 / 2.06 / 4.13) — reproduz todos exatamente.

## 1. `text-destructive-foreground` não gera regra (achado 1) — raiz + catraca

**Atual:** `--color-destructive` está no `@theme inline` (linha 51); `--color-destructive-foreground`
não. No Tailwind v4 a utilitária `text-X` só existe se `--color-X` estiver no `@theme`. Logo
`text-destructive-foreground` não gera regra, o texto herda `--foreground` e o botão destrutivo
mede 4.04:1 (claro) e 3.23:1 (escuro). 10 call sites.

**Esperado:** registrar `--color-destructive-foreground: var(--destructive-foreground);` no
`@theme`, ao lado de `--color-destructive`.

**Prova diferencial (por que a chave no `@theme` é a causa):** `--color-error-foreground` está no
`@theme` e a sonda de runtime da fase 18 diz que `text-error-foreground` resolve;
`--color-destructive-foreground` não está e `text-destructive-foreground` herda. Mesmo par de
tokens, mesma família, único delta = a chave no `@theme`. Depois da correção o destrutivo passa a
ter exatamente a forma do que resolve.

**A catraca (o que deixou passar):** `token-contrast.mjs` mede `--destructive-foreground` contra
`--destructive` e dá PASS porque lê **variáveis CSS**, não a **classe utilitária**. Um par pode
estar perfeito e a cor nunca chegar à tela.

Correção da catraca: nova verificação `checkThemeCoverage` — para **todo** par de `TOKEN_PAIRS`
cujo lado de texto é usado no código como `text-<nome>`, exigir `--color-<nome>` no `@theme`.
Falta da chave = FAIL, não SKIP. Vale para todos os pares, não só o destructive.

Arquivos: `src/app/globals.css`, `scripts/design-tokens/token-contrast.mjs`,
`scripts/design-tokens/token-contrast.test.mjs`.

**Fora de escopo:** mudar o valor de `--destructive-foreground` (o token está certo: 4.69/6.09).

**Skill `shadcn-bfx` (gitignored):** a linha "use `text-destructive-foreground` (6.09:1)" prescrevia
algo inalcançável. O número do token está certo; a recomendação não chegava à tela. Corrigir o
texto, referenciando a chave do `@theme`.

## 2. Migração dos call sites de token (125 em 32 arquivos)

`text-{success,warning,info,error}` como cor de texto sem a variante `-text`. Medido por varredura
de token de classe (não grep de linha): 125 nus, 53 já em `-text`, 26 `-foreground` (legítimo).

Não é substituição por regex. Por call site:
- Texto sobre superfície clara (card/background) → `text-*-text`.
- Texto pareado com `bg-*/5`, `/10` ou `/20` da mesma matiz → medir; onde travar abaixo de 4.5
  mesmo com `-text`, trocar o fundo pelo tint opaco `bg-*-bg`.
- Nunca adicionar sufixo de opacidade ao token de texto (`text-*-text/80` anula o ganho).
- Texto sobre fundo escuro fixo ou sobre preenchimento (`bg-success` + `text-success-foreground`)
  → deixar como está e registrar.
- `src/lib/design-tokens.ts` é mapa consumido por outros lugares: mapear consumidores antes.

## 3. Demais achados

2 (`sr-only` derrotado pela base do `<Input>`), 3 (tablist 436px), 4, 5 (breadcrumb em 3 rotas),
6 (degrau de 4px), 7 (`<button>` cru em `/offline`), 8 (`text-[#9ca3af]` a 2.54:1 — corrigir só o
cinza, manter o branco fixo do preview), 9 (`<h1>` em `/login`), rótulo "Excluir Vendedor" para
admin.

10/11/12 são do `Tabs`/`TabsTrigger`, compartilhado: avaliar risco, medir em ≥2 rotas se corrigir.
13 (`/catalogo` diverge dos tokens de forma).

## Regras de execução

`npm install` proibido. Sem `kubectl`/`aws`/`argocd`/banco/deploy. Sem `git push`. Commits
atômicos. `token-contrast.mjs` e `raw-color-scan.mjs --check` antes e depois.

Baseline (antes): contraste 46 PASS / 0 FAIL / 4 SKIP · cores atual=0, baseline=0.
