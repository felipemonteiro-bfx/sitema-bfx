---
phase: 10-fundacao-visual
plan: 04
subsystem: ui
tags: [design-tokens, oklch, wcag-contrast, tailwind, css-tokens, a11y, aria-label]

requires:
  - phase: 10-fundacao-visual/10-03
    provides: design-system/DE-PARA-CORES.md (lista "Tokens que faltam") e scripts/design-tokens/token-contrast.mjs (verificador OKLCH que reprovava 11 pares)
provides:
  - "src/app/globals.css — --success-bg, --warning-bg, --error-bg, --info-bg, --card-elevated criados em :root com valores próprios do tema claro; --ring, --border, --input corrigidos nos dois temas; --accent-foreground, --success-foreground, --info-foreground, --error, --destructive, --destructive-foreground (dark) corrigidos para contraste WCAG"
  - "tailwind.config.ts — chaves success.bg, warning.bg, error.bg, info.bg, card.elevated em theme.extend.colors"
  - "npm run contraste:check — gate de CI sem tolerância a falha, logo após 'Cor crua (catraca)'"
  - "src/components/table-pagination.tsx — 4 aria-label de ação (Primeira/Anterior/Próxima/Última página)"
affects: ["11-14 (migração de telas)"]

actuals:
  tokens: 2600
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Correção de contraste texto/fundo prioriza trocar a cor do TEXTO (foreground) sobre o token de estado, não escurecer o token de estado em si — preserva a matiz/lightness de marca (accent, success, info) intacta enquanto resolve o par que falhava"
    - "Quando dois tokens carregam o mesmo valor de cor por razões de compatibilidade (--error/--destructive, ambos vermelho), ajustar os dois em sincronia para não reabrir a divergência que causou a falha isolada de --destructive-foreground/--destructive no tema escuro"

key-files:
  created: []
  modified:
    - src/app/globals.css
    - tailwind.config.ts
    - src/components/table-pagination.tsx
    - package.json
    - .github/workflows/ci.yml
    - scripts/design-tokens/token-contrast.test.mjs

key-decisions:
  - "--accent-foreground, --success-foreground e --info-foreground (tema claro) passam de branco para texto escuro (oklch 0.145) em vez de escurecer --accent/--success/--info — a cor de marca fica byte-idêntica, só o texto por cima muda (2.89→6.56 e 4.03→4.71)"
  - "--error e --destructive (tema claro) escurecidos de L=0.60 para L=0.57 juntos, mantendo os dois tokens sincronizados (eram idênticos antes, ficam idênticos depois)"
  - "--destructive-foreground (tema escuro) passa de branco para o mesmo tom escuro que --error-foreground já usava (oklch 0.10 0.02 250) — corrige a divergência entre dois tokens que representam a mesma cor de fundo mas tinham textos diferentes"
  - "--ring (tema claro) escurecido para cinza puro (L=0.60, sem matiz nova) em vez de reaproveitar o verde de accent — opção mais conservadora das duas oferecidas pelo plano, evita introduzir cor no indicador de foco onde antes não havia"
  - "--border/--input escurecidos nos dois temas (claro L 0.922→0.62, escuro L 0.35→0.52) — mudança visual real e deliberada: o valor anterior nunca alcançava 3:1 contra fundo/card em nenhum tema, então não havia forma de corrigir sem tornar a borda mais visível"
  - "status-partial e gradient-cta-from/gradient-cta-to (citados na seção 'Tokens que faltam' do de-para) NÃO foram criados nesta task — o texto da <action> desta task não os lista entre os tokens obrigatórios (só cita success-bg/warning-bg/error-bg/info-bg/card-elevated/primary-hover/accent-hover), e criá-los sem consumidor (antecipacao-client.tsx e button-variants.ts não estão em files_modified deste plano) seria token morto; ficam para a fase que migrar esses arquivos"

requirements-completed: [UI-01, UI-02, UI-04, UI-05, UI-06]

