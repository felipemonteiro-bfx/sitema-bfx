#!/usr/bin/env node
// Gate de runtime — CLI.
//
// Varre rotas x {1440, 390} x {claro, escuro} num navegador de verdade, coleta
// o que foi RENDERIZADO e passa para `rendered-ui-rules.mjs`, que julga.
//
// Este arquivo nao decide nada sobre UI: ele resolve o Playwright, autentica,
// navega e coleta. Toda a regra mora na camada pura, que roda no vitest sem
// navegador. Ver `README.md` nesta pasta.
//
// Degradacao: sem Playwright ou sem Chromium, imprime NAO VERIFICADO com o
// motivo e os caminhos tentados, e sai com 0. Nunca reprova o build por
// ausencia de ferramenta; nunca passa em silencio fingindo que verificou.
// `--require-browser` inverte (exit 1) para um job de CI que tenha navegador.
//
// Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { analyzeSnapshot, fingerprint, formatReport } from "./rendered-ui-rules.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(AQUI, "baseline.json");

const ROTAS_PADRAO = [
  "/dashboard",
  "/cadastros",
  "/venda-rapida",
  "/financeiro",
  "/boletos",
  "/comissoes",
  "/historico",
  "/relatorios",
  "/relatorios/mensais",
  "/crm",
  "/crm/campanhas",
  "/crm/fidelidade",
  "/crm/importar-leads",
  "/importacao",
  "/importacao/clientes",
  "/importacao/fornecedores",
  "/gestao-rh",
  "/prudent",
  "/inteligencia",
  "/perfil",
  "/configuracoes",
  "/catalogo",
];

const VIEWPORTS = {
  1440: { width: 1440, height: 900 },
  390: { width: 390, height: 844 },
};

// --- argumentos ---------------------------------------------------------

function lerArgs(argv) {
  const op = {
    base: process.env.BFX_AUDIT_BASE || "https://bfx.softlive.dev",
    usuario: process.env.BFX_AUDIT_USER || "admin",
    senha: process.env.BFX_AUDIT_PASS || "admin",
    rotas: ROTAS_PADRAO,
    viewports: ["1440", "390"],
    temas: ["light", "dark"],
    exigirNavegador: false,
    atualizarBaseline: false,
    json: null,
    playwright: process.env.PLAYWRIGHT_MODULE || null,
    chromium: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROME_PATH || null,
    timeout: 45000,
    espera: 1200,
  };
  const lista = (v) => String(v).split(",").map((s) => s.trim()).filter(Boolean);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const prox = () => argv[(i += 1)];
    if (arg === "--base") op.base = prox();
    else if (arg === "--user") op.usuario = prox();
    else if (arg === "--pass") op.senha = prox();
    else if (arg === "--routes") op.rotas = lista(prox());
    else if (arg === "--viewports") op.viewports = lista(prox());
    else if (arg === "--themes") op.temas = lista(prox());
    else if (arg === "--require-browser") op.exigirNavegador = true;
    else if (arg === "--update-baseline") op.atualizarBaseline = true;
    else if (arg === "--json") op.json = prox();
    else if (arg === "--playwright") op.playwright = prox();
    else if (arg === "--chromium") op.chromium = prox();
    else if (arg === "--timeout") op.timeout = Number(prox());
    else if (arg === "--help" || arg === "-h") op.ajuda = true;
    else throw new Error(`argumento desconhecido: ${arg}`);
  }
  return op;
}

const AJUDA = `
Gate de runtime do BFX — mede PIXEL RENDERIZADO, nao token nem codigo-fonte.

  node scripts/ui-runtime/rendered-ui-audit.mjs [opcoes]
  npm run ui:runtime -- [opcoes]

  --base <url>          alvo (padrao https://bfx.softlive.dev, ou BFX_AUDIT_BASE)
  --user/--pass         credenciais (padrao admin/admin, ou BFX_AUDIT_USER/PASS)
  --routes a,b,c        rotas (padrao: as 22 de (app))
  --viewports 1440,390  larguras
  --themes light,dark   temas
  --require-browser     reprova (exit 1) se nao houver navegador, em vez de avisar
  --update-baseline     regrava scripts/ui-runtime/baseline.json com o que achou
  --json <arquivo>      grava os achados crus
  --playwright <path>   caminho do modulo do Playwright
  --chromium <path>     caminho do executavel do Chromium
`;

