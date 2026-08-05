# Fase 17 — Achados da revisão visual (CRM e IA)

**Revisor:** subagente com a skill `ui-ux-pro-max`
**Método:** o MCP do navegador caiu no meio; o revisor subiu o Chromium do cache `ms-playwright`
direto para não travar. Login pela API (`/api/auth/login`) — o submit por clique corria antes da
hidratação do React Hook Form. Contraste por composição em canvas resolvendo `lab()` e alfa.
Sanity check 21.00 em 100% das medições. Uma primeira versão da troca de tema só removia `dark`
sem repor `light` e mediu escuro duas vezes; foi corrigida e reconferida.
**Telas:** `/crm`, `/crm/campanhas`, `/crm/fidelidade`, `/crm/importar-leads`, `/inteligencia` —
1440px e 390px, tema claro e escuro.

## Dado errado — mais grave que qualquer questão estética

**`/inteligencia` credita toda resposta ao Gemini, seja qual for o provedor.** O rótulo é literal:

- `src/app/(app)/inteligencia/page.tsx:158` → `provider: "gemini"` fixo ao mapear o histórico
- `src/components/intelligence-chat-client.tsx:122` → `const provider = "gemini";` fixo, renderizado em `:167`

O provedor real sai de `getAiProvider()` (`config.aiProvider` → `AI_PROVIDER`: gemini | openai |
litellm). **Prova em produção:** a mensagem de 27/07/2026 cujo corpo é
`Erro ao chamar LiteLLM: /chat/completions: Invalid model name passed in model=Qwen/...`
está rotulada **GEMINI**. Quem auditar custo ou qualidade pelo rótulo olha o provedor errado.

## Alta

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 1 | crm/fidelidade | Rolagem horizontal em 390px — única das 5 | `scrollWidth` **552** vs `clientWidth` **390** (+42%). Tabela "Saldo de pontos" com min-content 473px num `<Card>` que é item de `grid lg:grid-cols-2` sem `min-w-0`. Diagnóstico do revisor: `min-width:0` no Card leva 552→472; no `.overflow-x-auto` não muda nada |
| 2 | fidelidade, campanhas, importar-leads | A correção de tokens da fase 16 não alcançou estas telas — 6 call sites crus | `fidelidade:76` e `:117` `text-success` **2.97:1** · `campanhas:212` `text-warning` **2.06:1** · `importar-leads:35` `text-success` sobre `bg-success/10` **2.67:1** |
| 3 | campanhas, importar-leads | **`--error-text` não existe** | Só success/warning/info ganharam variante de texto. O callout de erro (`campanhas:77`, `importar-leads:41`) mede **4.02:1** e não tem token para onde migrar. A variante `error` do `badge.tsx:24` também ficou para trás |

## Média

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 4 | inteligencia | **Nenhum heading na página** e destoa das outras 20 rotas | `main h1` ausente; `h1/h2/h3` dentro do `<main>` = lista vazia. O título é um `<div>` (`CardTitle`) **30px/600**, sem breadcrumb. As 4 rotas de `/crm`: `<h1>` **24px/700** com `page-title-gradient` e breadcrumb. O título é 6px MAIOR que o das irmãs, em peso menor e sem valor semântico |
| 5 | crm | Select e botão desalinhados na mesma linha, ×200 linhas | `FormSelect` h=**28** radius 10 vs botão "Salvar" h=**36** radius 8 → **10px** de desalinho na base. Repete na coluna "Tags" |
| 6 | inteligencia | Em 390px sobram 210px de leitura (54% da tela) | viewport 390 → painel 282 → linha 256 → bolha 236 (`max-w-[92%]`) → conteúdo **210**. `<Card>` mantém `p-6` sem redução responsiva. Nas rotas de `/crm` o conteúdo recebe ~358px |
| 7 | inteligencia | Corpo da tabela markdown abaixo do limiar no claro | 12px `text-muted-foreground` sobre `rgb(247,247,247)` = **4.43:1**. Vale para todas as células de dado |
| 8 | inteligencia | Markup interno vaza cru para o usuário | Mensagem renderiza literalmente `<tool_call> <function=resumo_financeiro>`; outra expõe o erro do LiteLLM com nome de modelo. É conteúdo persistido, mas está na tela |

## Baixa

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 9 | inteligencia | Rótulos do chat abaixo do limiar no claro | "Você" **3.65:1**, "Assistente" **4.45:1**, pílula do provedor **4.35:1**. Família nova: `muted-foreground` sobre fundo `muted` — não é o problema de success/warning/info |
| 10 | todas (chrome) | Breadcrumb "Inicio" sem acento vs sidebar "Início" | Ambos no mesmo DOM. Mesma família do achado 10 da fase 16 ("Relatorios") |

## OK (registrado para não parecer omissão)

Tema escuro: **zero reprovações** nas 5 telas e nas 2 larguras. Sem rolagem horizontal em 4 das 5.
**Zero componente errado** — nenhum `<select>`/`<textarea>` nativo; o único `<table>` cru é o parser
de markdown documentado; a `table` do `/crm` é o próprio `tableVariants` do shadcn (falso positivo
da varredura). **As 4 rotas de `/crm` são da mesma família**, conferido por `getComputedStyle`:
mesmo h1, mesmo card, mesmo `CardTitle`, breadcrumb nas 4. **Estados vazios bons** — o de "sem
template Meta aprovado" diz a causa e o próximo passo. A tabela markdown rola dentro do próprio
container sem estourar a página, que é exatamente o que falta no achado 1.

## Não avaliado

Disparo e exclusão de campanha (WhatsApp real) · submissão da importação · badges `info`/`warning`
com dado real (o funil tem 835 em "Cliente" e 0 nos outros 4 estágios; medidos sinteticamente com
as classes reais) · "Limpar conversa" · chat sem histórico.

**Ressalva do revisor:** usou a única pergunta autorizada no chat para avaliar a renderização da
tabela markdown, o que gravou uma linha em `AiMensagem`. A primeira tentativa com Enter puro não
enviou — o composer exige Ctrl/Cmd+Enter e informa isso na dica: é intencional, não bug.
