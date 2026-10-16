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

> **Emenda da fase 16 — o destino depende do papel, não só do tom.** A coluna "Token" abaixo
> nomeia a *família*; qual variante usar depende de onde a cor entra:
>
> | Papel | Variante | Por quê |
> |---|---|---|
> | fundo (`bg-*`), borda (`border-*`), preenchimento de ícone sólido | `success` / `warning` / `info` | é para isso que o L desses tokens foi calibrado, com `--*-foreground` escuro por cima |
> | **texto e ícone colorido sobre superfície clara** | **`success-text` / `warning-text` / `info-text`** | os tokens base reprovam como texto no tema claro (2.97:1, 2.06:1 e 4.13:1 — mínimo 4.5) |
> | fundo sutil / tint | `success-bg` / `warning-bg` / `info-bg` | opaco no claro; **preferir ao composto** `bg-info/20`, que escurece o próprio tom e derruba o texto para 4.02:1 |
>
> Ou seja: `text-green-600` migra para `text-success-text`, não para `text-success`.
> `--error`/`--destructive` não têm variante `-text` — já passam como texto (4.82:1 no claro,
> 5.67:1 no escuro), porque o L deles foi baixado de 0.60 para 0.57 numa correção anterior.

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

## 4.1 Sidebar: a família que acompanha o tema (fase 19)

Até a fase 18 a família `--sidebar-*` era escura nos **dois** temas por decisão explícita. O preço
não aparecia na sidebar em si — aparecia no que ela **hospeda mas não desenha**: o `ThemeToggle`
(`Button variant="outline"`, que resolve `--border`/`--background`/`--foreground` **globais**) e o
`LogoutButton` (`--destructive` global). No tema claro esses tokens são claros e caíam sobre um
painel escuro. Não era falha de renderização: era um painel escuro cercado de tokens claros.

A lição para quem for criar a próxima superfície fixa: **uma superfície que não acompanha o tema
só funciona se tudo dentro dela também não acompanhar** — e isso é impossível de garantir, porque
qualquer componente compartilhado que entrar ali depois traz os tokens globais junto.

Mesma separação de papéis das famílias semânticas (preenchimento ≠ texto):

| Token | Papel | Claro | Escuro |
|---|---|---|---|
| `--sidebar` | fundo do painel | `oklch(0.965 0.006 260)` | `oklch(0.17 0.02 260)` |
| `--sidebar-foreground` | texto principal | escuro | quase-branco |
| `--sidebar-muted` | rótulo de item inativo e de grupo | `oklch(0.47 0.015 260)` | `oklch(0.65 0 0)` |
| `--sidebar-accent` / `-accent-foreground` | fundo e texto do item ativo/hover | claro / escuro | escuro / claro |
| `--sidebar-primary` | **texto e grafismo** da marca (ícone ativo, badge NOVO, barra do item ativo) | `oklch(0.50 0.22 25)` | `oklch(0.68 0.22 25)` |
| `--sidebar-primary-foreground` | texto **sobre** o preenchimento da marca (badge de contagem) | quase-branco | **escuro** — inverte |
| `--sidebar-primary-bg` | **tint opaco** da marca (chip do ícone, fundo do badge NOVO) | `oklch(0.94 0.045 25)` | `oklch(0.28 0.06 25)` |
| `--gradient-cta-foreground` | ícone **sobre** o gradiente decorativo da marca (logo) | `oklch(0.995 0 0)` — igual nos dois temas | idem |

Três armadilhas que essa fase pagou e que valem para qualquer superfície nova:

- **`text-white` cru sobre preenchimento que muda de tema.** Dava 3.41:1 no claro e 3.15:1 no
  escuro no badge de contagem. Preenchimento pede o par `-foreground`, e esse par pode precisar
  **inverter** entre os temas (é o caso aqui, igual a `--destructive-foreground`).
- **Tint composto (`bg-[var(--x)]/20`) não é mensurável.** A catraca lê variáveis, não call sites:
  o composto passava despercebido. Virou `--sidebar-primary-bg`, opaco e policiado.
- **Opacidade em texto (`text-[var(--x)]/80`).** O rótulo de grupo media 4.17:1 no escuro — a
  catraca aprovava o token e a tela reprovava o pixel. Em 10px é onde menos dá para ceder.

O `.sidebar-dark` (que fixava `color-scheme: dark` no painel) foi removido: com a sidebar clara ele
pintaria a barra de rolagem e os controles nativos de escuro dentro de uma superfície clara.

## 4.2 Redesign Vantage: superfícies, marca e gráfico (2026-10-16)

Contrato de tokens da tarefa A (spec `docs/superpowers/specs/2026-10-16-redesign-vantage-design.md`,
seção 3). Cada token de cor tem **três pontos** — valor em `:root`, valor em `.dark`, chave
`--color-*` no `@theme inline` — e o quarto, o par em `TOKEN_PAIRS`. Valores e razões de contraste
medidos por `npm run contraste:check`.

### Degraus de superfície (decidido pelo significado)

