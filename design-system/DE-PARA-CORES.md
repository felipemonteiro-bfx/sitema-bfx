# De-para: cor crua → token semântico

Documento versionado — não é conhecimento tácito. Consultado por qualquer pessoa (ou fase GSD)
que migre uma tela nas fases 11-14: aqui está o destino de cada classe Tailwind de cor crua em
uso no projeto, com a semântica por trás da escolha.

Gerado a partir do inventário real do scanner (`scripts/design-tokens/raw-color-scan.mjs`) sobre
`design-system/raw-color-baseline.json`: **174 classes cruas distintas**, agrupadas em 22
arquivos de `src/`. O número supera a estimativa inicial de 158 porque o scanner conta cada
variante de opacidade (`bg-purple-900/30`) como uma classe própria — a decisão de token é a
mesma para a base e para as variantes com `/NN`.

## 1. Princípio

O de-para segue a **semântica**, não a **aparência** (D-02): `bg-green-100` vira token de sucesso
porque *significa* confirmação, não porque é verde. É isso que faz o dark mode funcionar de
verdade — o token troca de valor entre `:root` e `.dark`, a cor crua nunca troca sozinha. Uma
tela migrada corretamente não tem `dark:` espalhado por cor; o tema já está embutido no token.

Esta fase **não é redesign** (D-01). Nenhuma paleta nova entra aqui: a identidade visual do BFX
(slate + verde) permanece, e a paleta oficial da marca (hexadecimais do cliente) segue bloqueada
em UXP-06. O que se aproveita de qualquer sugestão de skill de design é o *checklist* de
qualidade (contraste, tokens, D-03), nunca a paleta em si.

## 2. Tabela por família

Uma linha por classe crua distinta encontrada no inventário. Regra de tom: 50-200 quase sempre
vira a variante `-bg` (fundo sutil), 300-600 vira o token base (cor sólida — texto, ícone, borda
saturada), 700+ e as variantes com opacidade (`/20`, `/30`, `/40`, usadas em overlays escuros)
também caem na variante `-bg`, porque no CSS atual `--success-bg` etc. já carregam a opacidade
embutida no valor OKLCH.

### green / emerald / lime (sucesso)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-green-100` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/bfx-intelligence-panel.tsx |
| `bg-green-50` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/antecipacao-client.tsx |
| `bg-green-50/10` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/importacao-clientes-client.tsx, components/importacao-fornecedores-client.tsx |
| `bg-green-600` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx |
| `bg-green-700` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/antecipacao-client.tsx |
| `bg-green-800` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/antecipacao-client.tsx |
| `bg-green-900/30` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/bfx-intelligence-panel.tsx |
| `bg-green-950/30` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/antecipacao-client.tsx |
| `bg-green-950/40` | `success-bg` | fundo sutil de confirmacao (cartao/badge de sucesso) | components/antecipacao-client.tsx |
| `border-green-100` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/bfx-intelligence-panel.tsx |
| `border-green-200` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx, components/importacao-clientes-client.tsx, components/importacao-fornecedores-client.tsx |
| `border-green-300` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/bfx-intelligence-panel.tsx |
| `border-green-700` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/bfx-intelligence-panel.tsx |
| `border-green-800/60` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx |
| `border-green-900/30` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/bfx-intelligence-panel.tsx |
| `shadow-green-500/30` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx |
| `text-green-300` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx |
| `text-green-400` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `text-green-500` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/bfx-intelligence-panel.tsx |
| `text-green-500/80` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx |
| `text-green-600` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `text-green-700` | `success` | confirmacao, valor positivo, estado ativo/concluido | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx, components/importacao-clientes-client.tsx, components/importacao-fornecedores-client.tsx |

