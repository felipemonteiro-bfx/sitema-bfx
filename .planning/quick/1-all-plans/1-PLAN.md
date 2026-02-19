---
phase: 1-all-plans
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/venda-rapida-form-v2.tsx
  - src/app/(app)/venda-rapida/page.tsx
autonomous: true
requirements:
  - PDV-01
  - PDV-02
  - PDV-03
  - PDV-04

must_haves:
  truths:
    - "Vendedor pode adicionar mais de um produto na mesma venda sem navegar para outra tela"
    - "Cada item na lista exibe nome do produto, quantidade e preco unitario editaveis"
    - "Vendedor pode remover um item da lista sem perder os demais itens ja adicionados"
    - "O total da venda atualiza automaticamente ao adicionar, remover ou alterar quantidade de qualquer item"
    - "Apos finalizar a venda com sucesso aparece um toast de sucesso (nao um alert)"
    - "Erros de submissao aparecem como toast de erro (nao um alert)"
  artifacts:
    - path: "src/components/venda-rapida-form-v2.tsx"
      provides: "Formulario PDV multi-produto com feedback via Sonner"
      contains: "toast.success"
    - path: "src/app/(app)/venda-rapida/page.tsx"
      provides: "Pagina do PDV usando VendaRapidaFormV2"
      contains: "VendaRapidaFormV2"
  key_links:
    - from: "src/app/(app)/venda-rapida/page.tsx"
      to: "src/components/venda-rapida-form-v2.tsx"
      via: "import e render de VendaRapidaFormV2"
      pattern: "VendaRapidaFormV2"
    - from: "src/components/venda-rapida-form-v2.tsx"
      to: "criarVendaV2"
      via: "onSubmit prop recebendo ActionResponse"
      pattern: "ActionResponse"
---

<objective>
Ativar o formulario PDV multi-produto (VendaRapidaFormV2) que ja existe mas nao esta sendo usado, substituindo o formulario legado (VendaRapidaFormClient) na pagina de venda rapida. Corrigir a incompatibilidade de tipos no onSubmit e substituir os alert() por toasts do Sonner.

Purpose: A infraestrutura de multi-produto ja esta completa (VendaRapidaFormV2, ProdutoItemForm, criarVendaV2, modelos Prisma ItemVenda e ParcelaVencimento). So falta ligar as pecas — a pagina ainda usa o formulario antigo.
Output: Pagina /venda-rapida renderizando VendaRapidaFormV2 com suporte completo a multiplos produtos e feedback visual via toasts.
</objective>

<execution_context>
@C:/Users/softlive/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/softlive/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Corrigir VendaRapidaFormV2 — tipos e feedback</name>
  <files>src/components/venda-rapida-form-v2.tsx</files>
  <action>
Fazer tres mudancas cirurgicas no arquivo existente:

1. **Corrigir tipo do onSubmit na interface Props** (linha ~37):
   Trocar `onSubmit: (formData: FormData) => Promise<void>`
   por `onSubmit: (formData: FormData) => Promise<ActionResponse<{ vendaId: number }>>`
   Adicionar import: `import type { ActionResponse } from "@/lib/action-response"`

2. **Substituir alert() de sucesso por toast** (dentro de handleSubmit, bloco de sucesso):
   Remover: `alert("Venda realizada com sucesso!")`
   Adicionar import do hook: `import { toast } from "sonner"`
   Usar: `toast.success(result.message || "Venda realizada com sucesso!")`
   Tambem fazer o reset do form usar o retorno da ActionResponse:
   ```typescript
   const result = await onSubmit(formData);
   if (result.success) {
     // reset form fields (mesmo reset atual)
     toast.success(result.message || "Venda realizada com sucesso!");
   } else {
     toast.error(result.error || "Erro ao finalizar venda.");
   }
   ```

3. **Substituir alert() de erro por toast** (bloco catch):
   Remover: `alert("Erro ao finalizar venda.")`
   Usar: `toast.error("Erro ao finalizar venda. Tente novamente.")`

4. **Substituir alert() de validacao por toast** (validacoes antes do submit):
   `alert("Por favor, selecione um cliente.")` → `toast.warning("Selecione um cliente para continuar.")`
   `alert("Por favor, preencha todos os produtos.")` → `toast.warning("Preencha o nome de todos os produtos.")`

