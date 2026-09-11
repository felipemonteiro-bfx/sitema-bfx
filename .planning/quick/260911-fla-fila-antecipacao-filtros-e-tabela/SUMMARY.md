# SUMMARY — Fila "Vendas — Antecipação": período por meses, dropdowns, tabela e popover

Data: 2026-09-11 · Spec: `SPEC.md` (nesta pasta) · Pedido via `/impeccable adapt`

## Entregue

- **Período por meses** — `src/components/intervalo-meses-picker.tsx` (Popover + Button do
  shadcn) no lugar dos dois campos MM/AAAA: grade dos 12 meses com troca de ano, primeiro clique
  marca o início e o segundo o fim (inverte se vier antes), faixa destacada, quanto falta antecipar
  em cada mês (vindo de `resumoMeses`), atalhos "Este mês", "Próximos 3 meses" e "Limpar", mês de
  hoje contornado. O estado continua em MM/AAAA: action, relatórios e `parsePeriodoMesAno` não
  mudaram. Lógica em `src/lib/periodo-meses.ts`.
- **Dropdowns** — `FormSelect` (compartilhado) ganhou, sem mudar quem não usa, `hint` e
  `indicador` por opção, setas/Home/End/Enter, foco na busca (ou na lista) ao abrir e papéis
  listbox/option com `aria-activedescendant`. Na fila: Empresa com a contagem de vendas; Status com
  a cor do selo e a contagem.
- **Tabela da fila** — altura máxima de 80dvh, rolagem interna e cabeçalho fixo.
- **Popover de produtos** — `src/components/produtos-venda-popover.tsx`: abre no hover (atraso de
  150 ms para não piscar ao varrer a tabela), clique fixa, sem clique fecha ao sair (180 ms para
  cruzar o vão), clique fora/Esc fecha, toque abre e já fixa; nunca seleciona a venda. Transições em
  `src/lib/popover-hover.ts`.
- **Celular** — filtros em uma coluna com alvos de 44px (em linha a partir de `sm`); Empresa e
  Produto saem das colunas abaixo de `md` e aparecem sob o nome do cliente, com o popover.
- **Detector da skill** — tirada a borda colorida de 4px na linha selecionada da fila e na linha
  "Na fila" do resumo; o estado já está no fundo e no controle.

## Verificação

- TDD: `periodo-meses.test.ts` e `popover-hover.test.ts` — 29 falhas no RED, 32/32 no GREEN.
- Suíte inteira do vitest em Docker: 1.137 testes passando (as duas suítes da Uber não carregam
  no container por falta de env vars; passam no CI).
- `tsc` sem erro nos 7 arquivos tocados; `cores:check`, `jsx:check` e detector do impeccable OK.
