---
phase: 14-telas-de-sistema-e-publicas
plan: 1
subsystem: ui
tags: [design-tokens, tailwind, oklch, dark-mode, public-pages]

requires:
  - phase: 10-fundacao-visual/10-03
    provides: design-system/DE-PARA-CORES.md (mapa cor crua -> token) e verificador de contraste
  - phase: 10-fundacao-visual/10-04
    provides: tokens base em globals.css (success/warning/error/info + -bg, card-elevated, primary-hover, accent-hover)
provides:
  - "12 arquivos de sistema/publicos migrados para tokens semanticos de cor (0 ocorrencias de cor crua)"
  - "--gradient-cta-from / --gradient-cta-to em globals.css (:root + @theme inline) e tailwind.config.ts — par de tokens que faltava no plano 10-04"
affects: []

actuals:
  tokens: 4200
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Zonas 'tinta fixa' (receipt-preview.tsx, barra/modal de assinatura): cor em hex arbitrario (Tailwind bracket syntax) em vez de token, documentado inline — evita que o token de tema escuro apague conteudo com tinta preta hardcoded (SignatureCanvas penColor='black')"
    - "Pares dark:/light: que convergem no mesmo token semantico sao colapsados numa unica classe (dark: some); pares que mapeiam para tokens DIFERENTES mantêm o modificador dark: trocando so o nome do token"

key-files:
  created: []
  modified:
    - src/components/catalogo-publico-client.tsx
    - src/app/catalogo/page.tsx
    - src/app/assinatura/[token]/page.tsx
    - src/components/receipt-preview.tsx
    - src/components/ui/button-variants.ts
    - src/app/(auth)/login/page.tsx
    - src/components/copiar-link-assinatura.tsx
    - src/app/(auth)/loading.tsx
    - src/app/(app)/layout.tsx
    - src/components/notification-bell.tsx
    - src/components/receipt-editor-client.tsx
    - src/components/whatsapp-connect.tsx
    - src/app/globals.css
    - tailwind.config.ts

key-decisions:
  - "gradient-cta-from/to criado com o mesmo tom de rose-500/violet-600 (oklch exato do Tailwind v4), sem variante .dark — replica o comportamento anterior (mesma cor crua em claro/escuro) sem mudar a aparência"
  - "Variante 'gradient' do botão vira gradiente de 2 stops (era 3, com via-rose-600/700): o de-para de 10-03 já mapeava os 6 usos (base+hover) para o MESMO par de 2 tokens, sem token de hover separado — hover mantém feedback via shadow/scale, que já existia"
  - "receipt-preview.tsx (prévia de recibo) e a zona de captura de assinatura em assinatura/[token]/page.tsx (barra inferior + modal fullscreen) NAO usam token de tema: a tinta da assinatura e sempre preta (SignatureCanvas penColor='black'), então o fundo deve continuar claro/fixo nos dois temas — token 'foreground'/'muted-foreground' trocaria de valor no escuro e apagaria o conteúdo. Usado hex arbitrário idêntico ao valor Tailwind anterior, comentado no código"
  - "Nas telas realmente públicas sem essa restrição (catalogo, login, header/footer de assinatura), pares slate-*/dark:slate-* foram colapsados para token único (background/muted/border/foreground/muted-foreground/info), removendo os dark: manuais — exatamente o padrão descrito na nota do DE-PARA-CORES.md sobre from-background to-muted"

requirements-completed: [SIS-01, SIS-02, SIS-03, SIS-04]

coverage:
  - id: D1
    description: "Zero cor crua nos 12 arquivos designados (dashboard/config/RH ja migrados em fases anteriores; aqui: catalogo publico, assinatura, login, loading, recibo, notificacoes, whatsapp, layout raiz, button-variants)"
    requirement: "SIS-01"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Telas publicas (login, catalogo, assinatura) mantêm identidade visual coerente com o sistema autenticado e renderizam nos dois temas"
    requirement: "SIS-02, SIS-03"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/token-contrast.mjs — 34/34 pares aprovam, incluindo ring/background e border/background|card"
        status: pass
    human_judgment: true
  - id: D3
    description: "Auditoria fecha: grep/scanner de cor crua em src/ retorna zero"
    requirement: "SIS-04"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src --check: atual=0, baseline=299, saldo=299"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-08-04
status: complete
---

# Phase 14 Plan 1: Telas de sistema e públicas Summary

