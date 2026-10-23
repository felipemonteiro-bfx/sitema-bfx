# Redesign Vantage com verde BFX — spec e plano

Data: 2026-10-16 · Branch: `redesign` → PR para `nextjs-migration` · Sem card Jira (atividade avulsa).

Artboards aprovados pelo André (fonte da verdade visual, cores e medidas exatas):
`/private/tmp/claude-501/-Users-andrebrumcortezferreira-Documents-BFX-sitema-bfx/c2f0ccbf-afa5-4b6f-b4f6-4358714384ff/scratchpad/artboards/`
(`Login.dc.html`, `Main.dc.html` = Início escuro, `InicioClaro.dc.html`, `Historico.dc.html`, `Busca.dc.html`)
e o canvas https://claude.ai/artifact/MUt7KZ1ZeBkGfBZWvJTiwU.

## 1. Atual vs esperado

**Hoje:** neutros azulados (hue 250), card com borda+sombra, título de página verde, 5 KPIs com
count-up, gráfico recharts, Hall da Fama / Resumo Rápido / Atalhos Rápidos, sidebar sem busca,
login em card centralizado, nenhuma busca global.

**Esperado:**
- Superfícies em degraus: página → casca (`main`) → painel → card interno/poço. Neutros
  esverdeados de croma baixíssimo no escuro; claro em croma 0 (preserva `tokens-fundo-neutro`).
- Raios: casca 24px, painel 20px, card interno 14px, controle 12px.
- Números em Geist Mono: `.tabular-nums` ganha `font-family: var(--font-mono)` (cobre todas as telas).
- Título de página em `--foreground` (não verde). Verde BFX intacto: `--primary` #6FCA69 (escuro)
  / #0F7F0E (claro); texto verde sobre tint claro = #0C6E0B.
- Motion por tokens CSS `--mov-*` + classes `.anim-entrada`, `.anim-barra`, `.anim-dica`
  (atraso por `--i`). Só transform/opacity; hover/tooltip do gráfico em CSS puro
  (`:hover`, `:focus-within`, `:has()`), gráfico pode ser server component. Count-up sai.
  Valores: entrada translateY 8px + opacity 320ms `cubic-bezier(.22,1,.36,1)` stagger 40ms;
  barras scaleY 480ms stagger 30ms; hover de barra: demais opacity .45 em 160ms;
  tooltip 140ms ease-out subindo 4px; segmentado 220ms; nav hover 120ms.
  `prefers-reduced-motion` → `animation: none` / `transition: none`.
- Início: 4 KPIs (Faturamento, Lucro líquido, Margem com ticket no rodapé, Clientes), sparkline
  em Faturamento e Clientes; gráfico Evolução mensal = custo variável (hachurado) + margem de
  contribuição (`metrics.margem`, verde), rótulo "Margem", tooltip; Raio-X da equipe; Top produtos;
  ficam Mural de Avisos e Clientes mês a mês (visual novo). Filtro de data/vendedores num popover
  "Filtros". Pill "Mês em andamento" quando o período vai do dia 1 até hoje.
- Histórico como tela-modelo: chips de filtro removíveis (link sem o parâmetro, funciona sem JS),
  barra de distribuição por status de assinatura, coluna Status com ícone, filtro
  `?assinatura=pendente|assinado`.
- Busca ⌘K/Ctrl+K: vendas e clientes no servidor com escopo de perfil (`resolveVendedorScope`),
  páginas e ações do menu do perfil, sugestão por frase (vendedor + status de assinatura + forma →
  link para Histórico), rodapé `/inteligencia?pergunta=…` só para admin (preenche, não envia).
  Atalhos de ação com modificador NÃO entram (o Chrome não deixa capturar Ctrl/⌘+N); ficam ↑↓ ↵ esc.
- Login: painel de marca à esquerda com mini gráfico **decorativo** (sem dado real — a página é
  pública), formulário à direita, sem "esqueci a senha".
- Responsivo até 360px sem scroll horizontal, `:focus-visible` visível, alvos ≥44px.

**Fora de escopo:** escopo do Histórico por vendedor (card próprio); Início do vendedor (o
`/dashboard` é só admin); coluna "Parcelas pagas"; atalhos com modificador; "Trocar empresa";
alerta de estoque (decisão v1.1); status "Rascunho"; redesenho página a página além do Histórico;
`clients/mobile`; `preview/flowsuite` (removido).

## 2. Decisões aprovadas pelo André (2026-10-16)

1. Campos mantêm borda com 3:1 (`--input`/`--border`); divisórias decorativas usam token novo fora dos pares.
2. Count-up dos KPIs sai.
3. Saem do Início: KPI Ticket, KPI Top vendedor, Hall da Fama, Resumo Rápido, Atalhos Rápidos.
4. Gráfico = custo variável + margem de contribuição, rótulo "Margem".
5. Saem ⌘N/⌘R/⌘F, "Estoque baixo", "Trocar empresa". "Reenviar link" vira link pro Histórico filtrado.
6. `/api/search` (sem escopo e sem uso) é removido.
7. Escopo do Histórico por vendedor fica para outro card.
8. `preview/flowsuite` sai.

