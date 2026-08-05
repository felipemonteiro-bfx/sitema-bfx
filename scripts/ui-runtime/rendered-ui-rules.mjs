// Gate de runtime — CAMADA PURA.
//
// Recebe um snapshot serializavel do que um navegador renderizou e devolve
// achados. Zero dependencia externa, zero DOM: roda no `vitest` do projeto, que
// e `environment: "node"`.
//
// Por que existe: as catracas do BFX (`raw-color-scan`, `token-contrast`,
// ESLint) auditam TOKEN e CODIGO-FONTE. Nenhuma delas ve PIXEL. Um
// `<Trash2 className="h-3 w-3" />` se le como 12px em qualquer revisao de diff
// e renderiza 16px, porque `[&_svg]:size-4` na base do `buttonVariants` tem
// especificidade maior. Quatro fases de revisao nao pegaram isso; so
// `getBoundingClientRect()` pega.
//
// As cinco afirmacoes:
//   (a) CONTRAST      — razao WCAG de cada texto/icone contra o FUNDO EFETIVO,
//                       subindo a cadeia de ancestrais e compondo alfa.
//   (b) BUTTON_OVERFLOW — `button.scrollWidth <= button.clientWidth`.
//   (c) ICON_SIZE     — tamanho renderizado do <svg> == tamanho declarado.
//   (d) DOC_OVERFLOW  — `document.scrollWidth <= document.clientWidth`.
//   (e) CONTENT_WRAP  — icone e texto no MESMO controle ficam na MESMA linha.
//
// A regra (e) existe porque as outras quatro eram cegas para o defeito que o
// dono do sistema enxerga: conteudo de botao quebrando em duas linhas. Isso
// aumenta a ALTURA, nao a largura — `scrollWidth > clientWidth` nunca ia pegar.
//
// O navegador so COLETA (cores ja convertidas para sRGB pelo proprio motor
// dele, via canvas — e assim que `lab()`, `oklch()` e `color(srgb ...)` sao
// resolvidos sem reimplementar conversao de espaco de cor). Quem JULGA e este
// modulo. Essa separacao e o que torna o gate testavel sem navegador.
//
// Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui —
// so `.split()`, `.startsWith()`, `.endsWith()` e `.includes()`.

export const LIMITES = {
  /** WCAG 2.x AA para texto de corpo. */
  textoMinimo: 4.5,
  /** WCAG 2.x AA para texto grande (>= 24px, ou >= 18.66px em negrito). */
  textoGrandeMinimo: 3,
  /** WCAG 2.1 SC 1.4.11 — objeto grafico (icone). */
  iconeMinimo: 3,
  /** Arredondamento de layout: abaixo disso nao e defeito, e sub-pixel. */
  toleranciaIconePx: 0.5,
  /** Idem para scrollWidth/clientWidth, que sao inteiros arredondados. */
  toleranciaOverflowPx: 1,
  /**
   * Tamanho que um `<svg>` sem classe de tamanho deve herdar quando esta
   * dentro de um controle — e o `size-4` da base do `buttonVariants`.
   */
  padraoDeIconeEmBotaoPx: 16,
  /** Texto grande a partir daqui. */
  textoGrandePx: 24,
  /** Texto grande em negrito a partir daqui. */
  textoGrandeNegritoPx: 18.66,
  /**
   * Desalinhamento vertical entre o centro do icone e o centro da linha de
   * texto acima do qual consideramos que estao em linhas diferentes. Folga
   * generosa: `items-center` com fontes de tamanhos diferentes desloca o
   * centro em 1-2px sem que nada tenha quebrado.
   */
  toleranciaDesalinhoPx: 3,
};

const REM_EM_PX = 16;

// --- cor ----------------------------------------------------------------

