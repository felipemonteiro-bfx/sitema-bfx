// Politica de teto de quantidade na venda rapida (UXP-02, D-03).
//
// Decisao de negocio do Andre (2026-08-03): o teto de quantidade baseado em
// estoque disponivel foi retirado da venda rapida de proposito. O vendedor
// pode digitar qualquer quantidade, mesmo acima do estoque cadastrado, sem
// que o campo se corrija sozinho. O decremento de estoque na gravacao da
// venda (`src/app/(app)/venda-rapida/actions.ts`) continua intacto — so o
// controle na tela sumiu.
//
// Este e o UNICO lugar onde o teto voltaria, caso a decisao seja revertida
// no futuro: a funcao ja recebe o estoque disponivel como segundo argumento,
// hoje ignorado de proposito (prefixo `_`, mesmo padrao do `_catalogo`
// estabelecido na fase 7). Reintroduzir o teto e editar esta funcao, ja
// coberta por teste, em vez de espalhar a regra pelo componente.
//
// Modulo puro: zero imports. Isso permite verificar RED -> GREEN diretamente
// via `node --input-type=module`, sem depender de `node_modules` (ausentes
// nesta maquina).

export function aplicarTetoQuantidade(
  quantidade: number,
  _estoqueDisponivel?: number | null,
): number {
  return quantidade;
}