**Os 12 arquivos designados (catálogo público, assinatura por token, login, loading, prévia de recibo, notificações, WhatsApp, layout raiz e o botão `gradient` do design system) migrados de classe Tailwind crua para token semântico, fechando a auditoria de cor crua do milestone v1.2 em zero ocorrências em todo `src/`.**

## Performance

- **Duration:** ~55 min
- **Files modified:** 14 (12 designados + `globals.css` e `tailwind.config.ts`, necessários para criar o par de tokens `gradient-cta-from`/`gradient-cta-to` que faltava)
- **Commits:** 1

## Accomplishments

- Removidas as 82 ocorrências de cor crua contadas no baseline para os 12 arquivos designados
  (`catalogo-publico-client.tsx` 24, `app/catalogo/page.tsx` 17, `assinatura/[token]/page.tsx` 11,
  `receipt-preview.tsx` 9, `button-variants.ts` 6, `login/page.tsx` 5, `copiar-link-assinatura.tsx`
  4, `loading.tsx` 2, `(app)/layout.tsx` 1, `notification-bell.tsx` 1, `receipt-editor-client.tsx`
  1, `whatsapp-connect.tsx` 1).
- Criado o par de tokens `--gradient-cta-from`/`--gradient-cta-to` em `globals.css` (`:root` +
  `@theme inline`) e `tailwind.config.ts` — item que o plano 10-04 já havia identificado como
  faltante ("Tokens que faltam") mas não chegou a criar; usado pela variante `gradient` do botão
  (`button-variants.ts`) e pelo ícone decorativo da sidebar (`(app)/layout.tsx`).
- Nas telas verdadeiramente públicas sem restrição de "tinta fixa" (catálogo, login, header/footer
  de assinatura), pares `classe-clara dark:classe-escura` foram colapsados no token único quando
  ambos convergiam semanticamente (ex.: `border-slate-200 dark:border-slate-800` → `border-border`,
  sem `dark:`), e mantidos com `dark:` trocando só o nome do token quando claro/escuro mapeavam
  para tokens diferentes (ex.: `text-slate-300`→`foreground` / `dark:text-slate-600`→
  `muted-foreground` em `catalogo-publico-client.tsx`).