function canalLinear(valor) {
  const v = valor / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Luminancia relativa WCAG de um sRGB 0-255. */
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb;
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

/** Razao de contraste WCAG 2.x entre dois sRGB opacos. */
export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const claro = Math.max(l1, l2);
  const escuro = Math.min(l1, l2);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Compoe `frente` (com alfa) sobre `fundo` (opaco). Devolve sRGB opaco. */
export function compositeOver(frente, fundo) {
  const a = frente[3];
  return [
    frente[0] * a + fundo[0] * (1 - a),
    frente[1] * a + fundo[1] * (1 - a),
    frente[2] * a + fundo[2] * (1 - a),
  ];
}

function normalizarCamada(bruto) {
  if (!bruto) return null;
  if (Array.isArray(bruto)) {
    if (bruto.length < 4) return null;
    return { rgba: bruto, hasImage: false };
  }
  if (Array.isArray(bruto.rgba)) {
    return { rgba: bruto.rgba, hasImage: Boolean(bruto.hasImage) };
  }
  return null;
}

/**
 * Fundo efetivo de um elemento: sobe a cadeia (elemento primeiro, raiz por
 * ultimo) ate achar a primeira camada opaca e compoe de volta tudo que estava
 * por cima.
 *
 * Devolve `{ resolved: false }` — e NENHUM achado e emitido — quando ha
 * `background-image` no caminho (gradiente, imagem) ou quando a cadeia acaba
 * sem opacidade. Preferimos deixar de acusar a acusar errado: um gate que
 * mente perde a confianca de quem o le, e ai ninguem mais roda.
 */
export function effectiveBackground(chain) {
  const camadas = [];
  for (const bruto of chain || []) {
    const camada = normalizarCamada(bruto);
    if (!camada) {
      return { rgb: [255, 255, 255], resolved: false, motivo: "camada de fundo invalida" };
    }
    if (camada.hasImage) {
      return { rgb: [255, 255, 255], resolved: false, motivo: "background-image no caminho" };
    }
    camadas.push(camada.rgba);
    if (camada.rgba[3] >= 0.999) {
      let base = [camada.rgba[0], camada.rgba[1], camada.rgba[2]];
      for (let i = camadas.length - 2; i >= 0; i -= 1) {
        base = compositeOver(camadas[i], base);
      }
      return { rgb: base, resolved: true };
    }
  }
  return { rgb: [255, 255, 255], resolved: false, motivo: "cadeia sem fundo opaco" };
}

// --- tamanho declarado de icone ----------------------------------------

const PREFIXOS_TAMANHO = ["size-", "h-", "w-"];

/** `4` -> 16, `3.5` -> 14, `px` -> 1. Devolve `null` para o que nao e fixo. */
function valorDaEscala(resto) {
  if (resto === "px") return 1;
  if (resto === "full" || resto === "auto" || resto === "screen" || resto === "min" || resto === "max" || resto === "fit") {
    return null;
  }
  if (resto.startsWith("[") && resto.endsWith("]")) {
    const dentro = resto.slice(1, -1);
    if (dentro.endsWith("rem")) {
      const n = Number.parseFloat(dentro.slice(0, -3));
      return Number.isFinite(n) ? n * REM_EM_PX : null;
    }
    if (dentro.endsWith("px")) {
      const n = Number.parseFloat(dentro.slice(0, -2));
      return Number.isFinite(n) ? n : null;
    }
    return null; // em, %, calc(), var() — nao afirmamos nada
  }
  const n = Number.parseFloat(resto);
  if (!Number.isFinite(n) || String(n) !== resto) return null;
  return n * 4;
}

/**
 * Le a classe de um `<svg>` e devolve o tamanho que ela DECLARA, em px.
 *
 * `ambiguous: true` quando existe classe de tamanho atras de prefixo
 * responsivo/estado (`sm:h-5`, `dark:size-6`): o que vale depende do viewport e
 * do estado, entao o gate se cala em vez de errar.
 *
 * Devolve `null` quando nao ha nenhuma declaracao de tamanho — nesse caso o
 * icone herda o padrao do `buttonVariants` e nao ha nada a conferir.
 */
export function parseDeclaredIconSize(classAttr) {
  const classes = String(classAttr || "").split(/\s+/).filter(Boolean);
  let width = null;
  let height = null;
  let ambiguous = false;
  const fontes = [];

  for (const classe of classes) {
    const temPrefixo = classe.includes(":");
    const base = temPrefixo ? classe.slice(classe.lastIndexOf(":") + 1) : classe;
    const semNegativo = base.startsWith("-") ? base.slice(1) : base;

    // `startsWith` e proposital: `max-h-4` e `min-h-4` NAO comecam com `h-`,
    // entao ficam de fora sozinhos — nao sao tamanho intrinseco do icone.
    const prefixo = PREFIXOS_TAMANHO.find((p) => semNegativo.startsWith(p));
    if (!prefixo) continue;

    const valor = valorDaEscala(semNegativo.slice(prefixo.length));
    if (valor === null) continue;

    if (temPrefixo) {
      ambiguous = true;
      continue;
    }

    fontes.push(classe);
    if (prefixo === "size-") {
      width = valor;
      height = valor;
    } else if (prefixo === "h-") {
      height = valor;
    } else {
      width = valor;
    }
  }

  if (width === null && height === null) return null;
  return { width, height, ambiguous, sources: fontes };
}

// --- linhas de texto ----------------------------------------------------

/**
 * Agrupa retangulos de nos de texto em LINHAS.
 *
 * O coletor nao pode simplesmente contar retangulos: numa mesma linha visual,
 * um rotulo de 14px e um sufixo de 11px tem `top` diferente por 2-3px e
 * virariam "duas linhas". Agrupamos por proximidade vertical, com limiar
 * proporcional a altura do proprio retangulo.
 *
 * Aceita `[top, height]` ou `{ top, height }`.
 */
export function agruparLinhas(rects, tolerancia = 4) {
  const normalizados = (rects || [])
    .map((r) => (Array.isArray(r) ? { top: r[0], height: r[1] } : r))
    .filter((r) => r && Number.isFinite(Number(r.top)))
    .map((r) => ({ top: Number(r.top), height: Number(r.height) || 0 }))
    .sort((a, b) => a.top - b.top);

  const linhas = [];
  for (const r of normalizados) {
    const ultima = linhas[linhas.length - 1];
    const limite = Math.max(tolerancia, r.height * 0.6);
    if (!ultima || r.top - ultima.top > limite) {
      linhas.push({ top: r.top, bottom: r.top + r.height });
    } else {
      ultima.bottom = Math.max(ultima.bottom, r.top + r.height);
    }
  }
  return {
    tops: linhas.map((l) => l.top),
    centers: linhas.map((l) => (l.top + l.bottom) / 2),
  };
}

// --- as cinco afirmacoes -----------------------------------------------

function fmt(n) {
  return Number(n).toFixed(2);
}

function contexto(snapshot) {
  return {
    route: snapshot.route,
    viewport: String(snapshot.viewport),
    theme: snapshot.theme,
  };
}

function minimoDeContraste(item) {
  if (item.kind === "icon") return LIMITES.iconeMinimo;
  const px = Number(item.fontSizePx) || 0;
  const peso = Number(item.fontWeight) || 400;
  const grande = px >= LIMITES.textoGrandePx || (px >= LIMITES.textoGrandeNegritoPx && peso >= 700);
  return grande ? LIMITES.textoGrandeMinimo : LIMITES.textoMinimo;
}

/**
 * Aplica as quatro regras a um snapshot de uma rota/viewport/tema.
 * Devolve `{ rule, route, viewport, theme, path, detail, measured, expected }[]`.
 */
export function analyzeSnapshot(snapshot, options = {}) {
  const ctx = contexto(snapshot);
  const achados = [];
  const naoVerificados = options.naoVerificados;

  // (d) rolagem horizontal do documento
  const doc = snapshot.doc || {};
  if (Number(doc.scrollWidth) > Number(doc.clientWidth) + LIMITES.toleranciaOverflowPx) {
    achados.push({
      rule: "DOC_OVERFLOW",
      ...ctx,
      path: "document",
      detail: "a pagina rola horizontalmente",
      measured: `scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
      expected: `scrollWidth <= ${doc.clientWidth}`,
    });
  }

  // (b) botao que nao contem o proprio conteudo
  for (const botao of snapshot.buttons || []) {
    const sw = Number(botao.scrollWidth);
    const cw = Number(botao.clientWidth);
    if (cw > 0 && sw > cw + LIMITES.toleranciaOverflowPx) {
      achados.push({
        rule: "BUTTON_OVERFLOW",
        ...ctx,
        path: botao.path,
        detail: `conteudo estoura ${sw - cw}px na horizontal${botao.text ? ` (texto: "${botao.text}")` : ""}`,
        measured: `scrollWidth ${sw} > clientWidth ${cw}`,
        expected: `scrollWidth <= ${cw}`,
      });
    }
    const sh = Number(botao.scrollHeight);
    const ch = Number(botao.clientHeight);
    if (ch > 0 && sh > ch + LIMITES.toleranciaOverflowPx) {
      achados.push({
        rule: "BUTTON_OVERFLOW",
        ...ctx,
        path: botao.path,
        detail: `conteudo estoura ${sh - ch}px na vertical`,
        measured: `scrollHeight ${sh} > clientHeight ${ch}`,
        expected: `scrollHeight <= ${ch}`,
      });
    }
  }

  // (c) icone que nao renderiza o tamanho que declarou
  for (const icone of snapshot.icons || []) {
    const rw = Number(icone.renderedWidth);
    const rh = Number(icone.renderedHeight);
    if (!(rw > 0) || !(rh > 0)) continue; // escondido (scale-0, display:none) — nao ha o que medir

    const declarado = parseDeclaredIconSize(icone.cls);
    if (!declarado) {
      // Icone sem classe de tamanho DENTRO de um botao herda o padrao do
      // `buttonVariants`. Conferir isso nao e zelo: a guarda `:not()` que
      // devolve a palavra final a quem declara o tamanho pode, se mal escrita,
      // casar com o NOME do icone (`lucide-trash-2` contem `h-2`) e derrubar a
      // heranca — o icone cairia nos atributos intrinsecos, 24px, e nenhuma
      // outra regra veria. Fora de botao nao ha padrao a esperar.
      const padrao = Number(options.padraoDeIconeEmBotaoPx ?? LIMITES.padraoDeIconeEmBotaoPx);
      // So dentro de `<button>`/`[role=button]`, que e onde o `buttonVariants`
      // manda. Um `<a>` qualquer nao tem padrao herdado a esperar, e cobrar
      // 16px dele seria acusar errado.
      if (!icone.ownerEhBotao || !icone.ownerPath || !(padrao > 0)) continue;
      if (Math.abs(rw - padrao) <= LIMITES.toleranciaIconePx && Math.abs(rh - padrao) <= LIMITES.toleranciaIconePx) {
        continue;
      }
      achados.push({
        rule: "ICON_SIZE",
        ...ctx,
        path: icone.path,
        detail: `sem classe de tamanho dentro de um controle: deveria herdar o padrao de ${fmt(padrao)}px do buttonVariants`,
        measured: `${fmt(rw)}x${fmt(rh)}`,
        expected: `${fmt(padrao)}x${fmt(padrao)}`,
        owner: icone.ownerPath,
      });
      continue;
    }
    if (declarado.ambiguous) {
      if (naoVerificados) naoVerificados.push({ ...ctx, path: icone.path, motivo: "tamanho atras de prefixo responsivo/estado" });
      continue;
    }

    const divergencias = [];
    if (declarado.width !== null && Math.abs(rw - declarado.width) > LIMITES.toleranciaIconePx) {
      divergencias.push("largura");
    }
    if (declarado.height !== null && Math.abs(rh - declarado.height) > LIMITES.toleranciaIconePx) {
      divergencias.push("altura");
    }
    if (divergencias.length === 0) continue;

    const dw = declarado.width === null ? "?" : fmt(declarado.width);
    const dh = declarado.height === null ? "?" : fmt(declarado.height);
    achados.push({
      rule: "ICON_SIZE",
      ...ctx,
      path: icone.path,
      detail: `declarado ${dw}x${dh} por \`${declarado.sources.join(" ")}\`, diverge em ${divergencias.join(" e ")}`,
      measured: `${fmt(rw)}x${fmt(rh)}`,
      expected: `${dw}x${dh}`,
      owner: icone.ownerPath,
    });
  }

  // (e) icone e texto no mesmo controle, em linhas diferentes
  for (const alvo of snapshot.wraps || []) {
    if (!(Number(alvo.iconCount) > 0)) continue; // texto puro pode e deve quebrar

    // Layouts em que a quebra e intencional, nao defeito: o autor pediu coluna
    // (icone em cima do rotulo) ou permitiu wrap explicitamente.
    const direcao = String(alvo.flexDirection || "row");
    const wrap = String(alvo.flexWrap || "nowrap");
    if (direcao.startsWith("column")) continue;
    if (wrap.startsWith("wrap")) continue;

    const agrupado = Array.isArray(alvo.textRects)
      ? agruparLinhas(alvo.textRects)
      : { tops: alvo.textLineTops || [], centers: alvo.textCenters || [] };

    if (agrupado.tops.length > 1) {
      achados.push({
        rule: "CONTENT_WRAP",
        ...ctx,
        path: alvo.path,
        detail: `texto "${String(alvo.sample || "").slice(0, 32)}" quebrou em ${agrupado.tops.length} linhas ao lado de ${alvo.iconCount} icone(s)`,
        measured: `${agrupado.tops.length} linhas de texto`,
        expected: "1 linha (whitespace-nowrap no container, shrink-0 no icone)",
      });
      continue;
    }

    const centrosTexto = agrupado.centers;
    const centrosIcone = Array.isArray(alvo.iconCenters) ? alvo.iconCenters : [];
    if (centrosTexto.length === 0 || centrosIcone.length === 0) continue;

    const alvoY = centrosTexto[0];
    let pior = 0;
    for (const y of centrosIcone) pior = Math.max(pior, Math.abs(y - alvoY));
    if (pior > LIMITES.toleranciaDesalinhoPx) {
      achados.push({
        rule: "CONTENT_WRAP",
        ...ctx,
        path: alvo.path,
        detail: `icone fora da linha do texto "${String(alvo.sample || "").slice(0, 32)}"`,
        measured: `${fmt(pior)}px de desalinho vertical`,
        expected: `<= ${LIMITES.toleranciaDesalinhoPx}px`,
      });
    }
  }

  // (a) contraste contra o fundo efetivo
  for (const item of snapshot.texts || []) {
    const cor = normalizarCamada({ rgba: item.color });
    if (!cor) continue;
    const fundo = effectiveBackground(item.bgChain);
    if (!fundo.resolved) {
      if (naoVerificados) naoVerificados.push({ ...ctx, path: item.path, motivo: fundo.motivo });
      continue;
    }
    // A propria cor pode ter alfa (ex.: `text-foreground/70`).
    const frente = cor.rgba[3] >= 0.999
      ? [cor.rgba[0], cor.rgba[1], cor.rgba[2]]
      : compositeOver(cor.rgba, fundo.rgb);

    const razao = contrastRatio(frente, fundo.rgb);
    const minimo = minimoDeContraste(item);
    if (razao + 0.005 < minimo) {
      achados.push({
        rule: "CONTRAST",
        ...ctx,
        path: item.path,
        detail:
          item.kind === "icon"
            ? "icone contra o fundo efetivo"
            : `texto "${String(item.sample || "").slice(0, 32)}" (${item.fontSizePx}px/${item.fontWeight})`,
        measured: `${razao.toFixed(2)}:1`,
        expected: `>= ${minimo}:1`,
        frente: frente.map((c) => Math.round(c)),
        fundo: fundo.rgb.map((c) => Math.round(c)),
      });
    }
  }

  return achados;
}

/**
 * Impressao digital estavel de um achado, para o baseline.
 *
 * NAO inclui a medida: o baseline aceita um achado CONHECIDO, nao um numero
 * exato. Se a medida entrasse, qualquer variacao de sub-pixel viraria "achado
 * novo" e o gate soaria alarme falso ate ninguem mais olhar para ele.
 */
export function fingerprint(achado) {
  return [achado.rule, achado.route, achado.viewport, achado.theme, achado.path].join(" | ");
}

/** Agrupa por regra e devolve texto pronto para o terminal. */
export function formatReport(achados) {
  if (achados.length === 0) return "Nenhum achado.";
  const porRegra = new Map();
  for (const a of achados) {
    if (!porRegra.has(a.rule)) porRegra.set(a.rule, []);
    porRegra.get(a.rule).push(a);
  }
  const linhas = [];
  for (const [regra, lista] of porRegra) {
    linhas.push(`\n## ${regra} — ${lista.length}`);
    for (const a of lista) {
      linhas.push(`  ${a.route} [${a.viewport}/${a.theme}] ${a.path}`);
      linhas.push(`    ${a.detail}`);
      linhas.push(`    medido: ${a.measured} | esperado: ${a.expected}`);
    }
  }
  return linhas.join("\n");
}
