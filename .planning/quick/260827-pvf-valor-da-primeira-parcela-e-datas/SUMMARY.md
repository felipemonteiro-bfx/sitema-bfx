# SUMMARY — Valor da 1a parcela e datas de vencimento

Data: 2026-08-27 · Branch: nextjs-migration

## Causa raiz

`src/components/parcelas-vencimento-form.tsx` usava o valor da PRIMEIRA parcela
como sentinela de "a lista esta desatualizada" na auto-init:

```ts
parcelas.length !== numeroParcelas ||
parcelas[0]?.valorParcela !== Math.trunc((valorTotal / numeroParcelas) * 100) / 100
```

Ajustar o valor da 1a parcela tornava a condicao verdadeira e o `useEffect`
regenerava a lista inteira — descartando a edicao e reescrevendo todas as datas
de vencimento. Da 2a em diante ninguem olhava: dai o sintoma "so a primeira nao
deixa alterar". Mudanca no valor total da venda (item novo, frete, taxa de nota)
disparava a mesma regeneracao e apagava datas ja escolhidas.

Efeito colateral da mesma auto-init: todas as parcelas recebiam o valor truncado
(700 em 3x -> 233,33 x3 = 699,99), entao o card acusava divergencia da soma e
empurrava o usuario a corrigir justamente a parcela travada.

## Segunda causa, independente (review em subagente)

Na tela de edicao do historico a auto-init ja estava desligada, entao a causa acima
nao explicava o relato das datas ali. O review encontrou o resto:

- `<Calendar>` sem `defaultMonth`: em react-day-picker v9 o mes inicial e'
  `month || defaultMonth || today` (`selected` nao conta) e o popover remonta o
  conteudo a cada abertura — o calendario de uma parcela de abril/2027 abria em
  agosto/2026, sem dia marcado, so navegavel por chevrons de 28 px.
- `mode="single"` sem `required`: tocar no dia ja selecionado devolve `undefined` e
  apagava a data no campo nao-controlado (data da venda, do produto, do cliente).

## Mudanca

- `src/lib/parcelas-ajuste.ts`: nova funcao pura `sincronizarParcelasAuto`, que
  devolve `null` quando nao ha nada a fazer. So o numero de parcelas (tamanho da
  lista) e o valor total (divisao) invalidam a lista; edicao de valor ou de data
  nunca dispara nada. Reaproveita `ajustarParcelas` e `redistribuirValores`, as
  mesmas regras que a tela de edicao ja usava.
- `src/components/parcelas-vencimento-form.tsx`: o effect passa a chamar essa
  funcao, com um `useRef` guardando o total do render anterior.
- `src/components/ui/date-input.tsx`: `defaultMonth={date}` no calendario,
  `required={required}` (desliga o toggle-off na origem onde limpar nao e' valido) e
  `selecaoDeDataDoCalendario` (nova regra pura em `src/lib/data-input.ts`), que so
  limpa em campo opcional — a data de nascimento do cliente continua apagavel.
- `src/__tests__/parcelas-vencimento-auto.test.ts` e um bloco novo em
  `src/__tests__/data-input.test.ts`: travas de regressao.

## Achados do review aplicados

- ALTA: o componente avancava o ref do total mesmo quando a sincronizacao pulava. Com
  o campo Parcelas em 1 (o desconto em folha muda isso sozinho), o total novo era
  registrado sem nunca ter sido aplicado e a lista voltava presa nos valores antigos —
  R$ 400 numa venda de R$ 1400. `sincronizarParcelasAuto` passou a devolver
  `valorTotalObservado`, e o teste cobre a sequencia 3x -> 1x -> 3x.
- MEDIA/BAIXA (pre-existentes, guardas de uma linha): total NaN e numero de parcelas
  fracionario vindos da querystring viravam loop de render ("Maximum update depth");
  `dataVenda` corrompida fazia o effect lancar.
- O bloco de testes foi refeito: dois dos tres casos originais passariam tambem com a
  regra antiga, entao nao eram trava de regressao.

Nenhuma mudanca de comportamento em `edit-parcelas-section.tsx`, que sempre passa
`disableAutoInit` e sincroniza por conta propria.

## Achados do 2o round de review, aplicados

- O guard do toggle-off, na primeira versao, tirava a UNICA forma de apagar a data de
  nascimento de um cliente (campo opcional, backend grava null, e o campo nao tem
  botao de limpar). A regra passou a distinguir campo obrigatorio de opcional.
- O teste do achado ALTA nao discriminava: voltava ao total ORIGINAL, caso em que as
  duas versoes coincidem. Passou a terminar no total novo (3x 1400 -> 1x 400 -> 3x
  400) e agora reprova a versao com o ref adiantado.

## Verificacao

- `npx vitest` e `npx tsx` nao rodam nesta maquina (node_modules e de outra
  plataforma — binarios nativos de rolldown/esbuild ausentes). O CI e o gate.
- A logica foi executada localmente com `node --experimental-strip-types` sobre copias
  dos modulos puros: os 12 casos de `parcelas-vencimento-auto` e os 14 de `data-input`
  passam. Os testes tambem foram rodados contra reimplementacoes do codigo ANTIGO para
  provar que travam de fato: a auto-init antiga reprova no primeiro caso ("o valor
  editado na 1a parcela sobrevive ao proximo render") e o ref adiantado reprova no
  caso do 1x.
- `npx tsc --noEmit` sem erro novo; `npx eslint` limpo nos arquivos tocados.
