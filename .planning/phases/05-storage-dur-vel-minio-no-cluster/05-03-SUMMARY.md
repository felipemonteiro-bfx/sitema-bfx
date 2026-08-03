---
phase: 05-storage-dur-vel-minio-no-cluster
plan: 03
subsystem: storage
tags: [minio, pdf-lib, next-image, logo-loader, vitest, tdd]

requires:
  - "src/lib/storage-policy.ts — ehUrlAbsoluta, resolverOrigemLogo, extensaoLogo (plano 05-01)"
  - "src/lib/logo-loader.ts — carregarLogo() (plano 05-01)"
provides:
  - "src/lib/logo-loader.ts — embedLogoNoPdf(pdf, logoPath) — unico ponto de embed de logo (e imagem de produto) em PDF"
  - "src/lib/storage-policy.ts — logoSrcParaBrowser(logoPath) — unico ponto de resolucao de src de navegador para o logo"
affects: [05-04]

actuals:
  tokens: 27000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "embedLogoNoPdf reutilizado tanto para a logo quanto para imagens de produto no catalogo (mesmo formato de path: URL absoluta MinIO ou legado /uploads/...)"
    - "vi.doMock + vi.resetModules (nao hoisted) para mockar um modulo apenas em parte de um arquivo de teste, quando outro describe no mesmo arquivo precisa da implementacao real do mesmo modulo"

key-files:
  created:
    - src/__tests__/logo-leitores-pdf.test.ts
    - src/__tests__/logo-src-browser.test.ts
  modified:
    - src/lib/logo-loader.ts
    - src/lib/storage-policy.ts
    - src/app/api/recibo/route.ts
    - src/app/api/catalogo/route.ts
    - src/lib/recibo-pdf.ts
    - src/lib/relatorio-mensal-pdf.ts
    - src/components/logo-upload-form.tsx
    - src/components/receipt-preview.tsx
    - src/app/catalogo/page.tsx

key-decisions:
  - "tryLoadImage em catalogo/route.ts tambem carregava a imagem de cada produto (nao so a logo). O plano mandava remove-la por completo; para nao quebrar essa segunda finalidade, o mesmo embedLogoNoPdf(pdf, imgPath) e reutilizado para as imagens de produto — a funcao ja e generica (qualquer path/URL -> bytes -> PDFImage), sem imports novos nem duplicacao."
  - "O teste de embedLogoNoPdf mocka fetch/fs.readFile (dependencias reais de carregarLogo), nao carregarLogo diretamente — carregarLogo e embedLogoNoPdf vivem no mesmo arquivo (logo-loader.ts) e mockar uma chamada interna ao outro export do MESMO modulo nao e interceptado pelo vi.mock do vitest/vite-node (self-reference ESM). Mockar fetch/readFile exercita o mesmo comportamento observavel dos 6 casos pedidos pelo plano."
  - "O bloco de teste de gerarRelatorioMensalPdf usa vi.doMock (nao hoisted) + vi.resetModules + import dinamico, em vez de vi.mock de topo de arquivo — vi.mock seria hoisted acima do import estatico de embedLogoNoPdf usado pelo describe anterior, substituindo a implementacao real por um mock vazio e quebrando os 6 primeiros testes."

requirements-completed: [STO-05]

