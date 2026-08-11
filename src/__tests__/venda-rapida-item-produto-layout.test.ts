// Teste-gate dos dois defeitos estruturais de /venda-rapida relatados em 2026-08-11.
// Ver `.planning/quick/260811-vrp-botao-cadastrar-cliente-e-item-de-produto/SPEC.md`.
//
// Le o fonte com `readFileSync` e afirma a REGRA, nao a classe nominal — mesmo criterio de
// `d170ba9`. Formato de `edit-venda-form-ux.test.ts`: so `.includes()`, `.split()` e
// `.indexOf()`, nunca o metodo de execucao de regex sobre objeto RegExp (bloqueado pelo hook de
// seguranca do CLAUDE.md).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();

/**
 * Le o fonte SEM comentario. Necessario, nao cosmetico: neste repo o comentario documenta o
 * defeito medido, entao ele CITA a classe que foi removida ("era `lg:grid-cols-4`"). Sem tirar o
 * comentario, toda afirmacao de ausencia acusa a propria documentacao da correcao — e a de
 * presenca pode passar por causa dela, que e um falso PASS. Sem regex com estado (CLAUDE.md):
 * `/* ... *␣/` sai por `.split()`, e a linha de `//` por prefixo apos `.trim()`.
 */
function lerCodigo(rel: string): string {
  const bruto = readFileSync(join(raiz, rel), "utf8");
  // Linha de `//` PRIMEIRO: neste repo o comentario de linha cita JSX removido, e um `/*` dentro
  // dele abriria um bloco fantasma que engoliria codigo real ate o proximo `*␣/`.
  const semLinha = bruto
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("//"))
    .join("\n");
  return semLinha
    .split("/*")
    .map((parte, i) => {
      if (i === 0) return parte;
      const fecha = parte.indexOf("*/");
      // `/*` sem fechamento (glob numa string, URL) nao e comentario: devolve a parte intacta.
      // Sem esta guarda, `slice(-1 + 2)` = `slice(1)` comeria codigo em silencio — e uma
      // afirmacao de ausencia passaria porque o trecho foi APAGADO, nao porque foi corrigido.
      return fecha < 0 ? parte : parte.slice(fecha + 2);
    })
    .join(" ");
}

/** Trecho que vai da abertura de `tag` mais proxima ate `agulha` (exclusive). */
// (nao existe helper de "janela de N caracteres": asercao sobre janela fixa mede o vizinho
// quando o JSX muda, e foi assim que uma versao anterior deste arquivo passou por sorte.)
function tagQueAbre(fonte: string, tag: string, agulha: string): string {
  const fim = fonte.indexOf(agulha);
  if (fim < 0) return "";
  const inicio = fonte.lastIndexOf(tag, fim);
  if (inicio < 0) return "";
  return fonte.slice(inicio, fim);
}

/**
 * Abre a tag JSX que contem `agulha` a partir de `de`: do ultimo `<` antes dela ate o `>` que
 * fecha a tag DE VERDADE — o primeiro fora de `{...}`. Fechar no primeiro `>` cru quebraria em
 * atributo com expressao, e este arquivo tem seis `margem >= 20` dentro de `className={cn(...)}`.
 */
function tagQueContem(fonte: string, agulha: string, de = 0): string {
  const pos = fonte.indexOf(agulha, de);
  if (pos < 0) return "";
  const inicio = fonte.lastIndexOf("<", pos);
  if (inicio < 0) return "";
  let chaves = 0;
  for (let i = inicio; i < fonte.length; i++) {
    const ch = fonte[i];
    if (ch === "{") chaves++;
    else if (ch === "}") chaves--;
    else if (ch === ">" && chaves === 0) return fonte.slice(inicio, i + 1);
  }
  return "";
}

/**
 * Posicao da regua que separa entrada de resultado: a ULTIMA `border-t` antes do primeiro
 * "Subtotal". Ancorar na primeira `border-t` do arquivo nao serve — ela e do botao "Cadastrar
 * ..." do dropdown de produtos, e uma versao anterior deste teste passava por causa disso,
 * medindo o elemento errado.
 */
