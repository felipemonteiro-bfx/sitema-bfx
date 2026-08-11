# Auditoria visual — CRM e Inteligência (BFX)

Régua: `design-system/IDENTIDADE-VISUAL.md` (medido em 2026-08-11).
Escopo: `crm/page.tsx`, `crm/campanhas/page.tsx`, `crm/fidelidade/page.tsx`,
`crm/importar-leads/page.tsx`, `inteligencia/page.tsx`,
`intelligence-chat-client.tsx`, `intelligence-chat-composer.tsx`,
`chat-prompt-input.tsx`.

**Nenhum arquivo de código foi alterado** — só leitura, conforme restrição.

---

## Achados

### 1 — Tipografia fora da escala (`text-[11px]`)

Categoria da Seção 3 / Divergência aberta #1 do documento de identidade.

| Severidade | Local | Trecho atual | Alvo | Esforço |
|---|---|---|---|---|
| MÉDIA | `src/app/(app)/crm/page.tsx:320` | `className="h-9 w-28 rounded-md px-2 text-[11px]"` (select de "+tag" na linha da tabela) | `text-xs` | Baixo — busca-e-substituição |
| MÉDIA | `src/app/(app)/crm/page.tsx:326` | `"h-auto p-0 text-[11px]"` (botão "ok" ao lado do select de tag) | `text-xs` | Baixo — busca-e-substituição |
| MÉDIA | `src/components/intelligence-chat-client.tsx:181` | `className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground sm:text-xs"` (linha de metadado: pílula de provedor + data/hora, acima de cada par de bolhas) | `text-xs` (o `sm:text-xs` já mostra que a intenção era essa classe; falta aplicá-la também no mobile) | Baixo — busca-e-substituição, mas revisar quebra de linha no mobile |
| MÉDIA | `src/components/intelligence-chat-composer.tsx:194` | `className="rounded-md border bg-muted/30 p-2 text-[11px]"` (linha de dica dentro do tooltip "Guia rápido") | `text-xs` | Baixo — busca-e-substituição |
| MÉDIA | `src/components/intelligence-chat-composer.tsx:247` | `className="mt-1.5 text-[11px] text-muted-foreground"` (dica fixa abaixo do composer: "Ctrl/Cmd + Enter para enviar") | `text-xs` | Baixo — busca-e-substituição |

Total do grupo: **5 ocorrências de `text-[11px]`**, nenhuma de `text-[9px]`/`text-[10px]`. Duas em
CRM, três no chat de IA — o chat concentra a maior densidade deste desvio dentre as telas
auditadas aqui.

### 2 — Peso sem papel (`font-black`)

Nenhuma ocorrência nos arquivos deste grupo. Não reportado.

### 3 — Raio sem critério (`rounded-xl` / `rounded-2xl`)

| Severidade | Local | Trecho atual | Observação |
|---|---|---|---|
| BAIXA (aceitar) | `intelligence-chat-client.tsx:204` e `:210` | `rounded-2xl rounded-br-sm` / `rounded-2xl rounded-bl-sm` nas bolhas de conversa | Caso legítimo apontado no próprio critério de auditoria — bolha de chat com canto assimétrico é convenção de UI de conversa, não deriva de `rounded-lg`. **Não é achado a corrigir.** |
| MÉDIA | `intelligence-chat-composer.tsx:126` | `rounded-2xl` na barra do composer (container do input + botões) | A barra do composer é análoga a um campo de formulário (`Textarea`/`Input`), que na escala é `rounded-md`, ou no máximo ao chip de marca da navegação (`rounded-xl`, reservado para "superfícies grandes"). `rounded-2xl` aqui não tem critério que o separe do `lg`/`xl` — é a mesma divergência #3 do documento, não um caso de bolha de chat. Alvo: avaliar `rounded-xl` (a barra é grande o bastante para justificar o degrau acima do padrão) ou `rounded-lg`. |
| MÉDIA | `intelligence-chat-composer.tsx:216` | `rounded-2xl` no `ChatPromptInput` (textarea interno) | Mesmo caso: é um campo de formulário, e campo é `rounded-md` na escala. Herdar `rounded-2xl` do container pai duplica o raio em vez de fazer o campo obedecer à regra de "campo, botão, célula → `rounded-md`". |

Total do grupo: **4 ocorrências de `rounded-2xl`**, 2 aceitas (bolhas), 2 questionáveis (composer)
— exigem julgamento visual, não é busca-e-substituição direta porque mexe no card mais visível
da tela de IA.

### 4 — Sombra: classe vs. token