coverage:
  - id: D1
    description: "--success-bg, --warning-bg, --error-bg, --info-bg e --card-elevated existem em :root (tema claro) e em .dark, expostos em @theme inline e em tailwind.config.ts — bg-success-bg e afins agora são classes Tailwind resolvíveis nos dois temas"
    requirement: "UI-01"
    verification:
      - kind: other
        ref: "comando de paridade da task 1 do plano (grep dos 4 pontos) — ver Task Commits"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nenhum token de cor existe em só um dos temas — paridade completa entre :root e .dark para os tokens novos e para os já existentes que ganharam @theme inline (--primary-hover, --accent-hover)"
    requirement: "UI-02"
    verification:
      - kind: other
        ref: "mesmo comando de paridade da task 1 (checa presença nos dois temas para cada token)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Contraste de texto ≥4.5:1 e de indicador de foco/borda ≥3:1 nos dois temas — os 11 pares que reprovavam no plano 03 agora passam, sem afrouxar o mínimo do verificador"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "npm run contraste:check — 34/34 pares PASS, 0 SKIP"
        status: pass
      - kind: unit
        ref: "scripts/design-tokens/token-contrast.test.mjs (14 testes node:test)"
        status: pass
    human_judgment: false
  - id: D4
    description: "--ring do tema claro alcança o mínimo de 3:1 para indicador de foco, com a base de :focus-visible/outline-offset/prefers-reduced-motion preservada"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "npm run contraste:check (linha ring/background light = 3.78 PASS) + grep de :focus-visible/outline-offset/prefers-reduced-motion em globals.css"
        status: pass
    human_judgment: false
  - id: D5
    description: "Os 4 botões apenas-ícone de table-pagination.tsx (primeira/anterior/próxima/última página) têm aria-label de ação; enumeração de todos os usos de size=\"icon\" em src/ confirma zero sem nome acessível"
    requirement: "UI-04"
    verification:
      - kind: other
        ref: "comando de enumeração da task 3 do plano (grep + parsing de blocos <Button ... size=\"icon\">)"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-08-03
status: complete
---

# Phase 10 Plan 04: Tokens faltantes, foco visível e nome acessível Summary

**Cinco tokens de fundo semântico (success/warning/error/info-bg, card-elevated) criados nos quatro pontos que faltavam, 11 pares de contraste corrigidos (foco, borda, texto sobre accent/success/error/info/destructive) sem alterar a identidade visual, gate de contraste bloqueante no CI, e os 4 últimos botões apenas-ícone do projeto com nome acessível.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 6 (5 previstas no plano + `token-contrast.test.mjs`, ajuste inevitável)

## Accomplishments

- `bg-success-bg`, `bg-warning-bg`, `bg-error-bg`, `bg-info-bg` e `bg-card-elevated` agora existem e
  resolvem para valores diferentes em cada tema — antes só existiam em `.dark`, a classe não
  existia no bundle Tailwind. `--primary-hover` e `--accent-hover` também passam a existir em
  `@theme inline` (antes só nas vars e no `tailwind.config.ts`, sem gerar classe `hover:`).
- `npm run contraste:check` sai **0** com **34/34 pares aprovados** (eram 23 PASS / 11 FAIL antes
  desta plano) — nenhum par foi marcado `skipped` para escapar do mínimo:
  - `--ring` (tema claro): 2.48:1 → **3.78:1** (UI-06, o defeito que motivou a task).
  - `--border`/`--input` (claro): 1.21–1.24:1 → **3.49–3.58:1**; (escuro): 1.70–1.83:1 →
    **3.47–3.73:1**.
  - `--accent-foreground`, `--success-foreground`, `--info-foreground` (claro): texto passou de
    branco para escuro sobre a MESMA cor de fundo (accent/success/info não mudaram de valor) —
    2.89:1 → 6.56:1 (accent/success) e 4.03:1 → 4.71:1 (info).
  - `--error`/`--destructive` (claro): 4.27:1 → 4.69:1 (L ajustado de 0.60 para 0.57).
  - `--destructive-foreground` (escuro): 3.23:1 → 6.09:1 (texto passou a usar o mesmo tom escuro
    que `--error-foreground` já usava sobre o mesmo vermelho).
- Base de `:focus-visible`, `outline-offset` e `prefers-reduced-motion` confirmada intacta após as
  mudanças de token.
- CI ganhou o step `Contraste de tokens` (roda `npm run contraste:check`), logo após `Cor crua
  (catraca)`, sem `continue-on-error` — regressão de contraste agora quebra o build.
- Os 4 botões `size="icon"` de `table-pagination.tsx` (primeira/anterior/próxima/última página)
  ganharam `aria-label` de ação. Enumeração de todos os usos de `size="icon"` em `src/` confirma
  **zero** restantes sem nome acessível.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Tokens faltantes nos dois temas, nos quatro pontos** - `5c2f697` (feat)
2. **Task 2: Contraste aprovado nos dois temas e foco visível** - `d4bd068` (fix)
3. **Task 3: Nome acessível nos botões apenas-ícone** - `ddc8959` (fix)

**Plan metadata:** commit final deste SUMMARY, a seguir.

## Files Created/Modified

- `src/app/globals.css` — 5 tokens `-bg`/`elevated` novos em `:root`; correção de `--ring`,
  `--border`, `--input` (claro e escuro), `--accent-foreground`, `--success-foreground`,
  `--info-foreground`, `--error`, `--destructive`, `--destructive-foreground` (escuro).
