# Fase 18 — Resolução dos achados

Medições por `/tmp/bfx/measure.mjs` (composição de alfa em sRGB gama sobre a superfície real,
usando o `contrastRatio` do próprio `token-contrast.mjs`). O harness reproduz exatamente os 13
números já documentados em `globals.css`, então está calibrado contra a história do repo.

Catracas — antes e depois idênticos em forma, mas o *depois* passou a medir uma coisa a mais:

| | antes | depois |
|---|---|---|
| `contraste:check` (pares) | 46 PASS / 0 FAIL / 4 SKIP | 46 PASS / 0 FAIL / 4 SKIP |
| cobertura do `@theme` | **não existia** | 16 de 16 utilitárias |
| `cores:check` | atual=0, baseline=0 | atual=0, baseline=0 |
| testes de token (`node --test`) | 14 | 22 |

## Achados

| # | Situação | O que foi feito |
|---|---|---|
| 1 | **corrigido** | `--color-destructive-foreground` registrada no `@theme`; catraca ganhou `checkThemeCoverage`. Detalhe abaixo. |
| 2 | **corrigido** | `<Input type="file" sr-only>` → `<input>` cru. A base do `<Input>` (`w-full h-10`) vencia o `sr-only` no tailwind-merge e o campo media 1078×40px. |
| 3 | **parcial** | `gestao-rh-tabs` nunca recebeu a contenção que `query-tabs` tem desde a fase 16 — aplicada. Para `/configuracoes` a causa apontada não se sustenta: ver "Achado 3" abaixo. |
| 4 | **corrigido** | Junto com a migração geral (P2). |
| 5 | **corrigido** | Breadcrumb em `/configuracoes`, `/gestao-rh` e `/perfil`. |
| 6 | **corrigido** | `size="sm"` removido do botão de excluir (36/r8/12px → 40/r10/14px, igual ao "Salvar Alterações" ao lado). |
| 7 | **corrigido** | `/offline`: `<button>` → `<Button>`, `<svg>` inline → `WifiOff` do lucide. |
| 8 | **corrigido** | `#9ca3af` (2.54:1) → `#6b7280` (4.83:1) nos 2 textos. Branco fixo mantido — o preview simula papel. Bordas em `#9ca3af` mantidas (não são texto). |
| 9 | **corrigido** | `/login`: `CardTitle` (`<div>`) → `<h1>`, mesmas classes. |
| 10 | **não aplicado** | Ver justificativa abaixo. |
| 11 | **corrigido** | Painel "Provider de envio" perde o tint `bg-info/5`: os 8 `<Label>` de 12px são `text-muted-foreground` e caíam para 4.36:1; sobre o card dão 4.87:1. |
| 12 | **não aplicado** | Ver justificativa abaixo. |
| 13 | **não aplicado** | Ver justificativa abaixo. |
| rótulo | **corrigido** | `delete-user-button` recebe `userRole` e deriva "Excluir Administrador" / "Excluir Vendedor". |

## Achado 1 — a raiz e a catraca

O par `--destructive-foreground` / `--destructive` sempre esteve certo (4.69 claro, 6.09 escuro) e a
catraca sempre deu PASS. O que faltava era a chave `--color-destructive-foreground` no bloco
`@theme`: no Tailwind v4 a utilitária `text-X` só nasce daí. Sem ela `text-destructive-foreground`
não casava com regra nenhuma e o texto herdava `--foreground` — 4.04:1 claro, 3.23:1 escuro, em 10
call sites e 21 rotas.

**Segunda raiz, não registrada no achado:** `tailwind.config.ts` declara
`destructive.foreground: var(--destructive-foreground)` desde sempre — e **nunca é lido**. O projeto
é Tailwind v4 CSS-first: `postcss.config.js` carrega `@tailwindcss/postcss` e `globals.css` não tem
`@config`. Foi daí que veio a sensação de que o token estava coberto. O teste
`telas-financeiras-contraste.test.ts` ainda fala em "quatro pontos que têm de concordar"; o quarto é
decorativo. Registrado na skill `shadcn-bfx`.

