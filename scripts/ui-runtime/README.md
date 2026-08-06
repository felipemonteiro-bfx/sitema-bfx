# Gate de runtime — o que a auditoria de token não vê

As catracas do BFX (`npm run cores:check`, `npm run contraste:check`, a regra ESLint `bfx/no-raw-color`)
auditam **token** e **código-fonte**. Nenhuma delas vê **pixel**.

É por isso que quatro fases de revisão passaram por cima de defeitos como estes sem enxergar nenhum:

| O que o diff mostra | O que a tela renderiza |
|---|---|
| `<Trash2 className="h-3 w-3" />` | 16×16, porque `[&_svg]:size-4` na base do `buttonVariants` tem especificidade maior |
| `<Sun className="h-[1.2rem] w-[1.2rem] />` | 16.00×16.00, mesma causa |
| `<ExternalLink className="h-3 w-3" />` | 8.42×12.00 — o flex comprimiu, faltava `shrink-0` |
| badge `absolute -top-1 -right-1` num botão 36×36 | 4px fora da caixa do botão |
| `<span className="inline-flex items-center gap-1">{label}<Chevron/></span>` | rótulo em duas linhas, seta solta ao lado |

Só `getBoundingClientRect()` revela qualquer um desses. Este gate faz isso.

## Como rodar

```bash
npm run ui:runtime                    # matriz cheia: 22 rotas x {1440,390} x {claro,escuro}
npm run ui:runtime -- --routes /cadastros --viewports 390 --themes light
npm run ui:runtime -- --json /tmp/achados.json
npm run ui:runtime -- --update-baseline
npm run ui:runtime -- --help
```

Alvo padrão `https://bfx.softlive.dev` com `admin`/`admin`. Trocar com `--base`/`--user`/`--pass`
ou com `BFX_AUDIT_BASE`/`BFX_AUDIT_USER`/`BFX_AUDIT_PASS`. Contra o dev local:

```bash
npm run dev &
npm run ui:runtime -- --base http://localhost:3008
```

A matriz cheia são 88 páginas e leva de 10 a 15 minutos. Para iterar, filtre com `--routes`.

## As cinco afirmações

| # | Regra | Afirma | Pega |
|---|---|---|---|
| a | `CONTRAST` | razão WCAG de cada texto e de cada `<svg>` contra o **fundo efetivo** | par de cores cruzado entre famílias de token |
| b | `BUTTON_OVERFLOW` | `button.scrollWidth <= button.clientWidth` (e a mesma coisa na vertical) | badge/conteúdo vazando da caixa do botão |
| c | `ICON_SIZE` | tamanho renderizado do `<svg>` == tamanho declarado nas classes | classe de tamanho sendo sobrescrita, ícone achatado por flex |
| d | `DOC_OVERFLOW` | `document.scrollWidth <= document.clientWidth` | rolagem horizontal indevida da página |
| e | `CONTENT_WRAP` | ícone e texto do mesmo controle ficam na **mesma linha** | conteúdo de botão quebrando em duas linhas |

A regra (c) tem duas metades. Quando o `<svg>` **declara** tamanho, compara com o renderizado.
Quando **não** declara e está dentro de um `<button>`, exige que ele tenha herdado os 16px do
`buttonVariants` — é o que pega a regressão em que uma guarda `:not()` mal escrita derruba a herança
(o lucide emite `class="lucide lucide-trash-2"`, e ali dentro há a substring `h-2`).

**(a) é a que uma auditoria por token jamais faria.** `token-contrast.mjs` mede pares
*declarados* (`--muted-foreground` contra `--background`, e assim por diante). Na tela, o par que
importa costuma ser cruzado entre famílias — `--sidebar-foreground` renderizado sobre o
`--background` global — e esse par não existe em `TOKEN_PAIRS` nem existiria, porque ninguém o
escreveu: ele emergiu da composição. Foi assim que apareceu um ícone a 1.00:1.

**(e) existe porque (b) era cega para ela.** Quebra de linha aumenta a **altura**; `scrollWidth >
clientWidth` mede largura. O defeito que o dono do sistema vê na tela — conteúdo de botão em duas
linhas — passava por todas as outras quatro.

## Arquitetura: quem coleta não julga

