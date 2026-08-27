# SPEC — Valor da 1a parcela e datas de vencimento nao persistem

Data: 2026-08-27
Arquivo no centro: `src/components/parcelas-vencimento-form.tsx`

## Sintoma relatado

1. "Consigo alterar o valor da segunda parcela em diante, mas a primeira nao."
2. "Nao estou conseguindo fazer alteracao nas datas de parcelas."

Telas: venda rapida (`venda-rapida-form-v2.tsx`, secao 6) e o dialog de datas na
edicao de venda (`edit-parcelas-section.tsx`).

## Comportamento atual

`ParcelasVencimentoForm` tem uma auto-init em `useEffect` cuja condicao de
disparo e:

```ts
parcelas.length !== numeroParcelas ||
parcelas[0]?.valorParcela !== Math.trunc((valorTotal / numeroParcelas) * 100) / 100
```

Ou seja: **o valor da primeira parcela e usado como sentinela de "a lista esta
desatualizada"**. Consequencias:

- Editar o valor da 1a parcela torna a condicao verdadeira -> o effect regenera a
  lista inteira e joga fora a edicao. Da 2a em diante ninguem olha, por isso so a
  primeira parece "travada".
- A regeneracao reescreve tambem as **datas** de todas as parcelas, voltando para
  o padrao (dia 10, cadencia mensal). Qualquer data ja escolhida se perde.
- Na venda rapida o `valorTotal` muda a cada item/frete; toda mudanca de total
  invalida a sentinela e reescreve datas ja combinadas, em vez de so redistribuir
  valores.
- A auto-init da o mesmo valor truncado a todas as parcelas (`base`), entao
  700 em 3x sai 233,33 x3 = 699,99 e o proprio card acusa "a soma difere do
  total" — o aviso empurra o usuario a corrigir justamente a 1a parcela, que e a
  unica que nao aceita edicao.

## Comportamento esperado

- Editar o valor de **qualquer** parcela, inclusive a 1a, persiste.
- Editar a data de qualquer parcela persiste; nada reescreve datas por causa de
  edicao de valor.
- Mudar o **numero de parcelas** ajusta a lista preservando as datas ja
  escolhidas (corta do fim / acrescenta ao fim) — regra que ja existe em
  `ajustarParcelas`.
- Mudar o **valor total** redistribui apenas os valores, preservando as datas —
  regra que ja existe em `redistribuirValores` (ultima parcela absorve o resto,
  a soma fecha o total exato).

## Mudanca

Nova funcao pura em `src/lib/parcelas-ajuste.ts`:

```ts
sincronizarParcelasAuto({ parcelas, numeroParcelas, valorTotal, valorTotalAnterior, dataVenda })
  : ParcelaAjuste[] | null   // null = nada a fazer, nao chamar onChange
```

- `numeroParcelas <= 1` -> `null`
- lista com tamanho diferente do alvo -> `ajustarParcelas` (gera/corta preservando datas)
- mesmo tamanho e `valorTotalAnterior` mudou -> `redistribuirValores`
- caso contrario -> `null` (edicao manual de valor ou de data nunca dispara nada)

`ParcelasVencimentoForm` passa a usar essa funcao com um `useRef` para o total
anterior, no lugar da condicao caseira. `disableAutoInit` continua desligando
tudo (a tela de edicao ja sincroniza por conta propria).

## Segunda causa (achada no review, escopo ampliado)

O review em subagente confirmou uma causa independente para o sintoma das datas, que
o item acima nao cobre — e que e' a unica explicacao na tela de edicao do historico,
onde a auto-init ja estava desligada por `disableAutoInit`:

1. **O calendario sempre abria no mes de hoje.** `<Calendar>` nao recebia
   `defaultMonth`; em react-day-picker v9 o mes inicial e' `month || defaultMonth ||
   today` — `selected` nao entra na conta — e o `PopoverContent` desmonta ao fechar,
   entao toda abertura recomecava em hoje. A 8a parcela de uma venda 12x vence
   10/04/2027: o calendario abria em agosto/2026, sem nenhum dia marcado, e a unica
   saida era acertar oito vezes um chevron de 28 px num iPhone.
   Correcao: `defaultMonth={date}`.

2. **Tocar no dia ja selecionado apagava a data.** `mode="single"` sem `required` faz
   toggle-off e devolve `undefined` no `onSelect`. O campo controlado so fechava o
   popover sem mudar nada (parece toque ignorado); o nao-controlado (data da venda, do
   produto, do cliente) limpava o campo e mandava "" no submit.
   Correcao: regra em `selecaoDeDataDoCalendario` (`src/lib/data-input.ts`) —
   `undefined` e' toque sem efeito, nunca pedido de limpeza.

## Fora de escopo

- Trocar o `<Input type="number">` do valor por mascara pt-BR (`CurrencyInput`).
- Aumentar os chevrons de navegacao do calendario (28 px) ou trocar a legenda por
  dropdown de mes/ano — com `defaultMonth` o caminho longo deixa de ser necessario.
- `formatDateBR` sem `timeZone` (desloca um dia se o container nao rodar em UTC) e o
  `aria-label` que o `DateInput` descarta: achados laterais do review, sem relacao com
  este bug.
- Alterar `edit-parcelas-section.tsx`, que ja usa `ajustarParcelas`.

## Como testar

`src/__tests__/parcelas-ajuste.test.ts`: vitest roda em `environment: "node"`,
sem jsdom nem testing-library — por isso a regra vive num modulo puro. Casos:
edicao da 1a parcela nao dispara sincronizacao; edicao de data nao dispara;
mudanca de numero de parcelas preserva datas; mudanca de total preserva datas e
fecha a soma no total exato.
