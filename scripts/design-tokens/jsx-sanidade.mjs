// Detector do comentario JSX que quebra o build — modulo puro, sem dependencias.
//
// `{cond && (` seguido de `{/* ... */}` e erro de sintaxe: dentro de um mesmo
// grupo de parenteses ficam duas expressoes sem operador entre elas. O React
// aceita comentario JSX como FILHO de um elemento, nao como primeiro token de
// uma expressao.
//
// Por que existe um script so para isto: o erro aconteceu TRES vezes em uma
// unica sessao (2026-08-11) — uma vez ao documentar a correcao da onda 1 e duas
// vezes durante a onda 3. Todas as vezes so apareceu no lint do CI, DEPOIS do
// push, custando um ciclo inteiro de build. As tres catracas de design sao
// varreduras textuais e nao pegam sintaxe; o lint pega, mas so no CI, porque
// `node_modules` esta vazio neste checkout e o eslint nao carrega localmente.
//
// Diferente das outras catracas, esta NAO tem baseline: nao e divida tecnica a
// reduzir aos poucos, e codigo que nao compila. Qualquer ocorrencia falha.
//
// Nota de seguranca (CLAUDE.md): sem `RegExp.prototype.exec` — so `.split()` e
// comparacao de string.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const IGNORAR_DIR = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);

/**
 * Devolve as ocorrencias `{linha, trecho}` em que uma abertura de expressao e
 * seguida por comentario JSX. Considera linha em branco entre as duas, que e
 * como o erro costuma aparecer depois de uma formatacao automatica.
 */
export function acharComentarioEmExpressao(texto) {
  const linhas = texto.split("\n");
  const achados = [];

  for (let i = 0; i < linhas.length; i++) {
    const atual = linhas[i].trim();
    // `&& (` e `|| (` abrem o mesmo tipo de expressao; `? (` idem no ternario.
    const abre = atual.endsWith("&& (") || atual.endsWith("|| (") || atual.endsWith("? (");
    if (!abre) continue;

    let j = i + 1;
    while (j < linhas.length && linhas[j].trim() === "") j++;
    if (j < linhas.length && linhas[j].trim().startsWith("{/*")) {
      achados.push({ linha: j + 1, trecho: linhas[j].trim().slice(0, 60) });
    }
  }

  return achados;
}

function listar(raiz, acumulador = []) {
  let entradas;
  try {
    entradas = fs.readdirSync(raiz, { withFileTypes: true });
  } catch {
    return acumulador;
  }
  for (const e of entradas) {
    const completo = path.join(raiz, e.name);
    if (e.isDirectory()) {
      if (IGNORAR_DIR.has(e.name)) continue;
      listar(completo, acumulador);
    } else if (e.name.endsWith(".tsx") || e.name.endsWith(".jsx")) {
      acumulador.push(completo);
    }
  }
  return acumulador;
}

export function varrer(raizes) {
  const problemas = [];
  for (const raiz of raizes) {
    for (const completo of listar(path.resolve(RAIZ, raiz))) {
      let texto;
      try {
        texto = fs.readFileSync(completo, "utf8");
      } catch {
        continue;
      }
      const relativo = path.relative(RAIZ, completo).split(path.sep).join("/");
      for (const a of acharComentarioEmExpressao(texto)) {
        problemas.push({ arquivo: relativo, ...a });
      }
    }
  }
  return problemas;
}

function principal(argv) {
  const raizes = argv.slice(2).filter((a) => !a.startsWith("--"));
  const problemas = varrer(raizes.length > 0 ? raizes : ["src"]);

  if (problemas.length > 0) {
    console.error("ERRO DE SINTAXE — comentario JSX como primeiro token de uma expressao:\n");
    for (const p of problemas) console.error(`  ${p.arquivo}:${p.linha}  ${p.trecho}`);
    console.error(
      "\nO comentario tem de vir ANTES da expressao:\n" +
        "  {/* explicacao */}\n" +
        "  {cond && (\n" +
        "    <Elemento />\n" +
        "  )}"
    );
    return 1;
  }

  console.log("OK — nenhum comentario JSX dentro de expressao.");
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("jsx-sanidade.mjs")) {
  process.exit(principal(process.argv));
}