```
rendered-ui-audit.mjs   →  navegador  →  snapshot serializável  →  rendered-ui-rules.mjs
      (CLI)                (só coleta)                                  (puro, julga)
                                                                              ↑
                                                       src/__tests__/gate-ui-runtime.test.ts
```

`rendered-ui-rules.mjs` não tem dependência nem toca em DOM. Roda no `vitest` do projeto, que é
`environment: "node"` — e por isso as cinco regras têm teste unitário com snapshots sintéticos que
reproduzem número por número o que foi medido em produção. **O CI verifica a lógica do gate mesmo
sem navegador.**

A conversão de cor acontece dentro da página, com `canvas.fillStyle` + `getImageData`: é o motor do
próprio Chromium resolvendo `lab()`, `oklch()` e `color(srgb …)`. Nenhuma conversão de espaço de cor
é reimplementada aqui. A composição de alfa sobre a cadeia de ancestrais e a razão WCAG ficam na
camada pura.

## Degradação — o gate nunca mente

Sem Playwright resolvível, ou sem executável de Chromium, o gate imprime **`NÃO VERIFICADO`** com o
motivo e todos os caminhos tentados, e sai com **0**.

- Nunca reprova o build por ausência de ferramenta.
- Nunca passa em silêncio fingindo que verificou — o banner diz explicitamente que nada foi medido.

O mesmo princípio vale **depois** de o navegador subir. Uma varredura em que o login falhou mede
zero páginas e teria `achados.length === 0` — o formato exato de um PASS. Por isso o gate reprova
quando não mediu nada, reprova quando alguma página não pôde ser medida, e abre o relatório com
`paginas medidas: N de M`. Ausência de medição não é ausência de defeito.

`--require-browser` inverte para `exit 1`, para um job de CI que garanta navegador.

O Playwright é procurado em: `--playwright` / `$PLAYWRIGHT_MODULE`, `node_modules` do projeto, e o
cache do `npx` (`~/.npm/_npx/*/node_modules/playwright`). O Chromium em: `--chromium` /
`$CHROME_PATH`, `chromium.executablePath()`, os caches `ms-playwright` de macOS/Linux/Windows, e os
caminhos de sistema. Para instalar: `npx playwright install chromium`.

## Baseline

`baseline.json` guarda impressões digitais de achados **conhecidos e aceitos**. Achado novo reprova;
achado da lista não. A digital é `regra | rota | viewport | tema | caminho` — **sem a medida**, de
propósito: se o número entrasse, variação de sub-pixel viraria "achado novo", o gate soaria alarme
falso e em pouco tempo ninguém mais olharia para ele.

**O baseline nasce vazio de propósito.** A primeira varredura de produção (build `82dcc8b`) rodou
contra um deploy 15 commits atrás do branch: o `--sidebar` renderizado ali ainda era escuro no tema
claro, e o botão "Sair" ainda usava `--destructive` em vez de `--error-text`. Semear o baseline com
aquilo seria congelar defeitos que este branch já corrigiu. **A primeira gravação autoritativa tem
que acontecer depois do deploy deste branch.**

Regravar só depois de ler o que vai entrar:

```bash
npm run ui:runtime -- --update-baseline
git diff scripts/ui-runtime/baseline.json
```

### Por que ele continua vazio

A varredura contra o build `f754f76` deu **26 CONTRAST + 2 DOC_OVERFLOW**, 88 de 88 páginas.
Quatro dos CONTRAST eram falso positivo do próprio gate (o `<svg>` do gráfico, ver a lista abaixo) e
saíram pela regra. Os **24 restantes eram defeito de verdade e foram corrigidos no código** — nenhum
foi para o baseline.

Isso importa porque o alvo padrão do gate é **produção**, não o working tree. Enquanto o deploy não
alcança o branch, uma nova varredura ainda acusa esses 24: eles descrevem o que está no ar, não o
que está no repositório. **Não semeie o baseline com eles.** Congelar um defeito já corrigido no
código é pior que não ter baseline nenhum — o dia em que ele regredir de verdade, o gate fica calado.

Cada um dos 24 foi conferido antes de ser dado por fechado: nos que a correção troca só a cor do
texto, recalculando contra o `fundo` que o navegador **mediu**; nos que ela troca o fundo, contra o
token novo pelo conversor de `scripts/design-tokens/`; e os dois de rolagem, medindo no navegador
com a correção aplicada à página de produção (393 → 390 nos dois temas, e as 22 rotas varridas em
390px para garantir que o `shrink-0` novo não estoura em nenhuma outra).