Nao alterar nada mais — layout, calculos, componentes filhos, logica de parcelas, etc. permanecem identicos.
  </action>
  <verify>
    Verificar manualmente que o arquivo compila sem erros de TypeScript:
    `npx tsc --noEmit 2>&1 | grep venda-rapida-form-v2`
    (sem saida = sem erros)
  </verify>
  <done>
    - Props.onSubmit aceita retorno de ActionResponse
    - Nenhum alert() restante no arquivo
    - toast.success, toast.error e toast.warning importados e usados
    - tsc --noEmit sem erros no arquivo
  </done>
</task>

<task type="auto">
  <name>Task 2: Atualizar pagina para usar VendaRapidaFormV2</name>
  <files>src/app/(app)/venda-rapida/page.tsx</files>
  <action>
Na pagina atual (`src/app/(app)/venda-rapida/page.tsx`):

1. **Trocar o import do componente de formulario**:
   Remover: `import VendaRapidaFormClient from "@/components/venda-rapida-form-client"`
   Adicionar: `import VendaRapidaFormV2 from "@/components/venda-rapida-form-v2"`

2. **Trocar o uso do componente no JSX** (por volta da linha 67):
   Trocar `<VendaRapidaFormClient` por `<VendaRapidaFormV2`
   Manter exatamente as mesmas props: `vendedorOptions`, `parcelasOptions`, `onSubmit={criarVendaV2}`

Nao alterar mais nada — header da pagina, logica da ultima venda, card vazio, etc. permanecem identicos.

Verificacao de compatibilidade de props:
- `vendedorOptions: { value: string; label: string; comissaoPct: number }[]` — identico nos dois componentes
- `parcelasOptions: { value: string; label: string }[]` — identico nos dois componentes
- `onSubmit={criarVendaV2}` — criarVendaV2 retorna `Promise<ActionResponse<{ vendaId: number }>>`, que agora combina com o tipo corrigido na Task 1
  </action>
  <verify>
    1. `npx tsc --noEmit 2>&1` sem erros de tipo
    2. `npm run build 2>&1 | tail -20` — build sem erros
    3. Abrir http://localhost:3000/venda-rapida — pagina renderiza com secoes: Contexto da Venda, Cliente, Produtos da Venda (com botao "Adicionar Produto"), Despesas Adicionais, Parcelamento, Resumo Financeiro
  </verify>
  <done>
    - Pagina importa e renderiza VendaRapidaFormV2 (nao VendaRapidaFormClient)
    - Build sem erros TypeScript
    - Formulario multi-produto visivel e funcional em /venda-rapida
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Formulario PDV multi-produto ativo na pagina de venda rapida. VendaRapidaFormV2 conectado ao criarVendaV2 com feedback via toasts do Sonner.
  </what-built>
  <how-to-verify>
    1. Acesse http://localhost:3000/venda-rapida
    2. Confirme que a pagina exibe o formulario com multiplas secoes (nao o layout antigo de sidebar compacta)
    3. No campo "Produto #1": digite um produto, preencha custo e valor
    4. Clique "Adicionar Produto" — confirme que aparece "Produto #2" abaixo
    5. Altere a quantidade do Produto #1 — confirme que o Resumo Financeiro atualiza instantaneamente
    6. Clique no X do Produto #1 — confirme que remove apenas aquele item, Produto #2 permanece
    7. Selecione um cliente via autocomplete
    8. Finalize a venda — confirme que aparece um TOAST de sucesso (nao um alert/popup do browser)
    9. Em caso de erro (ex: sem cliente): confirme que aparece TOAST de aviso (nao alert)
  </how-to-verify>
  <resume-signal>Digite "aprovado" se tudo funcionar, ou descreva o problema encontrado</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` sem erros de TypeScript
- `npm run build` completa sem erros
- Pagina /venda-rapida renderiza VendaRapidaFormV2
- Multiplos produtos podem ser adicionados e removidos
- Total atualiza em tempo real
- Feedback via toasts (nao alerts)
</verification>

<success_criteria>
Todos os 4 criterios de sucesso do Phase 1 sao verificaveis em /venda-rapida:
1. Vendedor pode adicionar mais de um produto sem trocar de tela (botao "Adicionar Produto" funcional)
2. Cada item exibe produto, quantidade e preco (ProdutoItemForm renderizado por item)
3. Remover item nao afeta os demais (botao X por item funcional)
4. Total atualiza automaticamente (calculo reativo no estado do React)
</success_criteria>

<output>
Apos conclusao, criar `.planning/quick/1-all-plans/1-SUMMARY.md` com:
- O que foi alterado (quais arquivos, quais mudancas)
- Decisoes tomadas
- Estado final: Phase 1 Multi-Produto concluida
</output>