### red (erro)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-red-50` | `error-bg` | fundo sutil de erro/alerta critico | components/importacao-client.tsx |
| `bg-red-50/50` | `error-bg` | fundo sutil de erro/alerta critico | components/bfx-intelligence-panel.tsx |
| `bg-red-500` | `error` | erro, valor negativo, exclusao | components/notification-bell.tsx |
| `bg-red-950/20` | `error-bg` | fundo sutil de erro/alerta critico | components/bfx-intelligence-panel.tsx |
| `border-red-200` | `error` | erro, valor negativo, exclusao | components/bfx-intelligence-panel.tsx |
| `border-red-800` | `error` | erro, valor negativo, exclusao | components/bfx-intelligence-panel.tsx |
| `text-red-400` | `error` | erro, valor negativo, exclusao | components/bfx-intelligence-panel.tsx, components/importacao-client.tsx |
| `text-red-500` | `error` | erro, valor negativo, exclusao | components/bfx-intelligence-panel.tsx |
| `text-red-600` | `error` | erro, valor negativo, exclusao | app/assinatura/[token]/page.tsx, components/bfx-intelligence-panel.tsx |

### amber / yellow / orange (alerta)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-amber-100` | `warning-bg` | fundo sutil de alerta/pendencia | components/bfx-intelligence-panel.tsx, components/copiar-link-assinatura.tsx |
| `bg-amber-50` | `warning-bg` | fundo sutil de alerta/pendencia | components/antecipacao-client.tsx, components/campanha-template-picker.tsx, components/copiar-link-assinatura.tsx, components/edit-venda-form-client.tsx, components/importacao-client.tsx |
| `bg-amber-500` | `warning` | alerta, pendencia | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `bg-amber-600` | `warning` | alerta, pendencia | components/bfx-intelligence-panel.tsx |
| `bg-amber-900/30` | `warning-bg` | fundo sutil de alerta/pendencia | components/bfx-intelligence-panel.tsx |
| `bg-amber-950` | `warning-bg` | fundo sutil de alerta/pendencia | components/campanha-template-picker.tsx |
| `bg-amber-950/30` | `warning-bg` | fundo sutil de alerta/pendencia | components/antecipacao-client.tsx, components/edit-venda-form-client.tsx |
| `bg-amber-950/40` | `warning-bg` | fundo sutil de alerta/pendencia | components/antecipacao-client.tsx |
| `border-amber-100` | `warning` | alerta, pendencia | components/edit-venda-form-client.tsx |
| `border-amber-200` | `warning` | alerta, pendencia | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `border-amber-300` | `warning` | alerta, pendencia | components/campanha-template-picker.tsx, components/copiar-link-assinatura.tsx, components/importacao-client.tsx |
| `border-amber-500` | `warning` | alerta, pendencia | components/antecipacao-client.tsx, components/produto-form-client.tsx |
| `border-amber-700` | `warning` | alerta, pendencia | components/campanha-template-picker.tsx |
| `border-amber-800/50` | `warning` | alerta, pendencia | components/bfx-intelligence-panel.tsx |
| `border-amber-800/60` | `warning` | alerta, pendencia | components/antecipacao-client.tsx |
| `border-amber-900/50` | `warning` | alerta, pendencia | components/edit-venda-form-client.tsx |
| `from-amber-50` | `warning-bg` | fundo sutil de alerta/pendencia | components/bfx-intelligence-panel.tsx |
| `from-amber-950/30` | `warning-bg` | fundo sutil de alerta/pendencia | components/bfx-intelligence-panel.tsx |
| `text-amber-300` | `warning` | alerta, pendencia | components/antecipacao-client.tsx |
| `text-amber-400` | `warning` | alerta, pendencia | app/(app)/crm/campanhas/page.tsx, components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx, components/edit-venda-form-client.tsx |
| `text-amber-400/80` | `warning` | alerta, pendencia | components/antecipacao-client.tsx |
| `text-amber-500` | `warning` | alerta, pendencia | app/assinatura/[token]/page.tsx, components/antecipacao-client.tsx |
| `text-amber-600` | `warning` | alerta, pendencia | app/(app)/crm/campanhas/page.tsx, components/bfx-intelligence-panel.tsx, components/produto-form-client.tsx |
| `text-amber-700` | `warning` | alerta, pendencia | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx, components/copiar-link-assinatura.tsx, components/edit-venda-form-client.tsx, components/importacao-client.tsx |
| `to-orange-50` | `warning-bg` | fundo sutil de alerta/pendencia | components/bfx-intelligence-panel.tsx |
| `to-orange-950/30` | `warning-bg` | fundo sutil de alerta/pendencia | components/bfx-intelligence-panel.tsx |