coverage:
  - id: D1
    description: "Os quatro geradores de PDF (recibo/route.ts, catalogo/route.ts, recibo-pdf.ts, relatorio-mensal-pdf.ts) embutem a logo tanto com URL absoluta quanto com caminho legado, via um unico helper embedLogoNoPdf"
    requirement: "STO-05"
    verification:
      - kind: unit
        ref: "src/__tests__/logo-leitores-pdf.test.ts — describe(embedLogoNoPdf): 6 casos (png/jpg/legado-jpeg/fetch-not-ok/extensao-desconhecida/embedPng-lancando)"
        status: unknown
      - kind: grep
        ref: "sh -c das 3 tasks do plano — ROTAS_PDF_OK, LEITORES_PDF_OK: rodaram localmente e passaram"
        status: pass
    human_judgment: true
    rationale: "vitest nao roda localmente nesta maquina (sem node_modules, Yarn PnP desatualizado — ver environment_constraints). Os grep gates estruturais (ROTAS_PDF_OK, LEITORES_PDF_OK) confirmam que nenhum dos 4 geradores resolve mais caminho local via process.cwd e que todos usam embedLogoNoPdf; a suite vitest completa (comportamento real do helper e da geracao de PDF) e o gate do CI."
  - id: D2
    description: "gerarRelatorioMensalPdf recebe logoPath em qualquer formato e repassa a embedLogoNoPdf sem alterar; null nao aciona o helper"
    requirement: "STO-05"
    verification:
      - kind: unit
        ref: "src/__tests__/logo-leitores-pdf.test.ts — describe(gerarRelatorioMensalPdf - logo): 3 casos (url, legado, null)"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente — suite vitest e o gate do CI. A logica de guard (if (logoPath) ... else nao chama o helper) foi revisada manualmente no diff."
  - id: D3
    description: "logoSrcParaBrowser corrige o bug de src invalido em logo-upload-form.tsx e e usado pelos 3 componentes que renderizam a logo no navegador"
    requirement: "STO-05"
    verification:
      - kind: unit
        ref: "node --input-type=module one-liner (identico ao <verify> do plano) — imprimiu BROWSER SRC OK"
        status: pass
      - kind: unit
        ref: "src/__tests__/logo-src-browser.test.ts — 5 casos (https, http, legado-com-barra, legado-sem-barra, vazio)"
        status: unknown
      - kind: grep
        ref: "sh -c do plano — COMPONENTES_OK: rodou localmente e passou; grep -c \"^import\" storage-policy.ts confirmado 0"
        status: pass
    human_judgment: false
    rationale: "storage-policy.ts e modulo puro (zero imports), executavel diretamente com node --input-type=module fora do bundler — o one-liner do plano rodou e confirmou o comportamento real (nao so a estrutura)."

duration: 35min
completed: 2026-08-03
status: complete
---

# Phase 5 Plan 3: Leitores da logo — 4 geradores de PDF + 3 pontos de renderizacao no navegador Summary

**Um unico helper `embedLogoNoPdf` (em `logo-loader.ts`) substitui a leitura manual de arquivo local nos quatro geradores de PDF, e um unico helper `logoSrcParaBrowser` (em `storage-policy.ts`) corrige o bug de `src` invalido e centraliza a resolucao de URL absoluta vs. caminho legado nos tres componentes que renderizam a logo no navegador.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-03 (apos 05-01 completo)
- **Completed:** 2026-08-03
- **Tasks:** 3/3
- **Files modified:** 9 (2 criados em `src/lib`/`src/components` inalterados em contagem, 2 testes novos, 9 arquivos de producao/teste no total conforme frontmatter)

## Accomplishments

- `embedLogoNoPdf(pdf, logoPath)` em `src/lib/logo-loader.ts` — carrega via `carregarLogo()` (ja tratava URL absoluta e caminho legado desde o plano 05-01) e embute com `embedPng`/`embedJpg` conforme a extensao; qualquer falha (carregamento, extensao desconhecida, ou o proprio embed lancando) devolve `null`.
- `src/app/api/catalogo/route.ts`: `tryLoadImage` removida por completo. A logo do cabecalho e as imagens de cada produto passam a usar `embedLogoNoPdf` — a mesma funcao serve aos dois casos porque ambos compartilham o formato (URL absoluta do MinIO ou caminho legado).
- `src/app/api/recibo/route.ts`: bloco manual de `readFile` + `embedPng`/`embedJpg` substituido por uma chamada a `embedLogoNoPdf`, preservando a altura 44 e o fallback textual "BFX Manager".
- `src/lib/recibo-pdf.ts` e `src/lib/relatorio-mensal-pdf.ts`: mesma migracao, preservando as alturas 50 e 40 respectivamente. `relatorio-mensal-pdf.ts` teve o tipo de `logoImage` ampliado para `PDFImage` (antes so aceitava `.png`; agora aceita `.jpg`/`.jpeg` tambem, herdado do helper compartilhado).
- `logoSrcParaBrowser(logoPath)` em `src/lib/storage-policy.ts` (modulo continua com **zero imports**) — URL absoluta devolvida intacta; caminho legado ganha barra inicial se ausente; vazio devolve vazio.
- `src/components/logo-upload-form.tsx`: corrigido o bug real — a montagem antiga prefixava uma barra em qualquer valor sem barra inicial, transformando a URL absoluta em `/http://...` (caminho relativo invalido). Agora usa `logoSrcParaBrowser`.
- `src/components/receipt-preview.tsx` e `src/app/catalogo/page.tsx`: aplicam `logoSrcParaBrowser` e ganham `unoptimized` no `Image` (a logo e servida por URL absoluta do proprio Ingress; o otimizador do Next nao traria ganho real).
- Dois arquivos de teste novos: `logo-leitores-pdf.test.ts` (embedLogoNoPdf: 6 casos; gerarRelatorioMensalPdf: 3 casos) e `logo-src-browser.test.ts` (logoSrcParaBrowser: 5 casos).