## O que este gate NÃO cobre

Ser explícito aqui é parte do contrato — um gate cujo alcance ninguém conhece vira falsa sensação de
cobertura, que foi exatamente o que aconteceu com `tailwind.config.ts` (declarava tokens que o
compilador nunca leu, e por quatro fases pareceu cobertura).

- **Não roda no CI.** Não há Chromium garantido no runner. O `npm run` está pronto e o
  `--require-browser` também; falta provisionar o navegador no workflow.
- **Só o estado inicial de cada página.** Nada é clicado. Diálogo, popover, menu suspenso, aba não
  selecionada, linha em `hover`, campo com erro — nada disso é medido.
- **Só `light`/`dark` via `localStorage.theme`.** Preferência de sistema, `prefers-reduced-motion`,
  zoom de navegador e fonte aumentada não são exercitados.
- **Só duas larguras.** 1440 e 390. O intervalo entre elas — onde a maioria dos defeitos de quebra
  de linha nasce — não é varrido.
- **Fundo irresolúvel é ignorado, não acusado.** Se há `background-image` (gradiente) na cadeia de
  ancestrais, ou se a cadeia termina sem camada opaca, a regra (a) se cala. O contador
  `nao verificados` no fim do relatório mostra quantos foram — leia-o.
- **`opacity` de ancestral não é composta** no cálculo de contraste. Um texto dentro de um bloco
  `opacity-50` é medido pela cor dele, não pela cor final.
- **Gráfico não é medido — nem o todo, nem as partes.** Um `<svg>` cujos descendentes têm pintura
  própria (`fill`/`stroke` no próprio elemento) é um gráfico composto, não um glifo. O modelo da
  regra (a) — *uma* cor de traço contra *um* fundo — só descreve ícone monocromático: no lucide a
  raiz traz `stroke="currentColor"` e todo `<path>` herda dela. O `<svg class="recharts-surface">`
  não declara `fill` nem `stroke`, então o que se mediria ali é o valor **inicial** de `fill` do SVG
  (`black`) — uma cor que não pinta um pixel. Era daí que saíam 1.10:1 em `/dashboard` e
  `/comissoes` no escuro. A WCAG 2.1 SC 1.4.11 pede 3:1 para *partes* de gráfico, cada uma contra a
  cor adjacente **dela**; este gate não desce até a parte, então declara em `não verificados` — o
  contador no fim do relatório mostra quantos foram. O critério é estrutural de propósito: isentar
  por `aria-hidden` isentaria todo ícone do sistema (o lucide marca todos), e isentar por tamanho ou
  por "tem texto do lado" apagaria o ícone de sidebar a 1.00:1 que motivou este gate.
- **A regra (e) exige um `<svg>`.** Um "ícone" que na verdade é um `<span>` redondo (como o ponto da
  pílula de ponto de equilíbrio em `/financeiro`) não é visto.
- **Tamanho de ícone atrás de prefixo responsivo/estado** (`sm:h-5`, `dark:size-6`) é marcado como
  ambíguo e pulado, para não acusar errado.
- **Não é teste visual de regressão.** Não compara com imagem de referência; não vê cor errada que
  passe no contraste, alinhamento feio, ou espaçamento inconsistente.
- **Contraste é WCAG 2.x.** Não usa APCA.

O que ele **verifica sobre si mesmo**: cada página devolve o `class` da raiz, e o relatório avisa
quando o tema aplicado não é o pedido. Sem isso, se o `localStorage.theme` deixasse de funcionar,
metade da matriz viraria cópia da outra metade e o gate diria que varreu dois temas.

## Relação com `scripts/design-tokens/`

Complementares, sem sobreposição:

- `token-contrast.mjs` mede **pares declarados** em `globals.css`, em Node puro, sem navegador —
  roda no CI hoje e é a rede de segurança quando este gate não pode rodar.
- `raw-color-scan.mjs` mede **cor crua no fonte**.
- este gate mede **o que chegou na tela**.

Os três respondem perguntas diferentes. Nenhum substitui os outros.