### blue / sky / cyan (informacao)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-blue-100` | `info-bg` | fundo sutil de informacao/destaque neutro | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `bg-blue-100/70` | `info-bg` | fundo sutil de informacao/destaque neutro | components/antecipacao-client.tsx |
| `bg-blue-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/antecipacao-client.tsx |
| `bg-blue-50/10` | `info-bg` | fundo sutil de informacao/destaque neutro | components/importacao-client.tsx, components/importacao-clientes-client.tsx, components/importacao-fornecedores-client.tsx |
| `bg-blue-600` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx |
| `bg-blue-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/antecipacao-client.tsx |
| `bg-blue-950/40` | `info-bg` | fundo sutil de informacao/destaque neutro | components/antecipacao-client.tsx |
| `border-blue-200` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx, components/catalogo-publico-client.tsx, components/importacao-client.tsx, components/importacao-clientes-client.tsx, components/importacao-fornecedores-client.tsx |
| `border-blue-800` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/catalogo-publico-client.tsx |
| `border-blue-800/60` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx |
| `ring-blue-500` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/importacao-client.tsx |
| `text-blue-300` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx |
| `text-blue-400` | `info` | informacao, destaque neutro, conteudo gerado pela IA | app/catalogo/page.tsx, components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `text-blue-400/80` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx |
| `text-blue-500` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `text-blue-600` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx, components/importacao-client.tsx, components/importacao-clientes-client.tsx, components/importacao-fornecedores-client.tsx |
| `text-blue-700` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/antecipacao-client.tsx, components/bfx-intelligence-panel.tsx |
| `text-blue-900` | `info` | informacao, destaque neutro, conteudo gerado pela IA | app/catalogo/page.tsx |
| `via-blue-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `via-blue-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `to-cyan-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `to-cyan-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |

### indigo (informacao / IA)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-indigo-100` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `bg-indigo-900/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `border-indigo-100` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-indigo-200/50` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-indigo-300` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-indigo-700` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-indigo-800/50` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-indigo-900/30` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `from-indigo-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `from-indigo-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `text-indigo-300` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-indigo-400` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-indigo-500` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-indigo-600` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-indigo-700` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `to-indigo-50/50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `to-indigo-500` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `to-indigo-600` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `to-indigo-950/20` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `via-indigo-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `via-indigo-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |

