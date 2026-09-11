# SUMMARY — Antecipação por comprador

Data: 2026-09-11 · Spec: `SPEC.md` (nesta pasta)

## Entregue

- `src/lib/antecipacao-compradores.ts` (puro): `resumirAntecipacaoPorComprador`,
  `situacaoParcelasVenda`, `chaveComprador`. Três baldes por parcela — antecipada, a
  antecipar, vencida sem antecipação — com as regras da spec.
- `src/lib/data-pura.ts`: `hojeDataPura()`, o dia civil de Manaus como `YYYY-MM-DD`.
- `/prudent`: card **Antecipação por comprador** com os totais Já antecipado / Falta
  antecipar / Vencidas sem antecipação, aviso de que o que foi antecipado só na planilha não
  aparece, busca, "só quem tem parcela a antecipar", tabela por comprador (10 primeiros +
  "Mostrar todos") e botão **Ver na fila**, que filtra a fila por aquele comprador e leva o
  foco até ela.
- Fila: chip de filtro por comprador; coluna Parcelas com "N a antecipar · N vencidas"; o
  card de seleção avisa quantas parcelas vencidas o lote vai carregar.

## Verificação

- `src/__tests__/antecipacao-compradores.test.ts`: 19 casos, rodados com
  `node --experimental-strip-types` e shim de vitest (o vitest não roda nesta máquina).
  RED visto antes de cada implementação.
- `telas-financeiras-contraste.test.ts` (agora cobre o componente novo): 40/40.
- `tsc --noEmit`: nenhum erro nos arquivos tocados. `npm run cores:check`: OK.

## Revisão em subagentes (aplicada)

Correção: venda cancelada mostrava "faltam N" na fila; "Tudo antecipado" ao lado de
vencidas; "Ver na fila" não limpava o período; venda legada antecipada sem parcelas caía no
aviso de "cadastre as parcelas"; o comentário que dizia que título vencido tem "prazo 0"
estava errado (o prazo conta da data da venda). UI: contraste da linha destacada, chip e
botão; botão alterna, com `aria-pressed` e nome acessível; foco segue a rolagem; celular;
rótulos coerentes; definições junto dos totais.

## Não feito (decisão do André)

1. **A fila deixa antecipar parcela vencida.** `titulosDeVenda` e a action `antecipar` não
   têm piso de data: em produção, 209 parcelas vencidas (R$ 68,9 mil) continuam
   selecionáveis e entram no lote com taxa cheia. Excluí-las muda a action e, se feito em
   `titulosDeVenda`, o custo no DRE (`custoAntecipacaoVenda`). Hoje só fica visível.
2. **Conciliar com a planilha.** Nenhuma parcela está marcada como antecipada no banco.
   Cruzamento (somente leitura): 186 parcelas (R$ 54.740,43) estão "ANTECIPAÇÃO OK" na
   planilha e casam com o sistema — seriam marcadas. É escrita em produção.
3. **Edição de venda apaga o flag `antecipada` das parcelas** (`historico/actions.ts`
   recria as parcelas sem copiar o flag). Bug fora deste diff, achado na revisão.

## Achados da conciliação que explicam divergências

- O vencimento do sistema é o dia 10 do mês seguinte ao **mês de desconto** da planilha
  (`calcularPrimeiroVencimento`). Filtrar a fila por "09/2026" mostra o desconto de agosto.
- 271 linhas da planilha sem par no sistema: compras antigas nunca cadastradas, valor ou
  número de parcela divergente, 21 vendas sem parcelas cadastradas.
- A planilha não tem CPF em 79 das 202 linhas de set/26 em diante, e há 46 pares de nomes
  escritos de formas diferentes para o mesmo comprador.