function posicaoDaRegua(fonte: string): number {
  const posSubtotal = fonte.indexOf("Subtotal");
  if (posSubtotal < 0) return -1;
  return fonte.lastIndexOf("border-t", posSubtotal);
}

describe("D-01 — acao 'Cadastrar cliente' usa o botao do design system", () => {
  const fonte = lerCodigo("src/components/venda-rapida-form-v2.tsx");

  it("a acao esta dentro de um <Button>, nao de um <button> cru", () => {
    // Ancora na abertura do <Button> mais proxima do rotulo, nao numa janela de N caracteres:
    // com janela fixa, um JSX novo entre o rotulo e o botao faria as asercoes medirem o vizinho.
    const tag = tagQueAbre(fonte, "<Button", "Cadastrar cliente");
    expect(tag.length).toBeGreaterThanOrEqual(1);
    // Nenhum <button> cru entre o <Button> ancorado e o rotulo. (Nao vale exigir que NADA de `<`
    // apareca no trecho: `leftIcon={<Plus />}` e um `<` legitimo dentro da propria tag.)
    expect(tag.includes("<button")).toBe(false);
  });

  it("fala a mesma lingua do 'Adicionar Produto' da secao seguinte: outline + sm + leftIcon", () => {
    // As duas acoes de "adicionar" ficam a poucos centimetros na mesma tela. Uma variante
    // diferente em cada uma e justamente o que o Andre viu como "fora de padrao".
    const tag = tagQueAbre(fonte, "<Button", "Cadastrar cliente");
    expect(tag.includes('variant="outline"')).toBe(true);
    expect(tag.includes('size="sm"')).toBe(true);
    expect(tag.includes("leftIcon")).toBe(true);
    // o icone acompanha os outros dez `leftIcon` do projeto, que sao todos h-4 w-4
    expect(tag.includes('h-4 w-4')).toBe(true);
  });

  it("nao restou estilo de botao a mao (o link sublinhado que nao tinha anel de foco)", () => {
    expect(fonte.includes("text-info-text hover:underline")).toBe(false);
  });

  it("o campo de busca de cliente tem rotulo associado — era o unico sem nome acessivel", () => {
    // O campo mais importante da tela nao tinha `htmlFor` no rotulo nem `id` no <Input>: clique
    // no rotulo nao movia o foco e o leitor de tela anunciava um campo sem nome.
    expect(fonte.includes('htmlFor="cliente-query"')).toBe(true);
    expect(fonte.includes('id="cliente-query"')).toBe(true);
  });

  it("ha respiro entre a linha do rotulo e o campo de busca de cliente", () => {
    // Era o unico campo da tela com o <Input> colado no rotulo: a linha do rotulo e o
    // <Input> sao irmaos diretos, sem o space-y-2 que os outros campos usam.
    const linhaDoRotulo = tagQueContem(fonte, "flex items-center justify-between gap-2");
    expect(linhaDoRotulo.includes("mb-2")).toBe(true);
  });
});

