/**
 * Filtro de exibicao do markup interno de chamada de ferramenta (achado 8 da
 * fase 17).
 *
 * Alguns provedores emitem `<tool_call>…</tool_call>` e `<function=…>…</function>`
 * no CORPO do texto em vez do canal proprio de tool-calling, e isso vazava cru
 * para o usuario. O caso visto em producao foi
 * `<tool_call> <function=resumo_financeiro>`, sem nenhum fechamento.
 *
 * Modulo separado do componente de propósito: aqui e funcao pura, sem React e
 * sem `react-markdown`, entao da para testar o COMPORTAMENTO (entrada -> saida)
 * em vez de conferir o texto do arquivo.
 *
 * Duas regras de prudencia, porque apagar demais e pior que exibir markup feio:
 *
 * 1. Abertura SEM fechamento apaga so a tag, nunca o resto do texto. O resumo
 *    das ferramentas (`buildToolSummary`, com as tabelas) e concatenado DEPOIS
 *    do texto do modelo em `lib/ai.ts` — engolir o resto a partir de um
 *    `<tool_call>` pendurado apagaria justamente a tabela que o usuario quer.
 * 2. A abertura de funcao e `<function=` e nao `<function`: exigir o sinal de
 *    igual evita casar com `<functions>`, `<function_name>` ou prosa que
 *    explique a tag.
 *
 * Nota de seguranca (CLAUDE.md): so `.split()`, `.join()`, `.indexOf()` e
 * `.slice()` — nenhuma execucao de regex com estado.
 */

const TOOL_CALL_ABRE = "<tool_call>";
const TOOL_CALL_FECHA = "</tool_call>";
const FUNCTION_ABRE = "<function=";
const FUNCTION_FECHA = "</function>";

/**
 * Remove blocos `abre … fecha` completos, com o conteudo — que e payload de
 * maquina, nao texto. Abertura sem fechamento fica intacta aqui: quem cuida
 * dela e a limpeza de tags soltas, que apaga apenas a tag.
 */
function removerBlocosFechados(texto: string, abre: string, fecha: string): string {
  const partes = texto.split(abre);
  let saida = partes[0];
  for (let i = 1; i < partes.length; i++) {
    const parte = partes[i];
    const fim = parte.indexOf(fecha);
    if (fim === -1) {
      saida += abre + parte;
    } else {
      saida += parte.slice(fim + fecha.length);
    }
  }
  return saida;
}

/**
 * Apaga a tag `prefixo … >` e nada alem dela. Sem `>` depois do prefixo, apaga
 * so o prefixo: o resto e texto do usuario ate prova em contrario.
 */
function removerTagAberta(texto: string, prefixo: string): string {
  return texto
    .split(prefixo)
    .map((parte, i) => {
      if (i === 0) return parte;
      const fim = parte.indexOf(">");
      return fim === -1 ? parte : parte.slice(fim + 1);
    })
    .join("");
}

/**
 * Devolve o texto sem o markup interno de ferramenta. Nao toca em nada que ja
 * esteja persistido — e filtro de renderizacao. Texto de erro do provedor
 * tambem passa intacto: e diagnostico legitimo, ainda que feio.
 */
export function stripToolMarkup(text: string): string {
  let saida = removerBlocosFechados(text, TOOL_CALL_ABRE, TOOL_CALL_FECHA);
  saida = removerBlocosFechados(saida, FUNCTION_ABRE, FUNCTION_FECHA);
  // Sobras. Tags completas saem inteiras; `<function=` precisa ser consumida
  // ate o `>` porque carrega o nome da funcao no meio.
  for (const tag of [TOOL_CALL_ABRE, TOOL_CALL_FECHA, FUNCTION_FECHA]) {
    saida = saida.split(tag).join("");
  }
  return removerTagAberta(saida, FUNCTION_ABRE).trim();
}