### violet (informacao / IA / gradiente)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `to-violet-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `to-violet-600` | `gradient-cta-from`/`gradient-cta-to` | gradiente decorativo, sem token existente que carregue o significado — gradiente do botao "gradient" (button-variants.ts), par de tokens novo | components/ui/button-variants.ts |
| `to-violet-700` | `gradient-cta-from`/`gradient-cta-to` | gradiente decorativo, sem token existente que carregue o significado — gradiente do botao "gradient" (button-variants.ts), par de tokens novo | components/ui/button-variants.ts |
| `to-violet-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |

### purple (informacao / IA no painel de inteligência, e status "parcial" em antecipação)

Purple aparece em **dois contextos com significados distintos** — a classificação segue o
significado no ponto de uso (não a família inteira de uma vez):

- Em `bfx-intelligence-panel.tsx`: marca "resposta da IA / destaque de recurso" (seções de
  insights, upgrade, oportunidades). Junto com indigo, violet e cyan no mesmo arquivo, tudo isso
  é conteúdo informacional gerado ou realçado pela IA — destino único: `info` / `info-bg`.
- Em `antecipacao-client.tsx`: marca o status `"parcialmente_antecipado"`, o quarto estado do
  fluxo de antecipação (ao lado de `antecipado`→verde/sucesso, `em_andamento`→azul/info,
  `pendente`→âmbar/warning). Nenhum dos quatro tokens existentes carrega esse significado sem
  colidir visualmente com outro estado — ver "Tokens que faltam".

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-purple-100` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `bg-purple-100/70` | `status-partial` | quarto estado do fluxo de antecipacao ("parcialmente_antecipado"), sem token existente | components/antecipacao-client.tsx |
| `bg-purple-200` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `bg-purple-50` | `status-partial` | quarto estado do fluxo de antecipacao ("parcialmente_antecipado"), sem token existente | components/antecipacao-client.tsx |
| `bg-purple-600` | `status-partial` | quarto estado do fluxo de antecipacao ("parcialmente_antecipado"), sem token existente | components/antecipacao-client.tsx |
| `bg-purple-800` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `bg-purple-900/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `bg-purple-950/30` | `status-partial` | quarto estado do fluxo de antecipacao ("parcialmente_antecipado"), sem token existente | components/antecipacao-client.tsx |
| `border-purple-100` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-200` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-200/50` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-300` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-700` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-800` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-800/50` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `border-purple-900/30` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `from-purple-50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `from-purple-50/50` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `from-purple-500` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `from-purple-600` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `from-purple-950/20` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `from-purple-950/30` | `info-bg` | fundo sutil de informacao/destaque neutro | components/bfx-intelligence-panel.tsx |
| `text-purple-300` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-purple-400` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-purple-500` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-purple-600` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |
| `text-purple-700` | `info` | informacao, destaque neutro, conteudo gerado pela IA | components/bfx-intelligence-panel.tsx |

### rose (gradiente decorativo)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `from-rose-500` | `gradient-cta-from`/`gradient-cta-to` | gradiente decorativo, sem token existente que carregue o significado — gradiente do botao "gradient" (button-variants.ts), par de tokens novo | components/ui/button-variants.ts |
| `from-rose-600` | `gradient-cta-from`/`gradient-cta-to` | gradiente decorativo, sem token existente que carregue o significado — gradiente do botao "gradient" (button-variants.ts), par de tokens novo | components/ui/button-variants.ts |
| `to-rose-500` | `gradient-cta-to` | gradiente decorativo do icone da sidebar (layout.tsx) — reaproveita o par de tokens do botao gradient | app/(app)/layout.tsx |
| `via-rose-600` | `gradient-cta-from`/`gradient-cta-to` | gradiente decorativo, sem token existente que carregue o significado — gradiente do botao "gradient" (button-variants.ts), par de tokens novo | components/ui/button-variants.ts |
| `via-rose-700` | `gradient-cta-from`/`gradient-cta-to` | gradiente decorativo, sem token existente que carregue o significado — gradiente do botao "gradient" (button-variants.ts), par de tokens novo | components/ui/button-variants.ts |

### gray / slate / zinc / neutral / stone (estrutura)

| Classe crua | Token | Significado | Onde aparece |
|---|---|---|---|
| `bg-gray-100` | `muted` | superficie neutra de estrutura (fundo secundario) | app/assinatura/[token]/page.tsx |
| `bg-gray-200` | `muted` | superficie neutra de estrutura (fundo secundario) | app/assinatura/[token]/page.tsx |
| `bg-gray-400` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | components/whatsapp-connect.tsx |
| `bg-gray-50` | `muted` | superficie neutra de estrutura (fundo secundario) | components/receipt-editor-client.tsx |
| `border-gray-100` | `border` | borda de estrutura | components/receipt-preview.tsx |
| `border-gray-300` | `border` | borda de estrutura | app/assinatura/[token]/page.tsx |
| `border-gray-400` | `border` | borda de estrutura | components/receipt-preview.tsx |
| `border-gray-50` | `border` | borda de estrutura | components/receipt-preview.tsx |
| `border-gray-700` | `border` | borda de estrutura | app/assinatura/[token]/page.tsx |
| `text-gray-400` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | components/receipt-preview.tsx |
| `text-gray-500` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | app/assinatura/[token]/page.tsx |
| `text-gray-600` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | components/receipt-preview.tsx |
| `text-gray-800` | `foreground` | texto principal sobre fundo | components/receipt-preview.tsx |
| `text-gray-900` | `foreground` | texto principal sobre fundo | components/receipt-preview.tsx |
| `bg-slate-100` | `muted` | superficie neutra de estrutura (fundo secundario) | components/catalogo-publico-client.tsx |
| `bg-slate-800` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | components/catalogo-publico-client.tsx |
| `bg-slate-900` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | components/catalogo-publico-client.tsx |
| `bg-slate-950/90` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | app/catalogo/page.tsx |
| `border-slate-100` | `border` | borda de estrutura | components/catalogo-publico-client.tsx |
| `border-slate-200` | `border` | borda de estrutura | app/catalogo/page.tsx, components/catalogo-publico-client.tsx |
| `border-slate-200/80` | `border` | borda de estrutura | app/catalogo/page.tsx |
| `border-slate-700` | `border` | borda de estrutura | components/catalogo-publico-client.tsx |
| `border-slate-800` | `border` | borda de estrutura | app/catalogo/page.tsx, components/catalogo-publico-client.tsx |
| `from-slate-100` | `muted` | superficie neutra de estrutura (fundo secundario) | app/(auth)/loading.tsx, app/(auth)/login/page.tsx |
| `from-slate-50` | `muted` | superficie neutra de estrutura (fundo secundario) | app/catalogo/page.tsx |
| `from-slate-950` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | app/(auth)/login/page.tsx, app/catalogo/page.tsx |
| `text-slate-100` | `foreground` | texto principal sobre fundo | app/catalogo/page.tsx, components/cadastrar-produto-rapido-dialog.tsx, components/catalogo-publico-client.tsx |
| `text-slate-300` | `foreground` | texto principal sobre fundo | components/catalogo-publico-client.tsx |
| `text-slate-400` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | app/catalogo/page.tsx, components/catalogo-publico-client.tsx |
| `text-slate-500` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | app/catalogo/page.tsx, components/catalogo-publico-client.tsx |
| `text-slate-600` | `muted-foreground` | texto secundario / indicador neutro de baixo destaque | components/catalogo-publico-client.tsx |
| `text-slate-800` | `foreground` | texto principal sobre fundo | app/catalogo/page.tsx, components/catalogo-publico-client.tsx |
| `text-slate-900` | `foreground` | texto principal sobre fundo | components/cadastrar-produto-rapido-dialog.tsx, components/produto-form-client.tsx |
| `to-slate-100` | `muted` | superficie neutra de estrutura (fundo secundario) | app/catalogo/page.tsx |
| `to-slate-900` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | app/catalogo/page.tsx |
| `to-slate-950` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | app/(auth)/login/page.tsx |
| `via-slate-50` | `muted` | superficie neutra de estrutura (fundo secundario) | app/(auth)/loading.tsx, app/(auth)/login/page.tsx |
| `via-slate-900` | `background` | fundo de pagina/secao (inclui secoes escuras decorativas — ver nota abaixo) | app/(auth)/login/page.tsx |

**Nota sobre os gradientes `slate-950`/`slate-900` em `catalogo/page.tsx` e `login/page.tsx`:**
hoje esses tons só aparecem atrás de `dark:` porque a cor crua precisa de dois valores manuais
(um por tema). Migrados para `from-background to-muted`, o próprio token já resolve o valor certo
em cada tema — os `dark:` somem, porque não são mais necessários. É o ganho concreto de trocar
cor por token: a duplicação de estilo por tema deixa de existir no JSX.

## 3. Tokens que faltam

Seção consumida diretamente pelo plano 04 (D-06) — é a lista de trabalho dele. Confirmado ao ler
`src/app/globals.css`: os quatro tokens de fundo semântico e `--card-elevated` existem **somente**
no bloco `.dark`. Não existem em `:root`, não estão em `@theme inline` e não estão em
`tailwind.config.ts`. Ou seja, **a classe `bg-success-bg` não existe hoje** — a tabela acima
pressupõe um token que ainda precisa ser criado no tema claro e exposto ao Tailwind.

| Token | Hoje | O que falta |
|---|---|---|
| `--success-bg` | só em `.dark` | criar em `:root`, adicionar a `@theme inline` como `--color-success-bg` |
| `--warning-bg` | só em `.dark` | criar em `:root`, adicionar a `@theme inline` como `--color-warning-bg` |
| `--error-bg` | só em `.dark` | criar em `:root`, adicionar a `@theme inline` como `--color-error-bg` |
| `--info-bg` | só em `.dark` | criar em `:root`, adicionar a `@theme inline` como `--color-info-bg` |
| `--card-elevated` | só em `.dark` | criar em `:root`, adicionar a `@theme inline` como `--color-card-elevated` |
| `--primary-hover` | existe em `:root`/`.dark`/`tailwind.config.ts` | ausente de `@theme inline` — sem isso `hover:bg-primary-hover` não resolve no Tailwind v4 |
| `--accent-hover` | existe em `:root`/`.dark`/`tailwind.config.ts` | ausente de `@theme inline` — mesmo problema de `--primary-hover` |
| `--status-partial` + `--status-partial-foreground` | não existe | novo token (D-06): cobre o 4o estado de `antecipacao-client.tsx` ("parcialmente_antecipado"), que não colide com sucesso/aviso/erro/info. Valor sugerido: tom roxo já usado no código (`purple-600`/`purple-950`), formalizado como token — não é paleta nova, é o mesmo tom que já está em produção virando token nomeado |
| `--gradient-cta-from` + `--gradient-cta-to` | não existe | novo par de tokens (D-06): cobre o gradiente decorativo do variant `"gradient"` em `button-variants.ts` (rosa → violeta) e o gradiente do ícone da sidebar em `layout.tsx` (que reaproveita o mesmo par). Não é status nem superfície — é puramente decorativo, por isso token à parte |

Além disso, o verificador de contraste (Task 2 deste plano) confirma que `--ring` no tema claro
(`oklch(0.708 0 0)` sobre `oklch(0.985 0 0)`) fica abaixo do mínimo de 3:1 para indicador de foco
(UI-06) — listado ali com o número exato, mas registrado aqui porque é outra correção que o
plano 04 herda desta fase.

## 4. Cor nunca sozinha (D-03)

Onde a cor indica estado (positivo/negativo, sucesso/erro, pendente/concluído), tem que haver
ícone ou texto junto — cor sozinha não é um canal de informação acessível (contraste de cor não
resolve daltonismo). Padrão a copiar nas telas financeiras da Fase 12:

```tsx
// Errado: só a cor diz o que é
<span className="text-success">+ R$ 1.234,56</span>