**A catraca** media a *fonte* (variável CSS), não o *resultado* (classe utilitária).
`checkThemeCoverage` fecha esse degrau: para todo par de `TOKEN_PAIRS` cujo lado de texto aparece no
código como `text-*`, exige `--color-*` no `@theme`. Ausência é FAIL, nunca SKIP. Verificado nos dois
sentidos — reprova antes da correção (1 FAIL, só o destructive) e aprova depois (16 de 16).

## Migração dos call sites (125)

121 migrados, 4 deixados de propósito.

- 13 já tinham sido feitos por outra sessão que commitou em paralelo (`844a6f8`).
- 108 nesta sessão, em 25 arquivos.

Números do tema claro (o escuro não muda: dentro do `.dark` os dois tokens têm o mesmo valor):

| fundo | token de preenchimento | variante `-text` |
|---|---|---|
| card / background | 2.97 · 2.06 · 4.13 | 5.18 · 5.23 · 5.22 |
| `bg-*/10` | 2.68 · 1.92 · 3.64 | 4.68 · 4.88 · 4.59 |
| `bg-*/20` | 2.42 · 1.79 · 3.19 | **4.22 · 4.54 · 4.02** ← não fecha |
| `bg-*-bg` (opaco) | 2.73 · 1.85 · 3.63 | 4.75 · 4.69 · 4.59 |

**Correção à orientação recebida:** o ponto em que o texto trava é `/20`, não `/10`. Sobre `/10` a
variante `-text` fecha (4.59–4.88). O 4.02 citado é exatamente `info-text` sobre `bg-info/20`.

**Deixados como estão (4, medidos):** o par `text-warning-foreground dark:text-warning` em
`clientes-tab-client.tsx:217` e `venda-rapida-form-v2.tsx:861,898,1052` — 16.92–18.16 no claro,
6.93–8.67 no escuro. Migrar **baixaria** o claro para 4.54–4.88.

**Três que não eram troca mecânica:**

1. `venda-rapida/page.tsx`: ícone sobre `bg-success/20`, onde nem a variante salva (4.22). Trocado o
   composto pelo tint opaco `bg-success-bg` → 4.75.
2. `clientes-tab-client.tsx`: o rótulo já estava certo e ficou; só o ícone, que forçava o
   preenchimento nos dois temas (1.92 no claro), foi migrado → 4.88.
3. `sidebar-nav.tsx`: **a migração teria piorado**. O rótulo "Nova funcionalidade" vive dentro do
   `TooltipContent`, que desenha sobre `bg-primary` — e `--primary` **inverte** entre os temas (0.145
   claro, 0.985 escuro). O preenchimento dava 6.54 claro / **2.37 escuro** (já quebrado antes de mim);
   a variante `-text` daria 3.75 / 2.37. Nenhum token semântico serve. Passou a
   `text-primary-foreground` (18.93 nos dois), com o destaque no peso da fonte.

## Achados fora da lista, encontrados durante a correção

- **`AlertDescription` tinha `opacity-90`.** A opacidade compositava o texto contra o tint do próprio
  alerta e anulava a migração para os tokens `-text`: 4.75→4.02 (success), 4.69→3.90 (warning),
  4.59→3.89 (info), 4.66→4.34 (error), e 5.67→**4.44** no escuro do error. É o mesmo defeito de
  `text-*-text/80` que a doutrina do projeto proíbe, só que aplicado ao container em vez da classe de
  cor. Removido.
- **Variante `destructive` do `<Alert>`** era o último ponto com preenchimento como texto: 4.41 sobre
  o próprio tint. `--destructive` e `--error` têm valor idêntico nos dois temas e só o vermelho tem
  variante de texto, então a variante passou a espelhar `error` → 4.66.
- **`/catalogo` podia renderizar dois `<h1>`** — a marca "BFX" de fallback (quando não há logo) mais o
  título "Catálogo de Produtos". A marca virou `<span>`.
- **`lib/design-tokens.ts` não tem nenhum consumidor** (conferido em todo o `src`). Migrado mesmo
  assim: é o modelo que se copia, e prescrevia o erro.
- **Comentários explicativos disparavam as catracas de string.** Os gates
  (`telas-crm-ia`/`telas-financeiras`) procuram `text-<token>` não seguido de `-`; comentários que
  citavam a classe crua para explicar o defeito eram lidos como uso real. Reescritos.