// --- resolucao do Playwright -------------------------------------------

function candidatosDeModulo(explicito) {
  const cands = [];
  if (explicito) cands.push(explicito);
  cands.push("playwright", "playwright-core");
  const npx = path.join(os.homedir(), ".npm", "_npx");
  if (fs.existsSync(npx)) {
    for (const dir of fs.readdirSync(npx)) {
      const alvo = path.join(npx, dir, "node_modules", "playwright", "index.mjs");
      if (fs.existsSync(alvo)) cands.push(alvo);
    }
  }
  return cands;
}

async function resolverPlaywright(explicito) {
  const tentados = [];
  for (const cand of candidatosDeModulo(explicito)) {
    tentados.push(cand);
    try {
      const especificador = cand.startsWith("/") ? pathToFileURL(cand).href : cand;
      const mod = await import(especificador);
      if (mod && mod.chromium) return { chromium: mod.chromium, origem: cand, tentados };
    } catch {
      // segue para o proximo candidato
    }
  }
  return { chromium: null, tentados };
}

function pastasDeCacheDoNavegador() {
  const home = os.homedir();
  return [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(home, "Library", "Caches", "ms-playwright"),
    path.join(home, ".cache", "ms-playwright"),
    path.join(home, "AppData", "Local", "ms-playwright"),
  ].filter(Boolean);
}

const RELATIVOS_DO_EXECUTAVEL = [
  "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "chrome-linux/chrome",
  "chrome-win/chrome.exe",
  "chrome-mac-arm64/headless_shell",
  "chrome-linux/headless_shell",
];

function resolverExecutavel(chromium, explicito) {
  const tentados = [];
  const testar = (p) => {
    if (!p) return null;
    tentados.push(p);
    return fs.existsSync(p) ? p : null;
  };

  const achado0 = testar(explicito);
  if (achado0) return { executavel: achado0, tentados };

  try {
    const nativo = chromium && typeof chromium.executablePath === "function" ? chromium.executablePath() : null;
    const achado1 = testar(nativo);
    if (achado1) return { executavel: achado1, tentados };
  } catch {
    // executablePath() lanca quando os navegadores nao foram instalados
  }

  for (const cache of pastasDeCacheDoNavegador()) {
    if (!fs.existsSync(cache)) {
      tentados.push(cache);
      continue;
    }
    const pastas = fs
      .readdirSync(cache)
      .filter((d) => d.startsWith("chromium-") || d.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse();
    for (const pasta of pastas) {
      for (const rel of RELATIVOS_DO_EXECUTAVEL) {
        const achado = testar(path.join(cache, pasta, rel));
        if (achado) return { executavel: achado, tentados };
      }
    }
  }

  for (const sistema of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]) {
    const achado = testar(sistema);
    if (achado) return { executavel: achado, tentados };
  }

  return { executavel: null, tentados };
}

// --- coletor (roda DENTRO da pagina) ------------------------------------
//
// So coleta. Nao julga. Converte cor para sRGB usando o proprio motor do
// navegador — e assim que `lab()`, `oklch()` e `color(srgb ...)` sao resolvidos
// sem reimplementar conversao de espaco de cor aqui.