## 3. Contrato de tokens (nomes fixados na tarefa A; cada um em `:root`, `.dark` e `@theme inline`)

Superfícies `--shell`, `--shell-borda`, `--painel-borda`, `--poco`, `--controle`, `--controle-ativo`,
`--divisoria`; marca `--marca-tint`, `--marca-tint-texto`; texto `--texto-secundario`; gráfico
`--hachura-traco`, `--hachura-fundo`, `--grafico-neutro`, `--grafico-trilha`, `--grafico-inativo`;
vidro `--vidro`, `--vidro-borda`; raios `--radius-shell`, `--radius-painel`, `--radius-interno`,
`--radius-controle`; tipografia `--font-mono`, `--font-sans`, `--font-display`, `--text-titulo`,
`--text-kpi`; movimento `--mov-*`.

Valores dos artboards — escuro: página #070807, casca #0B0C0B, painel #111312, card interno #161917,
poço #0F1110, controle #131514, divisória #1F2220, tint #16301A, texto 2º #C9CECB, muted #9BA19D.
Claro: página #ECEEEC, casca #F7F8F7, painel #FFFFFF, poço #F3F5F3, divisória #E6E9E6,
tint #E3F3E2, texto 2º #3B413D, muted #5C635E.

## 4. Regras que toda tarefa respeita

- Nenhuma cor Tailwind crua (ver `design-system/DE-PARA-CORES.md`); token novo nos 3 pontos;
  `tailwind.config.ts` é inerte (Tailwind v4). Par novo de texto/fundo vai para `TOKEN_PAIRS`.
- `escala:check` proíbe `text-[13px]` etc.: usar a escala; só `--text-titulo` e `--text-kpi` são fluidos.
- Sem dependência nova. `cmdk` 1.1.1 já está instalado (usar com `shouldFilter={false}` no Dialog shadcn).
- Hook bloqueia o padrão `RegExp exec`: usar split/match.
- Modo discreto: valores novos levam `valor-sensivel`/`bloco-sensivel`.
- UI web: carregar as skills `impeccable`, `ui-ux-pro-max:ui-ux-pro-max` e `shadcn-bfx` antes de codar.
- Gates ao terminar: `npx vitest run <arquivos>`, `npx tsc --noEmit -p tsconfig.json`, `npm run lint`,
  `npm run cores:check`, `npm run contraste:check`, `npm run escala:check`, `npm run jsx:check`.
- Testes que fixam o visual antigo (`tokens-fundo-neutro`, `sidebar-tema-claro`, `kpi-card`,
  `runtime-achados-contraste`, `telas-*`) são atualizados NA tarefa que muda a coisa, com a justificativa.

## 5. Tarefas