## Não aplicados, com justificativa

**Achado 3 (parte `/configuracoes`) — causa não se sustenta.** O achado atribui a rolagem de 390px ao
`[role=tablist]` de 436px numa caixa de 358px. Mas `query-tabs.tsx` — que é o que `/configuracoes`
usa — **já tinha** `max-w-full overflow-x-auto h-auto min-h-10` desde a fase 16 (`dbe9655`),
inclusive na revisão. E "436px numa caixa de 358px" é exatamente a assinatura de um
`overflow-x-auto` **funcionando**: `scrollWidth` 436, `clientWidth` 358. O tablist está contido. A
sobra de 465 vs 390 vem de outro elemento, que não consigo identificar sem navegador. O que fiz foi
fechar a lacuna real e verificável: `gestao-rh-tabs` nunca recebeu essa contenção. **Pendente de
confirmação no navegador.**

**Achados 10 e 12 — componente `Tabs`, sem como medir o efeito.** A instrução era medir em ≥2 rotas
se fosse corrigir. Não há navegador (MCP indisponível), não há `node_modules` e não há `.next` — não
consigo levantar a aplicação. Além disso:

- **10 (abas inativas a 4.47:1):** minha aritmética de token dá 4.62 sobre `--background`; a medição
  em runtime deu 4.47. A diferença é o `background-image` de radial-gradient que o `body` aplica, que
  o cálculo por token não enxerga. Ou seja: **não sei de quanto precisa ser o ajuste**, só que é da
  ordem de 0.03. A alternativa determinística (tornar o tablist opaco, `bg-muted`) mede 4.54 — passa,
  mas com 0.04 de margem, e mudaria a aparência de toda rota com abas. Mexer em `--muted-foreground`
  de novo (a fase 16 já mexeu) sem poder medir o resultado composto seria chute.
- **12 (`[role=tab]` a 32px):** o alvo mínimo da WCAG 2.2 AA (2.5.8, Target Size Minimum) é **24×24px**
  — já atendido. Os 44px são AAA / boa prática. Para chegar lá o `TabsList` teria de sair de `h-10`
  para ≥48px, mudando o peso visual de toda rota com abas, sem verificação possível.

Recomendo os dois como follow-up com navegador, juntos, medindo `/configuracoes` e `/gestao-rh`.

**Achado 13 — a divergência é a favor da rota pública.** A busca de `/catalogo` é `h-11` (44px) contra
os 40px do `<Input>` do app. Alinhar significaria **encolher** o alvo de toque de 44 para 40 numa rota
pública e majoritariamente mobile — e o achado 12 desta mesma revisão reclama justamente que 44px é o
mínimo desejável. Encolher o catálogo para casar com um padrão que a lista ao lado critica por ser
pequeno demais seria incoerente. Deixado, e registrado.

## O que só o CI confirma

- Compilação do Tailwind: sem `node_modules` não dá para gerar o CSS e ver a regra
  `.text-destructive-foreground` nascer. A prova local é estrutural (a chave no `@theme`, que é a
  condição necessária e suficiente no v4) e diferencial (`--color-error-foreground` está no `@theme` e
  a sonda de runtime da fase 18 diz que `text-error-foreground` resolve; o destructive não estava e
  não resolvia — depois da correção tem a mesma forma do que resolve).
- `npm run build`, `npm run lint` e `vitest` (`npm test`): não rodam localmente. Rodei o que roda sem
  dependências — `token-contrast.mjs` (22/22), `raw-color-scan.mjs --check` e os predicados dos testes
  de vitest reproduzidos à mão sobre os arquivos tocados.
- Rolagem horizontal de `/configuracoes` em 390px (achado 3) e o efeito visual real das migrações.

## Nota de ambiente

Outra sessão trabalhou neste mesmo repo durante a execução e commitou `844a6f8` por cima do meu
primeiro commit. Meus commits estão todos preservados e todos foram feitos com caminho explícito
(`git add <paths>`), nunca `-A`/`-a`, para não capturar trabalho alheio. Um patch de segurança do que
estava na árvore naquele momento ficou em `/tmp/bfx/trabalho-de-terceiros.patch`.