const COLETOR = () => {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });

  function paraRgba(valor) {
    if (!valor || valor === "none" || valor === "transparent") return [0, 0, 0, 0];
    cx.fillStyle = "#f00";
    cx.fillStyle = valor;
    const a = cx.fillStyle;
    cx.fillStyle = "#0f0";
    cx.fillStyle = valor;
    if (cx.fillStyle !== a) return null; // valor invalido: fillStyle manteve o sentinela
    cx.clearRect(0, 0, 1, 1);
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }

  function caminho(el) {
    const partes = [];
    let e = el;
    let d = 0;
    while (e && e.tagName !== "BODY" && d < 4) {
      let s = e.tagName.toLowerCase();
      if (e.id) {
        partes.unshift(s + "#" + e.id);
        break;
      }
      const cls = (e.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3).join(".");
      if (cls) s += "." + cls;
      partes.unshift(s);
      e = e.parentElement;
      d += 1;
    }
    return partes.join(" > ");
  }

  function visivel(el, r) {
    if (r.width < 1 && r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  }

  function cadeiaDeFundo(el) {
    const cadeia = [];
    let e = el;
    let d = 0;
    while (e && d < 24) {
      const cs = getComputedStyle(e);
      const rgba = paraRgba(cs.backgroundColor);
      cadeia.push({ rgba: rgba || [0, 0, 0, 0], hasImage: cs.backgroundImage !== "none" });
      if (rgba && rgba[3] >= 0.999) break;
      e = e.parentElement;
      d += 1;
    }
    return cadeia;
  }

  const botoes = [];
  const icones = [];
  const textos = [];
  const vistos = new Set();
  const registrar = (colecao, chave, item) => {
    if (vistos.has(chave)) return;
    vistos.add(chave);
    colecao.push(item);
  };

  for (const b of document.querySelectorAll('button, [role="button"], a[class*="inline-flex"]')) {
    const r = b.getBoundingClientRect();
    if (!visivel(b, r)) continue;
    const p = caminho(b);
    registrar(botoes, "btn|" + p + "|" + b.scrollWidth + "|" + b.clientWidth, {
      path: p,
      cls: (b.getAttribute("class") || "").slice(0, 220),
      scrollWidth: b.scrollWidth,
      clientWidth: b.clientWidth,
      scrollHeight: b.scrollHeight,
      clientHeight: b.clientHeight,
      text: (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
    });
  }

  for (const s of document.querySelectorAll("svg")) {
    const r = s.getBoundingClientRect();
    if (!visivel(s, r)) continue;
    const cls = s.getAttribute("class") || "";
    const p = caminho(s);
    registrar(icones, "svg|" + p + "|" + cls + "|" + r.width.toFixed(2) + "|" + r.height.toFixed(2), {
      path: p,
      cls: cls.slice(0, 200),
      renderedWidth: +r.width.toFixed(2),
      renderedHeight: +r.height.toFixed(2),
      ownerPath: s.closest("button, a, [role='button']") ? caminho(s.closest("button, a, [role='button']")) : null,
    });

    const cs = getComputedStyle(s);
    const traco = cs.stroke && cs.stroke !== "none" ? cs.stroke : cs.fill && cs.fill !== "none" ? cs.fill : cs.color;
    const cor = paraRgba(traco);
    if (cor && cor[3] > 0) {
      const fundo = cadeiaDeFundo(s.parentElement || s);
      registrar(textos, "ico|" + p + "|" + cor.join(",") + "|" + JSON.stringify(fundo[fundo.length - 1] || null), {
        path: p,
        kind: "icon",
        sample: "",
        fontSizePx: Number.parseFloat(cs.fontSize) || 16,
        fontWeight: 400,
        color: cor,
        bgChain: fundo,
      });
    }
  }

  // (e) icone + texto no mesmo controle. Sobe de cada <svg> ate o container de
  // controle mais proximo (flex/inline-flex, ou button/a/th/label/summary) e
  // mede em quantas LINHAS o texto daquele container caiu.
  const containers = new Set();
  for (const s of document.querySelectorAll("svg")) {
    const r = s.getBoundingClientRect();
    if (!visivel(s, r)) continue;
    let e = s.parentElement;
    let d = 0;
    while (e && d < 4) {
      const cs = getComputedStyle(e);
      const ehControle = ["BUTTON", "A", "TH", "LABEL", "SUMMARY"].indexOf(e.tagName) >= 0;
      if (cs.display === "flex" || cs.display === "inline-flex" || ehControle) {
        containers.add(e);
        break;
      }
      e = e.parentElement;
      d += 1;
    }
  }

  const wraps = [];
  for (const c of containers) {
    const cs = getComputedStyle(c);
    const textRects = [];
    const andarilho = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    let amostra = "";
    let no = andarilho.nextNode();
    while (no) {
      const conteudo = no.textContent.trim();
      const pai = no.parentElement;
      if (conteudo && pai) {
        const pcs = getComputedStyle(pai);
        const classePai = pai.getAttribute("class") || "";
        if (pcs.display !== "none" && pcs.visibility !== "hidden" && !classePai.includes("sr-only")) {
          const faixa = document.createRange();
          faixa.selectNodeContents(no);
          for (const r of faixa.getClientRects()) {
            if (r.width < 0.5 || r.height < 0.5) continue;
            textRects.push([+r.top.toFixed(2), +r.height.toFixed(2)]);
          }
          if (!amostra) amostra = conteudo.slice(0, 32);
        }
      }
      no = andarilho.nextNode();
    }
    if (textRects.length === 0) continue;

    const iconCenters = [];
    for (const s of c.querySelectorAll("svg")) {
      const r = s.getBoundingClientRect();
      if (!visivel(s, r)) continue;
      iconCenters.push(+(r.top + r.height / 2).toFixed(2));
    }
    if (iconCenters.length === 0) continue;

    const p = caminho(c);
    registrar(wraps, "wrap|" + p + "|" + textRects.length + "|" + iconCenters.join(","), {
      path: p,
      cls: (c.getAttribute("class") || "").slice(0, 200),
      sample: amostra,
      iconCount: iconCenters.length,
      textRects,
      iconCenters,
      flexDirection: cs.flexDirection,
      flexWrap: cs.flexWrap,
    });
  }

  for (const el of document.querySelectorAll("body *")) {
    const temTextoProprio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!temTextoProprio) continue;
    const r = el.getBoundingClientRect();
    if (!visivel(el, r)) continue;
    const cs = getComputedStyle(el);
    if (cs.color === "transparent" || cs.webkitTextFillColor === "transparent") continue; // texto em gradiente
    const cor = paraRgba(cs.color);
    if (!cor || cor[3] === 0) continue;
    const fundo = cadeiaDeFundo(el);
    const p = caminho(el);
    registrar(textos, "txt|" + p + "|" + cor.join(",") + "|" + cs.fontSize + "|" + JSON.stringify(fundo[fundo.length - 1] || null), {
      path: p,
      kind: "text",
      sample: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 32),
      fontSizePx: Number.parseFloat(cs.fontSize) || 16,
      fontWeight: Number.parseInt(cs.fontWeight, 10) || 400,
      color: cor,
      bgChain: fundo,
    });
  }

  return {
    doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    buttons: botoes,
    icons: icones,
    texts: textos,
    wraps,
  };
};

