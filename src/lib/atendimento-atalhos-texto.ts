/**
 * Textos prontos dos atalhos do atendimento. Funções puras, sem servidor: a UI
 * as usa para PREENCHER o campo de mensagem; nada é enviado sozinho.
 *
 * Regras de conteúdo (decididas com o André em 16/10):
 * - estoque nunca cita quantidade nem preço;
 * - resumo de parcelas sempre traz a ressalva de que a equipe confere a baixa;
 * - link de boleto só entra se for `https:`.
 */

/**
 * "2026-11-05" -> "05/11". Lê o dia gravado: vencimento e data da venda são
 * data pura (meia-noite UTC), e converter para o fuso de Manaus mostraria o dia
 * anterior. Aqui não há `Date` nem fuso, só a string.
 */
export function dataDiaMes(dataPura: string): string {
  const [, mes, diaDoMes] = dataPura.slice(0, 10).split("-");
  return `${diaDoMes}/${mes}`;
}

export function textoTemEstoque(nome: string): string {
  return `Olá! Temos ${nome} disponível em estoque. A equipe confirma preço e condições antes de fechar. Posso seguir com o pedido?`;
}

export function textoSemEstoque(nome: string): string {
  return `Olá! No momento não temos ${nome} em estoque. Posso avisar quando chegar ou sugerir um modelo parecido?`;
}

/** Escolhe o texto pelo saldo, sem repassar o número ao cliente. */
export function textoEstoque(item: { nome: string; quantidade: number }): string {
  return item.quantidade > 0 ? textoTemEstoque(item.nome) : textoSemEstoque(item.nome);
}

const RESSALVA_BAIXA = "A equipe confere a baixa antes de confirmar quitação.";

export function textoResumoParcelas(
  parcelas: { dataVencimento: string; situacao: "paga" | "vencida" | "a_vencer" }[],
): string {
  const vencidas = parcelas.filter((p) => p.situacao === "vencida").length;
  const aVencer = parcelas.filter((p) => p.situacao === "a_vencer");
  if (vencidas === 0 && aVencer.length === 0) {
    return `Não encontrei parcelas em aberto no seu cadastro. ${RESSALVA_BAIXA}`;
  }
  // As datas são "YYYY-MM-DD": a ordem de texto é a ordem do calendário.
  const proximo = aVencer.map((p) => p.dataVencimento).sort()[0];
  const base = `Resumo das suas parcelas: ${vencidas} vencida(s) e ${aVencer.length} a vencer`;
  return proximo
    ? `${base}; próximo vencimento em ${dataDiaMes(proximo)}. ${RESSALVA_BAIXA}`
    : `${base}. ${RESSALVA_BAIXA}`;
}

/** Devolve o link só se for uma URL https válida e sem espaço. */
export function linkHttpsSeguro(link: string | null | undefined): string | null {
  if (!link || /\s/.test(link)) return null;
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname ? link : null;
  } catch {
    return null;
  }
}

/** `null` quando não há link https: nesse caso não há texto a inserir. */
export function textoSegundaVia(link: string | null | undefined): string | null {
  const seguro = linkHttpsSeguro(link);
  if (!seguro) return null;
  return `Segue a 2ª via do seu boleto: ${seguro}. Se já pagou, pode desconsiderar.`;
}