## Task Commits

Each task was committed atomically:

1. **Task 1: Helper unico de embed em PDF e migracao das duas rotas de API** - `c699cfc` (feat)
2. **Task 2: Migracao dos dois geradores de PDF em src/lib** - `77e43f9` (test)
3. **Task 3: Renderizacao da logo no navegador (previa, catalogo, recibo)** - `a9767b6` (fix)

## Files Created/Modified

- `src/lib/logo-loader.ts` - `embedLogoNoPdf(pdf, logoPath)`: unico ponto de embed em PDF, usado pelos 4 geradores e pelas imagens de produto do catalogo
- `src/lib/storage-policy.ts` - `logoSrcParaBrowser(logoPath)`: unico ponto de `src` de navegador; modulo permanece 100% puro (zero imports)
- `src/app/api/catalogo/route.ts` - Remove `tryLoadImage`; logo e imagens de produto via `embedLogoNoPdf`
- `src/app/api/recibo/route.ts` - Bloco manual de logo substituido por `embedLogoNoPdf`
- `src/lib/recibo-pdf.ts` - Idem, preserva `logoHeight = 50`
- `src/lib/relatorio-mensal-pdf.ts` - Idem, preserva altura 40; tipo `logoImage` ampliado para `PDFImage`
- `src/components/logo-upload-form.tsx` - Corrige o bug de `src` invalido usando `logoSrcParaBrowser`
- `src/components/receipt-preview.tsx` - Usa `logoSrcParaBrowser`, ganha `unoptimized`
- `src/app/catalogo/page.tsx` - Usa `logoSrcParaBrowser`, ganha `unoptimized`
- `src/__tests__/logo-leitores-pdf.test.ts` - `embedLogoNoPdf` (6 casos) + `gerarRelatorioMensalPdf` (3 casos)
- `src/__tests__/logo-src-browser.test.ts` - `logoSrcParaBrowser` (5 casos)

## Decisions Made

- **Reuso de `embedLogoNoPdf` para imagens de produto no catalogo** (Rule 1 — bug fix nao previsto explicitamente no texto da action, mas necessario): `tryLoadImage` em `catalogo/route.ts` tinha DUAS finalidades — embutir a logo do cabecalho E embutir a imagem de cada produto na lista (`produto.imagem`, linha ~113 do arquivo original). O plano instruiu remover `tryLoadImage` por completo e usar `embedLogoNoPdf` so para a logo; seguir isso ao pe da letra sem tratar a segunda finalidade quebraria a renderizacao de imagem de produto no catalogo (a variavel/funcao deixaria de existir). Como `embedLogoNoPdf` e generica o bastante (qualquer path/URL vira bytes vira `PDFImage`), ela foi reutilizada tambem para `imgPath` — sem introduzir nenhum helper novo, sem imports adicionais, e satisfazendo o grep do `<verify>` do plano (que exige zero ocorrencias de `process.cwd` e zero ocorrencias de `tryLoadImage` no arquivo inteiro).
- **Estrategia de teste para `embedLogoNoPdf`**: como `carregarLogo` e `embedLogoNoPdf` vivem no mesmo arquivo (`logo-loader.ts`), mockar `carregarLogo` para testar `embedLogoNoPdf` nao funciona de forma confiavel no vitest/vite-node (chamada interna a outro export do MESMO modulo nao passa pela camada de mock — limitacao conhecida de self-reference em ESM). O teste mocka as dependencias reais e externas de `carregarLogo` (`global.fetch` para o ramo URL, `fs/promises.readFile` para o ramo legado), exercitando o comportamento observavel identico aos 6 casos descritos no plano (chamadas a `embedPng`/`embedJpg`, e `null` em cada caso de falha).
- **Isolamento de mock no mesmo arquivo de teste**: o bloco de `gerarRelatorioMensalPdf` precisa mockar `@/lib/logo-loader` (modulo externo ao arquivo sob teste, mock legitimo), mas isso nao pode usar `vi.mock` de topo de arquivo — o hoisting do vitest executaria esse mock ANTES do `import { embedLogoNoPdf }` estatico usado pelo describe anterior, substituindo a implementacao real por um mock vazio e quebrando os 6 primeiros testes silenciosamente. Resolvido com `vi.doMock` (nao hoisted) + `vi.resetModules()` + import dinamico, isolado dentro do describe de `gerarRelatorioMensalPdf`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `tryLoadImage` tambem carregava imagem de produto no catalogo, nao so a logo**
- **Found during:** Task 1
- **Issue:** O plano instruiu remover `tryLoadImage` por completo, mas essa funcao local em `catalogo/route.ts` era chamada em dois lugares: para a logo do cabecalho (`cfg.logoPath`) e para a imagem de cada produto (`produto.imagem`). Remove-la sem substituir o segundo uso quebraria a renderizacao de imagem de produto no PDF do catalogo publico.
- **Fix:** Reutilizado `embedLogoNoPdf(pdf, imgPath)` tambem para as imagens de produto — a funcao ja e generica o suficiente (qualquer path/URL -> bytes -> `PDFImage`), sem introduzir helper novo nem imports adicionais.
- **Files modified:** `src/app/api/catalogo/route.ts`
- **Commit:** `c699cfc`