| Severidade | Local | Trecho atual | Observação |
|---|---|---|---|
| BAIXA | `intelligence-chat-composer.tsx:126` | `shadow-sm` na barra do composer | Só um degrau de sombra na tela toda; não há segundo elemento na mesma superfície competindo por elevação, então não viola a regra "um degrau por nível". Não usa `dark:shadow-[var(--shadow-*)]`, mas nenhum outro elemento do CRM/IA usa token de sombra tampouco — não é uma divergência introduzida por este grupo, é a divergência #4 já registrada no documento (84 usos mistos, sistema-wide). Reportado como observação, não como achado isolado deste grupo. |
| BAIXA | `intelligence-chat-composer.tsx:187` | `shadow-md` no tooltip "Guia rápido" | Consistente com a regra ("flutuante → `shadow-lg`" seria o ideal para um tooltip, mas `shadow-md` é aceitável para popover leve). Sem token dark explícito — mesma observação acima. |

Nenhum uso de `shadow-lg`/`shadow-xl` fora de padrão neste grupo. Não há achado de severidade
alta aqui.

### 5 — Hierarquia de botão / ação destrutiva sem separação

| Severidade | Local | Trecho atual | Alvo | Esforço |
|---|---|---|---|---|
| ALTA | `src/app/(app)/crm/campanhas/page.tsx:224-227` | Botão "Excluir" da campanha: `<button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Excluir</button>`, lado a lado com "Disparar agora" (`<Button type="submit" size="sm">`, variant default/primary) no mesmo `flex items-center gap-2`, **sem confirmação** (não há `confirm()`, `AlertDialog` nem atributo de confirmação no form) | Ação destrutiva e irreversível (exclui campanha) deveria usar `variant="destructive"` (ou ao menos `outline` com `text-destructive`) para se diferenciar visualmente de "Disparar agora", e precisa de confirmação antes do submit — hoje um clique i acidental ao lado do botão de disparo já exclui a campanha | Médio — troca de variante é busca-e-substituição, mas adicionar confirmação (dialog ou `confirm()`) exige tocar no fluxo do form, fora do escopo de "correção segura" |

Os demais botões auditados (Filtrar, Criar tag, Resgatar, Salvar estágio, Importar leads, Limpar
conversa, Enviar, Gravar áudio) seguem hierarquia coerente: `default` para ação primária,
`outline`/`ghost` para secundária, nenhum caso adicional de destrutiva mal sinalizada.

### 6 — Cor semântica: preenchimento vs. família `-text`

Nenhuma divergência encontrada nas telas deste grupo. Todos os usos observados já seguem a regra
correta:

- `crm/page.tsx`: `text-primary` só em título de card (papel correto, Seção 3).
- `crm/fidelidade/page.tsx:80,121`: `text-success-text` para valores em texto (vale em R$,
  pontos positivos) — correto, não usa `text-success` cru como texto.
- `campanhas/page.tsx:77,212` e `importar-leads/page.tsx:35,41`: `error-bg`/`error-text` e
  `success-bg`/`success-text` para banners de feedback — combinação correta (`-bg` no fundo,
  `-text` no texto).
- `intelligence-chat-composer.tsx:146,149`: `bg-destructive` como preenchimento de indicador
  visual de gravação (bolinha pulsante, barra de progresso) — uso correto, é preenchimento
  decorativo com informação (estado "gravando"), não texto.

### 7 — Chat da IA: tabela renderizada pelo modelo (`MarkdownTable`)

`src/components/intelligence-chat-client.tsx:20-53`. Comparado ao padrão do `Table`/`TableHeader`
do sistema (`src/components/ui/table.tsx`):

| Severidade | O quê | Padrão do sistema | O que o `MarkdownTable` faz | Local |
|---|---|---|---|---|
| MÉDIA | Cabeçalho sem maiúsculo | Rótulo maiúsculo do sistema é `text-xs font-semibold uppercase tracking-wider` (Seção 3) | `<th>` usa `px-3 py-1.5 text-left font-semibold text-foreground whitespace-nowrap` — **sem `uppercase`**, tamanho herdado do `table` pai (`text-xs`), certo, mas falta o `uppercase tracking-wider` que o resto do sistema usa em cabeçalho/rótulo | `intelligence-chat-client.tsx:29` |
| MÉDIA | Números não alinhados à direita nem `tabular-nums` | Tabelas do sistema alinham coluna numérica à direita com `tabular-nums` (visto em `fidelidade/page.tsx:70-71,79-80` — `text-right font-medium`, `text-right text-success-text`) | `<td>` sempre `px-3 py-1.5 text-foreground border-t whitespace-nowrap` — **sem `text-right`, sem `tabular-nums`**, para qualquer coluna, inclusive quando o conteúdo é valor monetário ou quantidade (ex.: tabelas de Vendas/Despesas descritas no `CLAUDE.md` como saída do `buildToolSummary`) | `intelligence-chat-client.tsx:43` |
| BAIXA | Borda por classe crua (`border-b`, `border-t`) em vez de explicitamente por token | O `Table` do sistema também usa `border-b`/`border-t` sem token explícito (ver `table.tsx:49`), então este não é um desvio introduzido pela tabela de IA — é consistente com o próprio padrão do sistema. Não reportar como achado à parte. | — |