describe("D-02 — o item de produto tem tres zonas, nao um grid unico", () => {
  const fonte = lerCodigo("src/components/produto-item-form.tsx");

  it("o bloco de resultado nao e mais coluna do grid dos campos", () => {
    // A regra: quem carrega a regua (border-t) que separa entrada de resultado nao pode viver
    // dentro do grid de campos, senao a regua comeca no meio do card (medido: 248px a direita
    // do campo Produto em 1440px, 144px em 1024px) e em 768px os tres blocos caem numa coluna de
    // 332px, com tiles de 102,7px, e o valor quebra em duas linhas.
    const regua = posicaoDaRegua(fonte);
    expect(regua).toBeGreaterThanOrEqual(0);
    const blocoDeResultado = tagQueContem(fonte, "border-t", regua);
    expect(blocoDeResultado.includes("border-t")).toBe(true);
    expect(blocoDeResultado.includes("col-span")).toBe(false);
  });

  it("a zona de entrada nao e mais um grid de 4 colunas com o resultado dentro", () => {
    // Escopado a zona de ENTRADA (tudo antes da regua): um grid de 4 colunas legitimo em outra
    // parte futura deste componente nao deve reprovar por nome.
    const zonaDeEntrada = fonte.slice(0, posicaoDaRegua(fonte));
    expect(zonaDeEntrada.includes("grid-cols-4")).toBe(false);
    expect(zonaDeEntrada.includes("col-span-3")).toBe(false);
  });

  it("o trio numerico (custo, valor, qtd) compartilha uma linha propria a partir de sm", () => {
    // Escopado a zona de ENTRADA: o `sm:grid-cols-3` do bloco de RESULTADO satisfazia esta
    // asercao sozinho, entao apagar o do trio — a regressao exata que este teste existe para
    // pegar — deixava o teste verde.
    const zonaDeEntrada = fonte.slice(0, posicaoDaRegua(fonte));
    expect(zonaDeEntrada.includes("sm:grid-cols-3")).toBe(true);
  });

  it("em tela estreita cada bloco de resultado ocupa a largura do card — nao ha o que truncar", () => {
    // A regra e o EMPILHAMENTO, nao o formato: o `grid-cols-3` antigo valia em toda largura, e
    // em 390px dava ~107px por bloco para um valor de ~90px (medido: 40px de altura, duas
    // linhas). Em coluna unica o bloco tem os ~322px do card. As tres colunas so entram a partir
    // de `sm`, que e como "Limite e Margem" e "Resumo Financeiro" fazem nesta mesma tela.
    const zonaDoResultado = fonte.slice(posicaoDaRegua(fonte));
    expect(zonaDoResultado.includes("grid-cols-1")).toBe(true);
    expect(zonaDoResultado.includes("sm:grid-cols-3")).toBe(true);
    // `grid-cols-3` sem prefixo de breakpoint e justamente o defeito: valeria tambem em 390px.
    expect(zonaDoResultado.includes('"grid grid-cols-3')).toBe(false);
    expect(zonaDoResultado.includes(" grid-cols-3 ")).toBe(false);
  });

  it("nenhum bloco de metrica troca de eixo por breakpoint (nao existe no resto do BFX)", () => {
    // Vizinhos imediatos — "Limite e Margem" e os dois grids do "Resumo Financeiro" — empilham
    // centrado e nunca viram linha rotulo/valor. Uma versao anterior desta correcao fazia esse
    // flip e criava a terceira lingua para numero derivado na MESMA tela.
    expect(fonte.includes("sm:flex-col")).toBe(false);
  });

  it("todo rotulo do item aponta para um campo (htmlFor) e o id existe no arquivo", () => {
    const rotulos = fonte.split("<Label").slice(1);
    expect(rotulos.length).toBeGreaterThanOrEqual(4);
    for (const rotulo of rotulos) {
      // fecha no `>` fora de `{...}`: um `className={cn(margem > 20 ? ...)}` truncaria a leitura
      // antes do htmlFor e reprovaria sem defeito real.
      const aberturaDaTag = tagQueContem("<Label" + rotulo, "<Label");
      expect(aberturaDaTag.includes("htmlFor")).toBe(true);
    }
    // Os tres que faltavam: rotulo sem htmlFor nao move foco no clique nem nomeia o campo.
    for (const campo of ["custo-produto-", "valor-venda-", "quantidade-"]) {
      expect(fonte.includes(`htmlFor={\`${campo}`)).toBe(true);
      expect(fonte.includes(`id={\`${campo}`)).toBe(true);
    }
  });

  it("nenhuma cor crua entre colchetes", () => {
    for (const prefixo of ["bg-[", "text-[", "border-["]) {
      expect(fonte.includes(prefixo)).toBe(false);
    }
  });
});