// Certo: ícone + rótulo, cor é reforço, não único canal
<span className="flex items-center gap-1 text-success">
  <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
  <span>+ R$ 1.234,56</span>
</span>
```

O mesmo vale para os `StatusBadge` de `antecipacao-client.tsx`: o texto (`"Antecipado"`,
`"Parcial"`, `"Em andamento"`, `"Pendente"`) já cumpre o D-03 porque acompanha a cor — não
remover o texto do badge ao migrar para token.

## 5. Exceção declarada

`src/app/api/relatorios/catalogo/route.ts` devolve um documento HTML autônomo que carrega
Tailwind por CDN — as classes cruas dele não têm token correspondente porque o CSS do app não é
carregado nesse contexto. É a **única exceção** do projeto, já registrada em
`design-system/raw-color-baseline.json` (campo `exceptions`) e desligada tanto no scanner
(`raw-color-scan.mjs`) quanto na regra de lint do plano 02.

## 6. Como usar nas fases 11-14 (D-05)

Migrar tela por tela, não tudo de uma vez:

1. Escolher um arquivo do baseline (`design-system/raw-color-baseline.json`).
2. Para cada classe crua do arquivo, consultar a tabela da seção 2 e trocar pela classe do token
   (ex.: `bg-green-50` → `bg-success-bg`).
3. Rodar `node scripts/design-tokens/raw-color-scan.mjs src --check` e confirmar que o arquivo
   zerou (ou regrediu para um número menor, se a migração for parcial).
4. Regravar o baseline: `node scripts/design-tokens/raw-color-scan.mjs src --baseline`.
5. Conferir a tela nos dois temas (claro e escuro) — a troca de token deve eliminar a maioria dos
   modificadores `dark:` que hoje compensam a cor crua manualmente.

Este arquivo mora em `design-system/`, fora de `src/` — as classes cruas citadas aqui (nas
tabelas, como referência) não entram na contagem do scanner nem disparam a regra de lint.

