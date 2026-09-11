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

## Ajuste pedido depois do deploy — produtos em tabela

> "O que é 1x 2x? Quero que sempre mostre usando subgrid ou table pra ficarem alinhados."

O popover listava "CROPPED BÁSIC MARROM (2x) R$ 90,00": o "2x" (quantidade) parecia número de
parcelas, e nomes longos desalinhavam os valores. Passa a ser uma tabela do shadcn, compacta:
**Produto | Qtd. | Valor**, números à direita com `tabular-nums`, preço de cada unidade sob o
valor quando a quantidade passa de 1 ("R$ 45,00 cada"), nomes longos em até duas linhas e rodapé
"Total dos produtos" com a soma das quantidades e dos valores (a borda do rodapé é a linha
separadora pedida antes). Lógica em `src/lib/itens-venda.ts` (`linhasDosItens`), testada.

## Aprovado no design v4 — cálculos no servidor, parcelas e "A antecipar"

> "De forma alguma os cálculos vêm do front, tudo deve vir do backend, o front só mostra." —
> e: popover nas parcelas com a data da compra, quantas parcelas, quais foram antecipadas ou não;
> e: trocar o status "Pendente" por "A antecipar".

- **Servidor calcula, tela mostra.** `page.tsx` manda pronto, por venda: a tabela de produtos
  (`linhasDosItens`), as parcelas com situação e totais (`parcelasDaVenda`) e os meses com
  parcela em aberto (`mesesEmAberto`); e, para a fila: as contagens dos dropdowns
  (`contagensDaFila`) e o valor a antecipar por mês. A tela deixa de receber as parcelas cruas.
- **Card de seleção no servidor.** Total, parcelas, prazo médio, taxa, líquido e vencidas da
  seleção vêm de uma server action (`calcularSelecaoAction`, com `requireAdminOrThrow`), chamada
  a cada mudança de seleção ou período, com espera de ~200 ms e descarte de resposta antiga. A
  lógica fica em `calcularSelecao` (`src/lib/fila-antecipacao.ts`), pura e testada, sobre as
  mesmas `titulosDeVenda` + `calcularAntecipacao`. Enquanto calcula, o card mostra "Calculando…"
  e o botão Antecipar fica desabilitado.
- **Popover de parcelas** no "Nx" da coluna Parcelas (abre no hover, fixa no clique): data da
  compra, quantidade e valor da parcela, contagem por situação, tabela Nº | Vencimento | Valor |
  Situação e rodapé com já antecipado e falta antecipar da venda.
- **Selo "A antecipar"** no lugar de "Pendente" (selo da coluna Status e opção do dropdown). O
  valor gravado (`pendente`) não muda.

O que continua na tela e não é cálculo de negócio: filtrar a lista (comparar o mês escolhido com os
meses que o servidor mandou), buscar por nome, formatar moeda e data.

## Fora do escopo

Regras de antecipação, action `antecipar`, relatórios. O `FormSelect` não muda de visual nem de
API para quem não passa as novas props.
