/**
 * Espaço vertical que `/api/relatorios/antecipacao-imagem` gasta desenhando. Os números
 * são os mesmos passos de `y` da rota; mudar o desenho exige mudar aqui.
 */
export const LAYOUT_PDF_ANTECIPACAO = {
  topo: 162, // cabeçalho + resumo até o primeiro bloco
  blocoEmpresa: 54, // cabeçalho do bloco (50) + respiro (4)
  porMes: 42, // faixa do mês (22) + cabeçalho da tabela (16) + respiro (4)
  porParcela: 16,
  fimEmpresa: 12,
  rodape: 44, // linha (8) + caixa do TOTAL GERAL (36)
  margemInferior: 36,
  alturaA4: 842,
} as const;

/**
 * Altura da página única do PDF de antecipação. A estimativa antiga (30 por mês, 18 por
 * parcela) ficava abaixo do desenho real e cortava o TOTAL GERAL com 2 ou mais empresas.
 */
export function alturaPaginaAntecipacao(blocos: { meses: number; parcelas: number }[]): number {
  const L = LAYOUT_PDF_ANTECIPACAO;
  const conteudo = blocos.reduce(
    (s, b) => s + L.blocoEmpresa + b.meses * L.porMes + b.parcelas * L.porParcela + L.fimEmpresa,
    0,
  );
  return Math.max(L.alturaA4, L.topo + conteudo + L.rodape + L.margemInferior);
}