| Superfície | Token (utilitária) | Claro | Escuro |
|---|---|---|---|
| Página (fora da casca) | `--background` (`bg-background`) | #EDEDED (croma 0) | #070807 |
| Casca (`main`) | `--shell` (`bg-shell`) | #F7F8F7 | #0B0C0B |
| Painel / Card | `--card`, `--sidebar` (`bg-card`) | #FFFFFF | #111312 |
| Card interno | `--card-elevated` | #F7F8F7 | #161917 |
| Poço (área rebaixada) | `--poco` (`bg-poco`) | #F3F5F3 | #0F1110 |
| Controle (trilho, busca) | `--controle` | #EAEDEA | #131514 |
| Controle selecionado | `--controle-ativo` | #FFFFFF | #262A27 |
| Popover | `--popover` | #FFFFFF | #1A1D1B |

`--shell` e `--card` são tokens **diferentes** nos dois temas: a casca e o painel não se confundem
mais (antes `main` e `Card` eram ambos `bg-card`).

No claro `--background`, `--card` e `--popover` têm **croma 0** (`tokens-fundo-neutro`, D-01): o
verde de croma 0.003 dos artboards cede ao croma 0 (imperceptível). No escuro os neutros são
esverdeados de croma 0.003-0.009. `--muted` (#F1F3F1 / #1E211F), `--secondary` e a família
`--sidebar-*` foram recalibrados para o mesmo eixo (sem matiz 250/260).

### Texto

| Token | Claro | Escuro | Contraste (claro / escuro) |
|---|---|---|---|
| `--foreground` | #141614 | #EDEFEE | 15.6–18.2 / 12.6–17.4 |
| `--texto-secundario` (`text-texto-secundario`) | #3B413D | #C9CECB | 10.45 / 11.70 no painel |
| `--muted-foreground` | #5C635E | #9BA19D | 6.17 / 7.09 no painel; ≥5.23 / ≥5.53 em shell, poço, controle |
| `--marca-tint-texto` | #0C6E0B | #6FCA69 | 5.60 / 7.02 sobre `--marca-tint` |

**Regra do verde como texto:** `--primary` claro (#0F7F0E) dá 5.14:1 no painel e 4.69:1 no poço,
mas só **4.43:1 na página** e **4.45:1 sobre `--marca-tint`**. Portanto, no tema claro,
**`text-primary` não vai sobre a página nem sobre o tint** (por isso não há par
`primary/background`). Texto verde sobre página/tint é `text-marca-tint-texto`. O mesmo vale
para `--muted-foreground`, que foi recalibrado de 0.535 (4.44:1 na página nova) para 0.492.

### Marca, borda e foco

| Token | Claro | Escuro |
|---|---|---|
| `--primary` (inalterado) | #0F7F0E | #6FCA69 |
| `--marca-tint` (`bg-marca-tint`) | #E3F3E2 | #16301A |
| `--ring` e `--sidebar-ring` (verde da marca) | = primary | = primary |
| `--border`, `--input` (≥3:1 contra fundo, card e sidebar) | oklch(0.62 0 0) | oklch(0.52 0.008 155) |
| `--shell-borda`, `--painel-borda`, `--divisoria` (decorativas, **fora** dos pares de 3:1) | #E1E4E1 / #E6E9E6 / #E6E9E6 | #1A1D1B / #1F2220 / #1F2220 |

Campos mantêm a borda de `--border`/`--input` (decisão aprovada); linhas decorativas usam as três
de cima, que medem ~1.2:1 de propósito.

### Gráfico e vidro

| Token | Claro | Escuro | Nota |
|---|---|---|---|
| `--hachura-traco` | #80867F | #5E645F | 3.40 / 3.13:1 no poço (artboards davam 2.83 / 2.91 — ajustado) |
| `--hachura-fundo` | #F3F5F3 | #1E211F | |
| `--grafico-neutro` | #7A807B | #6E746F | 3.68 / 3.96:1 no poço (artboard claro #C5CAC6 dava 1.5) |
| `--grafico-trilha`, `--grafico-inativo` | #D3D7D3, #C5CAC6 | #2A2D2B, #3A3E3B | decorativos |
| `--vidro`, `--vidro-borda` | branco 92%, #E1E4E1 | #1C1F1D 92%, #2F3330 | alfa ⇒ a catraca marca SKIP |
| `--vidro-piso` | #FFFFFF | #1C1F1D | versão **opaca** do vidro: é o fallback sem `backdrop-filter` (`@supports not`) e o que `TOKEN_PAIRS` mede (18.19 / 14.39:1 com `--foreground`) |

### Raios, fontes, tamanhos e movimento (não variam com o tema)

`--radius-shell` 24px, `--radius-painel` 20px, `--radius-interno` 14px, `--radius-controle` 12px
(`rounded-shell`…). `--font-mono` = Geist Mono (`font-mono`; `.tabular-nums` o usa),
`--font-sans` = Manrope, `--font-display` = Space Grotesk. `--text-titulo` e `--text-kpi` são os
**únicos** tamanhos fluidos (clamp) — `escala:check` continua barrando `text-[13px]`. Movimento:
`--mov-*` + `.anim-entrada` / `.anim-barra` / `.anim-dica` (atraso por `--i`); constantes em
`src/lib/motion.ts`, comparadas com o CSS por `redesign-tokens.test.ts`. Só transform, opacity e
filter; `prefers-reduced-motion` zera as três classes.

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