- `tailwind.config.ts` — chaves `bg` (success/warning/error/info) e `elevated` (card).
- `src/components/table-pagination.tsx` — 4 `aria-label`.
- `package.json` — script `contraste:check`.
- `.github/workflows/ci.yml` — step `Contraste de tokens`.
- `scripts/design-tokens/token-contrast.test.mjs` — teste de integração atualizado (ver Deviations).

## Decisões Made

Ver `key-decisions` no frontmatter. Resumo: onde dava para resolver o par de contraste trocando
só a cor do TEXTO (accent/success/info), preferi essa rota à de escurecer o token de estado —
menor alteração de identidade possível. Onde o par era estrutural (border/ring, sem foreground
alternativo óbvio), o ajuste caiu sobre o próprio token, como o plano previu.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste do plano 03 documentava a reprovação do `--ring` como esperada, agora reprova errado**
- **Found during:** Task 2, ao rodar `node --test scripts/design-tokens/token-contrast.test.mjs`
  depois da correção de `--ring`
- **Issue:** `token-contrast.test.mjs` (escrito no plano 03) tinha um teste de integração
  ("RED proposital") que afirmava `ring/background` no tema claro do `globals.css` real DEVE
  reprovar — verdade no estado do plano 03, falso depois que esta task corrigiu o token. O teste
  passou a falhar por causa da correção que ele mesmo estava aguardando.
- **Fix:** Invertida a asserção (`pass, true` em vez de `pass, false`) e atualizados o nome do
  teste e o comentário de cabeçalho do arquivo para descrever o estado pós-plano-04.
- **Files modified:** `scripts/design-tokens/token-contrast.test.mjs`
- **Verification:** `node --test scripts/design-tokens/token-contrast.test.mjs` — 14/14 passando.
- **Committed in:** `d4bd068` (parte do commit da Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug em teste que ficou desatualizado pela própria
correção que ele monitorava)
**Impact on plan:** Nenhum impacto de escopo — o arquivo não estava em `files_modified` do plano,
mas deixá-lo quebrado teria escondido uma regressão real de teste sem relação com o código de
produção alterar de comportamento; o teste em si é que documentava o estado antigo.

## Issues Encountered

None além do já documentado em Deviations. TDD RED/GREEN em cada task confirmado antes de
implementar (rodei o `<verify>` de cada task contra o estado anterior, confirmando reprovação,
antes de editar).

## Known Stubs

Nenhum. `status-partial` e `gradient-cta-from`/`gradient-cta-to` (citados no de-para do plano 03
como tokens novos a criar) ficaram DE FORA desta task deliberadamente — não são "stub", são
trabalho fora do escopo explícito da `<action>` desta task (que só lista os 5 `-bg`/`elevated` +
2 `-hover`), e criá-los sem os arquivos que os consumiriam (`antecipacao-client.tsx`,
`button-variants.ts` — nenhum dos dois em `files_modified` deste plano) seria token morto até a
fase que migrar essas telas. Registrado aqui para a fase que tocar esses arquivos não precisar
redescobrir.

## User Setup Required

None - nenhuma configuração de serviço externo.

## Next Phase Readiness

- Fundação de tokens completa: `bg-success-bg`, `bg-warning-bg`, `bg-error-bg`, `bg-info-bg`,
  `bg-card-elevated`, `hover:bg-primary-hover`, `hover:bg-accent-hover` resolvem nos dois temas.
  Nenhuma fase 11-14 deveria precisar criar token para cobrir um estado já mapeado no de-para.
- `npm run contraste:check` roda no CI sem tolerância a falha — qualquer PR que baixe o contraste
  de um token abaixo do mínimo quebra o build automaticamente.
- Acessibilidade de botões apenas-ícone fechada: 12/12 usos de `size="icon"` no projeto têm nome
  acessível.
- Pendência conhecida e documentada para fases futuras: `--status-partial` (4º estado do fluxo de
  antecipação) e `--gradient-cta-from`/`--gradient-cta-to` (gradiente decorativo do botão
  "gradient" e do ícone da sidebar) ainda não têm token — precisam ser criados quando
  `antecipacao-client.tsx` e `button-variants.ts` forem migrados.

---
*Phase: 10-fundacao-visual*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: src/app/globals.css
- FOUND: tailwind.config.ts
- FOUND: src/components/table-pagination.tsx
- FOUND: package.json
- FOUND: .github/workflows/ci.yml
- FOUND: scripts/design-tokens/token-contrast.test.mjs
- FOUND: .planning/phases/10-fundacao-visual/10-04-SUMMARY.md
- FOUND commit: 5c2f697
- FOUND commit: d4bd068
- FOUND commit: ddc8959
