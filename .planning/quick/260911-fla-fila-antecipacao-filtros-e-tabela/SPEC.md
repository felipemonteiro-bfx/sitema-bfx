# SPEC — Fila "Vendas — Antecipação": período por meses, dropdowns, tabela e popover

Data: 2026-09-11 · Tela: `/prudent`, card "Vendas — Antecipação" (`src/components/antecipacao-client.tsx`)

## Pedido

> "Corrija esse componente usando componentes do shadcn/ui para melhor uso, por exemplo de datas e
> tabela, que quero tenha um limite também de 80dvh, e melhore o dropdown deles." — e: "abrir o
> popover no hover; se eu clicar ele continua aberto, mas se não clicar ele fecha quando eu sair."

Decisões do André (perguntadas): **seletor de intervalo de meses** num só popover; adaptar para
**computador e celular**.

## Atual

- Período: dois `<Input>` de texto livre ("Vencimento de/até", MM/AAAA). Digitar é lento, o erro
  só aparece como "Período inválido" e não há como ver o que cada mês tem a antecipar.
- Empresa/Status: `FormSelect` (lista própria dentro de um Popover do shadcn) só com o rótulo; sem
  contagem, sem a cor do selo do status, sem navegação por setas.
- Tabela da fila sem limite de altura: com 145 vendas a página inteira rola e o cabeçalho some.
- Popover de produtos abre só no clique.
- Celular: filtros em linha que quebra de forma irregular; tabela de 8 colunas rola na horizontal.

## Esperado

1. **Seletor de intervalo de meses** (`src/components/intervalo-meses-picker.tsx`, Popover + Button
   do shadcn): um gatilho "Vencimento: out/2026 – dez/2026"; grade dos 12 meses com navegação de
   ano; primeiro clique marca o início, segundo marca o fim (se vier antes, inverte); o intervalo
   aparece destacado; cada mês mostra quanto falta antecipar nele (dados de `resumoMeses`);
   atalhos "Este mês", "Próximos 3 meses" e "Limpar". O estado continua sendo `MM/AAAA` em
   `periodoInicio`/`periodoFim`, então action, relatórios e `parsePeriodoMesAno` não mudam.
2. **Dropdowns**: `FormSelect` ganha, de forma compatível com os outros usos, `hint` (texto à
   direita: contagem) e `indicador` (bolinha de cor) por opção, e navegação por teclado (setas,
   Enter, Esc; foco na busca ao abrir). Empresa mostra quantas vendas cada uma tem; Status mostra a
   cor do selo e a contagem.
3. **Tabela da fila**: altura máxima de 80dvh, rolagem interna, cabeçalho fixo (mesma receita das
   tabelas do resumo).
4. **Popover de produtos**: abre no hover; clique fixa aberto; sem clique, fecha ao sair do gatilho
   e do conteúdo (com um pequeno atraso para dar tempo de cruzar o espaço entre os dois); clique
   fora, Esc ou novo clique no gatilho fecha. Toque (sem hover) abre e fixa. Clique no gatilho nunca
   seleciona a venda.
5. **Celular**: filtros em grade (1 coluna no celular, fluxo em linha a partir de `sm`); seletor de
   meses em largura total; colunas Empresa e Produto somem abaixo de `md` e aparecem sob o nome do
   cliente; alvos de toque de 44px nos gatilhos.

## Lógica pura e testada

- `src/lib/periodo-meses.ts`: `proximoIntervalo`, `intervaloEsteMes`, `intervaloProximosMeses`,
  `rotuloIntervalo`, `chaveDoMes` (MM/AAAA ↔ YYYY-MM), `valorCompacto` (R$ 3,9 mil).
- `src/lib/popover-hover.ts`: `transicaoPopoverHover(estado, evento)` — estados aberto/fixo.

## Fora do escopo

Regras de antecipação, action `antecipar`, relatórios. O `FormSelect` não muda de visual nem de
API para quem não passa as novas props.