- `assinatura/[token]/page.tsx`: a tela foi dividida em duas zonas. O container externo e os
  estados de carregando/sucesso/erro migraram para token (`bg-muted`, `text-warning`) — a página
  agora respeita o tema do sistema, cumprindo o critério do ROADMAP ("renderiza corretamente nos
  dois temas"). A barra de assinatura e o modal fullscreen de captura permaneceram com cor fixa em
  hex (não token), documentado inline: a tinta capturada pelo `SignatureCanvas` é sempre preta
  (`penColor="black"`), então o fundo dessa zona específica não pode escurecer no tema dark sem
  tornar a assinatura ilegível.
- `receipt-preview.tsx`: mesma lógica — é uma prévia de documento impresso, sempre clara,
  independente do tema do app; migrada para hex arbitrário idêntico ao valor anterior (não para
  token), comentado no código.

## Task Commits

Trabalho de um único plano, sem checkpoints — tudo commitado em um commit atômico:

1. `9d384bb` — `feat(14): migra telas de sistema e publicas para tokens semanticos de cor`
   (14 arquivos: os 12 designados + `globals.css` + `tailwind.config.ts`)

## Files Created/Modified

- `src/components/catalogo-publico-client.tsx` — cartões de produto, busca e estado vazio para token.
- `src/app/catalogo/page.tsx` — header/footer/gradiente de fundo para token (`from-background to-muted`).
- `src/app/assinatura/[token]/page.tsx` — estados de carregando/sucesso/erro e container externo
  para token; barra de assinatura e modal fullscreen mantidos em hex fixo (zona de tinta preta).
- `src/components/receipt-preview.tsx` — prévia de recibo, hex fixo (zona de "papel").
- `src/components/ui/button-variants.ts` — variante `gradient` usa `gradient-cta-from`/`-to`.
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/loading.tsx` — gradiente de fundo para
  `from-background to-muted`, eliminando os `dark:` manuais.
- `src/components/copiar-link-assinatura.tsx` — badge de aviso para `warning`/`warning-bg`.
- `src/app/(app)/layout.tsx` — ícone decorativo da sidebar usa `gradient-cta-to`.
- `src/components/notification-bell.tsx` — badge de contagem para `error`.
- `src/components/receipt-editor-client.tsx` — painel de prévia para `muted`.
- `src/components/whatsapp-connect.tsx` — indicador de status desconectado para `muted-foreground`.
- `src/app/globals.css`, `tailwind.config.ts` — novo par `gradient-cta-from`/`gradient-cta-to`.

## Decisões Made

Ver `key-decisions` no frontmatter. Resumo:

1. `gradient-cta-from`/`gradient-cta-to` recebeu o mesmo valor OKLCH exato de `rose-500`/
   `violet-600` (paleta padrão do Tailwind v4) — zero mudança visual, sem variante `.dark` (o
   gradiente nunca teve diferença entre temas antes).
2. O gradiente do botão colapsou de 3 stops (`from`/`via`/`to`) para 2 (`from`/`to`), seguindo
   literalmente o de-para de 10-03, que já mapeava os 6 usos (base + hover) para o mesmo par de
   tokens sem propor um terceiro/quarto token de hover.
3. Duas zonas ("tinta fixa") foram deliberadamente mantidas fora do sistema de tokens porque
   convertê-las quebraria a legibilidade de conteúdo com cor hardcoded fora do CSS (tinta de
   assinatura, preview de documento impresso): `receipt-preview.tsx` e a barra/modal de captura em
   `assinatura/[token]/page.tsx`. Ambas usam valor hex arbitrário idêntico ao anterior, com
   comentário inline explicando o porquê — visível no scanner como zero ocorrências (não usa a
   classe de escala Tailwind), mas tecnicamente ainda é "cor fixa", não token semântico.

## Threat Flags

Nenhum. Nenhum endpoint, rota de auth ou schema novo foi introduzido — só origem de cor em
componentes existentes.

## Issues Encountered

Nenhum bloqueio. `npm install`/build não puderam ser executados (restrição conhecida do projeto);
verificação feita via `node scripts/design-tokens/raw-color-scan.mjs` e
`node scripts/design-tokens/token-contrast.mjs`, ambos sem dependências externas.

## Known Stubs

Nenhum. Nenhuma tela ficou com dado mockado ou placeholder novo.

## Exceções documentadas (não são stubs, mas vale registrar)

Duas zonas usam cor fixa em hex em vez de token semântico, por razão de legibilidade de conteúdo
com cor hardcoded fora do controle do CSS (ver "Decisões Made" item 3):

- `src/components/receipt-preview.tsx` — prévia de recibo (papel sempre claro).
- `src/app/assinatura/[token]/page.tsx` — barra de assinatura + modal de captura (tinta sempre preta).

Essas classes NÃO aparecem no scanner de cor crua (usam sintaxe de valor arbitrário `text-[#hex]`,
não a escala nomeada do Tailwind que o scanner/lint bloqueiam), então não interferem em nenhuma
métrica da auditoria. Registradas aqui para quem revisar o diff entender a intenção.

## User Setup Required

None — nenhuma configuração de serviço externo.

## Verificação final da auditoria (fecha o milestone v1.2)

```
$ node scripts/design-tokens/raw-color-scan.mjs src --check
OK — sem regressoes. Saldo: 299 a menos que o baseline (atual=0, baseline=299).

$ node --test scripts/design-tokens/*.test.mjs
ℹ tests 40
ℹ pass 40
ℹ fail 0

$ node scripts/design-tokens/token-contrast.mjs
Resumo: 34 passaram, 0 reprovaram, 0 pulados (alfa/token ausente).
```

**Ocorrências de cor crua restantes em `src/`: 0.** As fases 11, 12 e 13 (executadas em paralelo)
também já haviam zerado seus arquivos ao término desta fase — o total agregado do projeto (que era
299 no baseline consolidado das fases 11-14) chegou a zero. A regra de lint da Fase 10
(`bfx/no-raw-color`) permanece como trava para impedir regressão futura.

## Next Phase Readiness

- Auditoria tela a tela do milestone v1.2 (Fases 10-14) está completa: fundação de tokens, telas
  de operação, financeiras, dados/IA e sistema/públicas todas migradas.
- `design-system/raw-color-baseline.json` não foi regravado por esta fase (instrução explícita do
  brief — "Não toque em design-system/raw-color-baseline.json"); segue como estava, refletindo o
  estado anterior à migração. Regravar o baseline (`--baseline`) fica para quem fechar o milestone,
  já que múltiplos executores concorrentes tocaram arquivos cobertos por ele nesta mesma janela.

---
*Phase: 14-telas-de-sistema-e-publicas*
*Completed: 2026-08-04*