Resumo: a tabela do chat reaproveita cor e raio do sistema (`rounded-lg border`, zebra
`bg-background`/`bg-muted/20`), mas diverge no tratamento tipográfico do cabeçalho e no
alinhamento numérico — as duas convenções que tornam as tabelas do sistema legíveis de relance
(cabeçalho gritante em maiúsculo pequeno, número alinhado à direita). Como a tabela é gerada a
partir de markdown livre do modelo, corrigir exige lógica de detecção de coluna numérica
(comparar valores após strip de `R$`/`.`/`,`), não é troca de classe simples.

### 8 — Acessibilidade: botão só-ícone sem `aria-label`

Verificado em `intelligence-chat-composer.tsx` (5 `size="icon"`): **todos os 5 têm `aria-label`**
(Cancelar gravação, Parar e transcrever, Guia rápido, Enviar mensagem, Gravar áudio/Transcrevendo).
Nenhum achado aqui — hipótese inicial do briefing ("o chat costuma ter vários [sem aria-label]")
**não se confirma** neste componente.

Não verificado (fora do escopo de arquivos listados): se o `FormSelect` do provider
(`showProviderSelect`) ou o `Button` do "Limpar conversa" (`inteligencia/page.tsx:204-209`) têm
rótulo acessível — este último tem texto visível ("Limpar conversa"), então não é ícone-only e
está fora do critério 8.

**Hipótese não verificada:** não encontrei um botão de "anexar arquivo" visível no composer —
`askAi` em `inteligencia/page.tsx:47-55` lê `formData.get("attachment")`, mas não há `<input
type="file">` nem botão de clipe nos três arquivos de chat auditados. Se existir em outro
componente fora deste escopo (ou for feature morta), não é possível confirmar sem grep mais
amplo — não reporto como achado, só registro a lacuna observada.

---

## Contagem por categoria

| Categoria | Achados |
|---|---|
| Tipografia fora da escala (`text-[11px]`) | 5 |
| Peso sem papel (`font-black`) | 0 |
| Raio sem critério | 2 questionáveis (composer), 2 aceitos (bolhas de chat) |
| Sombra classe vs. token | 0 achados isolados (observação geral, já registrada no doc) |
| Hierarquia de botão / destrutiva | 1 (ALTA) |
| Cor semântica preenchimento vs. `-text` | 0 |
| Tabela do chat vs. padrão do sistema | 2 (cabeçalho maiúsculo, alinhamento numérico) |
| Acessibilidade (ícone sem `aria-label`) | 0 |

**Total de achados acionáveis: 10** (5 tipografia + 2 raio + 1 hierarquia/destrutivo + 2 tabela).

## Correções seguras por busca-e-substituição

- As 5 ocorrências de `text-[11px]` → `text-xs` (achado 1) — mudança de classe isolada, sem
  reestruturação de layout. Vale conferir visualmente a linha de metadado do chat
  (`intelligence-chat-client.tsx:181`) depois, porque ela já tinha um `sm:text-xs` — a
  intenção de design provavelmente sempre foi `text-xs`, só nunca foi aplicada no breakpoint base.

## Correções que exigem julgamento visual

- **Achado 3 (raio do composer):** decidir entre `rounded-xl` e `rounded-lg` para a barra do
  composer e o textarea interno — mexe no elemento mais visível da tela de Inteligência, precisa
  de conferência visual antes/depois.
- **Achado 5 (botão Excluir campanha):** trocar variante para `destructive` é busca-e-substituição,
  mas adicionar confirmação de exclusão é mudança de comportamento — requer decisão de produto
  (dialog vs. `confirm()` nativo) além da parte visual.
- **Achado 7 (tabela do chat):** cabeçalho maiúsculo é troca de classe simples
  (`uppercase tracking-wider` no `<th>`), mas alinhamento numérico exige lógica de detecção de
  coluna numérica no `parseMarkdownTable`/`MarkdownTable` — não é troca de classe, é código novo.