| Id | Tarefa | Arquivos principais | Depende |
|---|---|---|---|
| A | Tokens, fontes (Geist_Mono → `--font-mono`), motion (`src/lib/motion.ts` espelha `--mov-*`), neutros novos, `--ring` verde, sem gradiente no body, `.page-title` foreground, `.tabular-nums` mono, `themeColor`, keyframes `entrar`/`crescer-y`/`dica` | `globals.css`, `app/layout.tsx`, `token-contrast.mjs`, `lib/motion.ts`, `design-system/*.md`, `tokens-fundo-neutro.test.ts`, `redesign-tokens.test.ts` | — |
| A2 | Menu como módulo: `menuDoPerfil(role)`, grupos com chave de ícone, `grupoDaRota` | `lib/menu.ts`, `menu.test.ts` | — |
| B2 | Contadores/alertas da sidebar: assinatura pendente (token, não assinada, não cancelada/estornada, escopo do vendedor) e parcelas vencidas (só admin, critério do relatório de inadimplência); nada de estoque | `lib/alertas-shell.ts`, `alertas-shell.test.ts` | — |
| F1 | Servidor da busca: `interpretarConsulta`, `#258` por id, sem acento; rota com sessão (401), `resolveVendedorScope`, máx. 80 chars, 5 vendas + 5 clientes + total, só id/cliente/data/valor/status; remover `/api/search` | `lib/busca-rapida.ts`, `api/busca-rapida/route.ts`, `lib/db-search.ts` (param `escopo`), testes | — |
| F4 | `/inteligencia?pergunta=` preenche o campo sem enviar | `inteligencia/page.tsx`, `intelligence-chat-client.tsx`/composer | — |
| E2a | Filtro `assinatura` no Histórico: `whereAssinatura`, `urlSemFiltro` | `lib/historico-filtros.ts`, `historico/page.tsx` (só where/Search), `historico-vendas-cards.tsx` (tipo) | — |
| B | Casca: layout, sidebar com grupos/contadores/"Novo"/"Alertas de hoje" (admin), lugar do gatilho da busca, sino e olho 44px, mobile | `(app)/layout.tsx`, `sidebar-nav.tsx`, `mobile-menu-trigger.tsx`, `notification-bell.tsx`, `valores-toggle.tsx`, `LogoutButton.tsx`, `theme-toggle.tsx`, `sidebar-tema-claro.test.ts` | A, A2, B2 |
| C | Login | `(auth)/login/page.tsx`, `login-painel-marca.tsx` | A |
| D1 | KPI card (valor final no SSR, mono, sparkline), `evolucao-mensal.tsx` (server, colunas focáveis com aria-label, tooltip CSS, margem negativa sem topo verde), `lib/grafico-escala.ts`, `evoData` ganha `margem` | `kpi-card.tsx`, `evolucao-mensal.tsx`, `grafico-escala.ts`, `dashboard-charts.tsx`, `clientes-mes-a-mes.tsx`, `lib/finance.ts` | A |
| E1 | Componentes compartilhados: Card `rounded-painel` sem sombra, Table, Badge `rounded-full`, controles 44px, PageHeader com trilha "/" + `text-titulo` + slot `selo` | `components/ui/*`, `button-variants.ts`, `page-header.tsx` | A |
| F2 | Paleta: `ui/command.tsx` (cmdk), `busca-rapida.tsx`, `lib/busca-rapida-ui.ts` (`teclaAbreBusca`, `montarGrupos`), debounce 200ms + AbortController | idem + teste | A, A2, contrato F1 |
| D2 | Montar o Início, `periodo-segmentado.tsx`, `lib/dashboard-periodo.ts` | `dashboard/page.tsx` + novos | D1, E1 |
| E2 | Histórico visual: `filtros-ativos.tsx`, `barra-distribuicao.tsx`, `status-assinatura.tsx` | `historico/page.tsx` + novos | E1, E2a |
| G | CRM Atendimento WhatsApp no padrão de 3 colunas (artboard `Atendimento.dc.html`, aprovado em 16/10): lista com busca + chips por etapa + avatar/prévia/hora/contador; chat com bolhas (cliente neutra à esquerda, BFX verde à direita com tique enviado/entregue/lida), registro interno como pílula tracejada, janela 24h no cabeçalho; rodapé com faixa do automático (Assumir/Retomar), respostas prontas em chips, campo + botão enviar; coluna de contexto (ficha, fidelidade, Organizar atendimento, últimas vendas). Kanban recebe o mesmo visual. **Tela própria (pedido do André, 16/10):** rota `/crm/atendimento/janela` em tela cheia, sem a sidebar do sistema, só o WhatsApp da BFX (cabeçalho fino "WhatsApp BFX" + status da integração + link de volta), mesma guarda `requireAdmin`; no atendimento normal, botão "Abrir em nova janela" (`target="_blank"` com `rel="noopener"`). Só layout: nenhuma regra de envio, janela, pausa ou kanban muda | `crm/atendimento/{page,kanban,reply,contexto,resumo-cliente}.tsx` | E1 |
| F3 | Encaixar a busca na casca e no mobile (`aria-keyshortcuts="Meta+K Control+K"`) | `(app)/layout.tsx`, `sidebar-nav.tsx`, `mobile-menu-trigger.tsx` | B, F2 |

Ondas: 1 = A, A2, B2, F1, F4, E2a, S1 (escopo por vendedorId) · 2 = B, C, D1, E1, F2 · 3 = D2, E2, F3, G · 4 = revisão em subagentes + Grok, gates completos, build, PR.

## 6. Riscos

Tema claro (neutros e Card mudam em ~69 arquivos); contraste de pares novos e de tokens com alfa
(`--vidro` precisa de fallback opaco); `--border` mantendo 3:1; Geist Mono mais larga em tabelas a
360px (`/financeiro`, `/prudent`, `/boletos`); CLS da terceira fonte; contadores da sidebar a cada
navegação (layout `force-dynamic`); a ⌘K não pode alargar o que o vendedor já vê; ordem dos merges.

Escopo do vendedor: o vínculo real é `Venda.vendedorId` (a coluna texto `vendedor` é deprecated e não
é única). `whereVendasDoUsuario` (`src/lib/vendedor-scope.ts`) usa `vendedorId` e, só para venda legada
sem id (`vendedorId` nulo, como a importação grava quando o nome não bate com usuário), o texto. É o
mesmo filtro da lista, do total e do `#id` da ⌘K, dos clientes do vendedor e do contador da sidebar.

Assinatura pendente tem fonte única (`whereAssinaturaPendente`, `src/lib/historico-filtros.ts`): venda
válida com `assinaturaToken` e sem `Assinatura` assinada; venda sem linha de Assinatura, `expirado` e
`processando` contam como pendentes.

Contador de parcelas vencidas: segue o relatório de inadimplência (inclui o vencimento de hoje, usa o
relógio do servidor e inclui parcela em lote de antecipação) e pode divergir do cron `alertas-admin`
(`< hoje`, só `ativa`). Divergência conhecida; não "corrigir" sem decisão do André.