Nenhum outro desvio alem do documentado acima — as demais decisoes (estrategia de teste) sao detalhes de implementacao delegados a "Claude's Discretion" em `05-CONTEXT.md` ("estrutura dos testes"), nao mudancas de escopo ou comportamento de producao.

## Issues Encountered

- Confirmado (como o plano ja antecipava): `npx vitest run` nao roda nesta maquina (Yarn PnP sem `node_modules`, `npm install` proibido). Os dois arquivos de teste novos foram escritos seguindo TDD e ficam como gate do CI (`.github/workflows/ci.yml`). A verificacao local possivel — os `sh -c` de grep estrutural das 3 tasks (`ROTAS_PDF_OK`, `LEITORES_PDF_OK`, `COMPONENTES_OK`) e o one-liner `node --input-type=module` de `logoSrcParaBrowser` (`BROWSER SRC OK`) — rodou com sucesso nas tres tasks.
- Nao foi possivel executar os testes vitest (`describe(embedLogoNoPdf)`, `describe(gerarRelatorioMensalPdf - logo)`, `describe(logoSrcParaBrowser)`) localmente para confirmar que passam de fato; a analise manual do codigo e da logica de mock foi feita com cuidado (documentada em "Decisions Made" acima), mas a confirmacao final e do CI.

## Known Stubs

Nenhum. Os quatro geradores de PDF e os tres componentes de navegador tem um caminho de dados real (nao ha valor hardcoded vazio nem placeholder) — a logo e sempre tratada como opcional (comportamento ja existente antes deste plano), nao como stub.

## User Setup Required

None — nenhuma configuracao externa nova requerida por este plano.

## Next Phase Readiness

- STO-05 (leitores de logo tratando os dois formatos) esta implementado nos 4 geradores de PDF e nos 3 pontos de renderizacao no navegador, dependendo apenas do contrato ja fechado pelo plano 05-01 (`Config.logoPath` como URL absoluta ou caminho legado).
- Bloqueador remanescente para validacao end-to-end real (imagens de fato carregando de um MinIO real em producao): depende do plano 05-02 (infraestrutura do MinIO no cluster) e da suite vitest completa rodando no CI, que ainda nao foi confirmada localmente nesta maquina.
- Plano 05-04 (proximo da fase) pode assumir que `embedLogoNoPdf` e `logoSrcParaBrowser` sao os unicos pontos de leitura da logo em todo o sistema — nao ha mais nenhuma resolucao de caminho local (`process.cwd`) duplicada em geradores de PDF ou componentes.

---
*Phase: 05-storage-dur-vel-minio-no-cluster*
*Completed: 2026-08-03*

## Self-Check: PASSED

Todos os 11 arquivos de codigo/teste (2 modulos, 4 geradores de PDF, 3 componentes, 2 testes) e o proprio SUMMARY.md foram confirmados presentes no filesystem; os 3 hashes de commit (`c699cfc`, `77e43f9`, `a9767b6`) foram confirmados presentes em `git log --oneline --all`.