// --- baseline -----------------------------------------------------------

function lerBaseline() {
  if (!fs.existsSync(BASELINE)) return { conhecidos: [] };
  try {
    const bruto = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    return { conhecidos: Array.isArray(bruto.conhecidos) ? bruto.conhecidos : [] };
  } catch {
    return { conhecidos: [] };
  }
}

function gravarBaseline(achados) {
  const conhecidos = [...new Set(achados.map(fingerprint))].sort();
  fs.writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comentario:
          "Achados conhecidos do gate de runtime. Achado novo reprova; achado desta lista nao. " +
          "Regrave com `npm run ui:runtime -- --update-baseline` SO depois de conferir o que entrou.",
        _atualizadoEm: new Date().toISOString().slice(0, 10),
        conhecidos,
      },
      null,
      2
    ) + "\n"
  );
  return conhecidos.length;
}

// --- principal ----------------------------------------------------------

function naoVerificado(motivo, detalhes, exigir) {
  console.log("\n================ NAO VERIFICADO ================");
  console.log(motivo);
  for (const linha of detalhes) console.log("  - " + linha);
  console.log(
    "\nO gate de runtime NAO rodou. Isso nao e um PASS: nada foi medido.\n" +
      "Para instalar o navegador (fora do CI, que nao tem um garantido):\n" +
      "  npx playwright install chromium\n" +
      "Ou aponte um binario existente: --chromium <caminho> / CHROME_PATH=<caminho>\n" +
      "================================================\n"
  );
  process.exit(exigir ? 1 : 0);
}

