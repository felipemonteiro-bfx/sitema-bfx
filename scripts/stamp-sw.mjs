// Estampa o BUILD_ID unico do Next no CACHE_NAME do service worker.
//
// Por que: o public/sw.js versionava o cache a mao ('bfx-manager-v1' -> 'v2').
// Se alguem esquecia de bumpar num deploy, o navegador continuava servindo o
// JS/HTML velho em cache ("deployei mas nao atualizou") -> ja causou venda
// salva zerada (form velho em cache). Estampando o BUILD_ID (que muda a cada
// build) o handler 'activate' do sw.js apaga os caches antigos sozinho,
// todo deploy, sem depender de ninguem lembrar.
//
// Roda encadeado no script "build" (Yarn Berry nao executa post-scripts).
import { readFileSync, writeFileSync } from "node:fs";

const SW_PATH = "public/sw.js";

let buildId;
try {
  buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
} catch {
  buildId = String(Date.now()); // fallback: ainda garante unicidade por build
}

const original = readFileSync(SW_PATH, "utf8");
const stamped = original.replace(
  /const CACHE_NAME = ['"][^'"]*['"];/,
  `const CACHE_NAME = 'bfx-manager-${buildId}';`
);

if (stamped === original) {
  console.error(`[stamp-sw] ERRO: linha 'const CACHE_NAME = ...' nao encontrada em ${SW_PATH}`);
  process.exit(1); // falha alto de proposito: sem estampa o cache-bust silenciosamente para de funcionar
}

writeFileSync(SW_PATH, stamped);
console.log(`[stamp-sw] CACHE_NAME -> bfx-manager-${buildId}`);