async function principal() {
  let op;
  try {
    op = lerArgs(process.argv.slice(2));
  } catch (e) {
    console.error(String(e.message));
    console.error(AJUDA);
    process.exit(2);
    return;
  }
  if (op.ajuda) {
    console.log(AJUDA);
    return;
  }

  const pw = await resolverPlaywright(op.playwright);
  if (!pw.chromium) {
    naoVerificado("Playwright nao encontrado.", ["candidatos tentados:", ...pw.tentados], op.exigirNavegador);
    return;
  }

  const exe = resolverExecutavel(pw.chromium, op.chromium);
  if (!exe.executavel) {
    naoVerificado(
      `Playwright resolvido em ${pw.origem}, mas nenhum executavel de Chromium foi encontrado.`,
      ["caminhos tentados:", ...exe.tentados],
      op.exigirNavegador
    );
    return;
  }

  console.log(`Playwright: ${pw.origem}`);
  console.log(`Chromium:   ${exe.executavel}`);
  console.log(`Alvo:       ${op.base}`);
  console.log(
    `Matriz:     ${op.rotas.length} rotas x ${op.viewports.join("/")} x ${op.temas.join("/")} = ` +
      `${op.rotas.length * op.viewports.length * op.temas.length} paginas\n`
  );

  const navegador = await pw.chromium.launch({ headless: true, executablePath: exe.executavel });
  const achados = [];
  const naoVerificados = [];
  const falhasDeNavegacao = [];

  try {
    for (const nomeVp of op.viewports) {
      const vp = VIEWPORTS[nomeVp] || { width: Number(nomeVp), height: 900 };
      for (const tema of op.temas) {
        const ctx = await navegador.newContext({ viewport: vp, deviceScaleFactor: 1 });
        try {
          await ctx.request.post(op.base + "/api/auth/login", {
            data: { username: op.usuario, password: op.senha },
          });
        } catch (e) {
          console.error(`  aviso: login falhou (${String(e.message).slice(0, 80)}) — rotas protegidas vao redirecionar`);
        }
        await ctx.addInitScript((t) => {
          try {
            localStorage.setItem("theme", t);
          } catch {
            /* storage bloqueado */
          }
        }, tema);

        const pagina = await ctx.newPage();
        for (const rota of op.rotas) {
          let navegou = true;
          try {
            await pagina.goto(op.base + rota, { waitUntil: "networkidle", timeout: op.timeout });
          } catch {
            navegou = false;
          }
          await pagina.waitForTimeout(op.espera);

          const urlFinal = pagina.url();
          if (urlFinal.includes("/login")) {
            falhasDeNavegacao.push(`${rota} [${nomeVp}/${tema}] redirecionou para login`);
            continue;
          }
          if (!navegou) falhasDeNavegacao.push(`${rota} [${nomeVp}/${tema}] networkidle expirou (medido assim mesmo)`);

          let bruto;
          try {
            bruto = await pagina.evaluate(COLETOR);
          } catch (e) {
            falhasDeNavegacao.push(`${rota} [${nomeVp}/${tema}] coletor falhou: ${String(e.message).slice(0, 80)}`);
            continue;
          }

          const snapshot = { route: rota, viewport: nomeVp, theme: tema, ...bruto };
          const daPagina = analyzeSnapshot(snapshot, { naoVerificados });
          achados.push(...daPagina);
          process.stderr.write(
            `  ${nomeVp}/${tema} ${rota}: ${daPagina.length} achados ` +
              `(${bruto.buttons.length} botoes, ${bruto.icons.length} icones, ${bruto.texts.length} textos, ${bruto.wraps.length} controles icone+texto)\n`
          );
        }
        await ctx.close();
      }
    }
  } finally {
    await navegador.close();
  }

  if (op.json) fs.writeFileSync(op.json, JSON.stringify(achados, null, 1) + "\n");

  if (op.atualizarBaseline) {
    const n = gravarBaseline(achados);
    console.log(`\nbaseline.json regravado com ${n} achados conhecidos.`);
    return;
  }

  const conhecidos = new Set(lerBaseline().conhecidos);
  const novos = achados.filter((a) => !conhecidos.has(fingerprint(a)));
  const jaConhecidos = achados.length - novos.length;

  console.log("\n=============== GATE DE RUNTIME ================");
  console.log(`achados totais: ${achados.length} (novos: ${novos.length}, no baseline: ${jaConhecidos})`);
  console.log(`nao verificados: ${naoVerificados.length} (fundo irresoluvel ou tamanho ambiguo — o gate se cala em vez de errar)`);
  if (falhasDeNavegacao.length) {
    console.log(`\npaginas com problema de navegacao: ${falhasDeNavegacao.length}`);
    for (const f of falhasDeNavegacao.slice(0, 20)) console.log("  - " + f);
  }
  console.log(formatReport(novos));
  console.log("\n================================================");

  if (novos.length > 0) {
    console.log(
      "REPROVOU. Corrija, ou — se o achado for aceito conscientemente — rode\n" +
        "  npm run ui:runtime -- --update-baseline\n"
    );
    process.exit(1);
  }
  console.log("OK — nenhum achado novo alem do baseline.\n");
}

principal().catch((e) => {
  console.error(e);
  process.exit(2);
});
