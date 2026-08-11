---
phase: quick-260811-coa
plan: 01
subsystem: api
tags: [relatorios, csv, pdf, pdf-lib, prisma, react, shadcn, popover, checkbox]

requires: []
provides:
  - "src/lib/relatorio-vendas-colunas.ts — catalogo unico de 13 colunas (empresa, matricula, nome, produtos, qtd, vendedor, data, valorTotal, parcelas, formaPagamento, status, margemPct, margemConsignavel), com resolverColunas/filtrarColunasPorPerfil/resolverColunasParaExport/cabecalhoCsv/linhaCsv/celulaPdf/calcularLayoutPdf/truncarParaLargura"
  - "CSV e PDF de /api/relatorios/vendas derivando cabecalho, celulas e layout do mesmo catalogo, com selecao de colunas via ?colunas= e fallback seguro ao padrao quando o filtro de perfil esvazia a selecao"
  - "Seletor de colunas (Popover+Checkbox+ScrollArea) em /relatorios"
affects: ["relatorios", "vendas-xlsx (candidato a follow-up, ver Deviations)"]

actuals:
  tokens: 8957
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Catalogo unico tipado estruturalmente (nao pelo tipo gerado do Prisma), consumido por rotas server e componente client sem duplicar import server-only"
    - "Layout de PDF calculado por peso relativo (pesoPdf) em vez de posicoes X literais"
    - "resolverColunasParaExport: resolver+filtrar+fallback numa unica funcao, para as duas rotas nunca divergirem na regra de 'lista vazia' apos o filtro de perfil"

key-files:
  created:
    - src/lib/relatorio-vendas-colunas.ts
    - src/__tests__/relatorio-vendas-colunas.test.ts
  modified:
    - src/app/api/relatorios/vendas/route.ts
    - src/app/api/relatorios/vendas/pdf/route.ts
    - src/components/report-buttons-client.tsx

key-decisions:
  - "itens[].custoProduto tipado como number obrigatorio (nao nullable), espelhando ItemVenda.custoProduto Float NOT NULL do schema real — 0 e o sentinel de 'sem dado de custo', nao null. Testes ajustados para custoProduto:0 em vez de null nos casos 'sem custo'."
  - "Quoting RFC 4180 do CSV passou a ser condicional (aspas so quando ha virgula/aspas/quebra de linha) em vez do padrao fixo antigo (Produtos e Pagamento sempre citados, Nome nunca) — corrige bug real de nome de cliente com virgula deslocando colunas, documentado como mudanca deliberada de comportamento"
  - "Total do rodape do PDF (TOTAL DO PERIODO) continua somando valorTotalVenda(v) diretamente, independente da selecao de colunas — nao fica invisivel se o usuario desmarcar a coluna Valor"
  - "resolverColunasParaExport centraliza resolver+filtrar+fallback: quando o filtro de perfil esvazia a selecao (link so com colunas sensiveis para nao-admin), cai no padrao em vez de devolver relatorio em branco — achado do review por subagente, ver Deviations"

requirements-completed: [QT-260811-coa]

coverage:
  - id: D1
    description: "Selecao de colunas em /relatorios produz CSV com exatamente essas colunas, em ordem canonica"
    requirement: "QT-260811-coa"
    verification:
      - kind: unit
        ref: "src/__tests__/relatorio-vendas-colunas.test.ts#resolverColunas, cabecalhoCsv, linhaCsv"
        status: unknown
    human_judgment: true
    rationale: "vitest nao roda neste ambiente (node_modules ausente, npm install falha por permissao — ver Issues Encountered). Logica foi tracejada manualmente contra cada assercao do teste e bate, mas nao ha 'ultima execucao' real para reportar pass. CI e o gate real; UAT humano do Task 3 tambem cobre isso."
  - id: D2
    description: "PDF baixado traz exatamente as colunas escolhidas, com largura calculada sem sobreposicao"
    requirement: "QT-260811-coa"
    verification:
      - kind: unit
        ref: "src/__tests__/relatorio-vendas-colunas.test.ts#calcularLayoutPdf, truncarParaLargura"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente do D1. Alem disso a renderizacao real via pdf-lib (fontes, medicao de texto) so e confirmavel abrindo o PDF gerado — verificacao visual explicita no <human-check> do plano."
  - id: D3
    description: "Colunas pedidas pelo dono existem no catalogo: empresa, matricula, nome, Margem %, Margem consignavel, valor total, parcelas, forma de pagamento"
    requirement: "QT-260811-coa"
    verification:
      - kind: unit
        ref: "grep de COLUNAS_VENDAS em src/lib/relatorio-vendas-colunas.ts (13 entradas, chaves conferidas manualmente contra a tabela do plano)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Link antigo sem ?colunas= (Exportacao Rapida, link salvo) continua produzindo o relatorio de hoje, header do CSV byte a byte igual"
    requirement: "QT-260811-coa"
    verification:
      - kind: unit
        ref: "src/__tests__/relatorio-vendas-colunas.test.ts#resolverColunas (default) e #cabecalhoCsv do padrao"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente do D1 — asserção 'Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas,Pagamento' confirmada manualmente, mas sem execucao real."
  - id: D5
    description: "Desmarcar todas as colunas desabilita os dois botoes de download"
    requirement: "QT-260811-coa"
    verification: []
    human_judgment: true
    rationale: "Comportamento de UI (disabled={semColunas}) so e confirmavel interagindo com a tela — coberto pelo <human-check> do Task 3."
  - id: D6
    description: "Margem % e Margem consignavel nao saem para quem baixa nao e admin, mesmo pedindo so essas colunas na query string"
    requirement: "QT-260811-coa"
    verification:
      - kind: unit
        ref: "src/__tests__/relatorio-vendas-colunas.test.ts#filtrarColunasPorPerfil, #resolverColunasParaExport"
        status: unknown
    human_judgment: true
    rationale: "Achado critico de seguranca (T-QT-01) — a logica foi revisada manualmente linha a linha contra o middleware E confirmada por um review externo (subagente code-review) que encontrou e cuja correcao aplicamos (ver Deviations: fallback ao padrao quando o filtro zera a selecao). Ainda assim uma checagem de acesso nao deve se apoiar so em leitura de codigo; requer confirmacao via CI ou teste manual com sessao nao-admin antes de considerar fechado."
  - id: D7
    description: "PDF passa a exibir a data da venda em UTC, igual ao CSV e ao /historico"
    requirement: "QT-260811-coa"
    verification: []
    human_judgment: true
    rationale: "Regressao visual de fuso horario (mesma causa do commit d9064ee) — so e confirmavel abrindo o PDF gerado com uma venda perto da virada do dia; coberto pelo <human-check> do Task 3."

duration: 22min
completed: 2026-08-11
status: complete
---

# Quick Task 260811-coa: Seleção de colunas nos relatórios de vendas Summary

**Catálogo único de 13 colunas (`src/lib/relatorio-vendas-colunas.ts`) do qual o CSV e o PDF de `/api/relatorios/vendas` agora derivam cabeçalho, células e layout, com seletor Popover+Checkbox em `/relatorios`, allowlist por `?colunas=`, e fallback seguro ao padrão quando o filtro por perfil zeraria a resposta.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-08-11T13:34:31Z
- **Completed:** 2026-08-11T13:56:00Z (aprox.)
- **Tasks:** 3
- **Files modified:** 5 (2 criados, 3 modificados)

## Accomplishments

- Catálogo único (`COLUNAS_VENDAS`, 13 colunas) elimina a duplicação de lista de colunas entre o endpoint CSV e o endpoint PDF — inclui as colunas pedidas pelo dono (empresa, Margem %, Margem consignável) que hoje não existiam em nenhum dos dois.
- `resolverColunas` com allowlist estrita: parâmetro ausente/vazio/inválido cai no conjunto padrão de 8 colunas, que reproduz byte a byte o header de hoje (D-03); ordem sempre canônica, nunca a ordem digitada (D-04).
- `filtrarColunasPorPerfil` fecha T-QT-01: o middleware só autentica `/api/*`, nunca autoriza por perfil — sem esse filtro qualquer vendedor logado leria custo (margem) e renda do cliente montando a URL na mão.
- `resolverColunasParaExport` (adicionada após o review, ver Deviations) fecha a lacuna que o filtro de perfil sozinho abria: um link `?colunas=margemPct,margemConsignavel` acessado por não-admin agora cai no padrão em vez de gerar um relatório em branco.
- PDF sem nenhuma posição X literal: `calcularLayoutPdf` calcula largura por peso relativo e `truncarParaLargura` corta o texto pela medida real da fonte, em vez dos `substring()` de tamanho fixo de antes.
- Bug de data um dia antes (mesma causa raiz do commit `d9064ee`) corrigido também na rota do PDF: trocado o parse local `new Date(to + "T23:59:59")` por `resolverPeriodo` (fim exclusivo em UTC).
- Bug pré-existente de CSV corrigido: nome de cliente com vírgula deslocava as colunas seguintes porque só Produtos/Pagamento eram citados e Nome nunca — agora quoting RFC 4180 condicional em toda célula.
- Seletor de colunas em `/relatorios` com atalhos "Todas"/"Padrão", contador no gatilho (`Colunas (N)`), e desabilita os dois botões de download quando nada está marcado, com aviso visível em vez de voltar ao padrão em silêncio.

## Task Commits

1. **Task 1 (RED): teste do catálogo de colunas** — `97bc00a` (test)
2. **Task 1 (GREEN): catálogo + CSV ligado de ponta a ponta** — `2763c44` (feat)
3. **Task 2 (RED): teste do layout de PDF** — `37e1e21` (test)
4. **Task 2 (GREEN): layout de PDF calculado a partir das colunas** — `901b17c` (feat)
5. **Task 3: seletor de colunas em `/relatorios`** — `7778c73` (feat)
6. **Pós-review (RED): teste do fallback ao padrão quando o filtro zera a seleção** — `05af32c` (test)
7. **Pós-review (GREEN): `resolverColunasParaExport` com fallback** — `5bdbf6f` (fix)

_Nenhum commit REFACTOR foi necessário nas tasks TDD originais — GREEN já saiu limpo em ambas. O commit 6/7 é o ciclo RED/GREEN do achado de segurança do review por subagente (passo 4 do CLAUDE.md), ver Deviations._

## Files Created/Modified

- `src/lib/relatorio-vendas-colunas.ts` (novo) — catálogo único: tipos (`VendaRelatorio`, `ColunaVenda`, `FaixaPdf`), `COLUNAS_VENDAS`, `COLUNAS_PADRAO`, `COLUNAS_SENSIVEIS`, `resolverColunas`, `filtrarColunasPorPerfil`, `resolverColunasParaExport`, `cabecalhoCsv`, `linhaCsv`, `celulaPdf`, `calcularLayoutPdf`, `truncarParaLargura`
- `src/__tests__/relatorio-vendas-colunas.test.ts` (novo) — suíte TDD das três rodadas (resolução de colunas, formatação CSV/PDF, layout, truncamento, fallback pós-review)
- `src/app/api/relatorios/vendas/route.ts` — CSV derivado do catálogo via `resolverColunasParaExport`; select do Prisma ampliado com `cliente.renda` e `itens.custoProduto`
- `src/app/api/relatorios/vendas/pdf/route.ts` — PDF derivado do catálogo via `resolverColunasParaExport`; período resolvido por `resolverPeriodo`/`fimInclusivoParaInput`; select do Prisma ampliado
- `src/components/report-buttons-client.tsx` — seletor de colunas (Popover/Checkbox/ScrollArea), `?colunas=` no `buildUrl`, botões desabilitados quando nada selecionado

## Decisions Made

- **`itens[].custoProduto` tipado como `number` obrigatório**, não `number | null`, porque `ItemVenda.custoProduto` é `Float` NOT NULL no schema real (`prisma/schema.prisma:215`). O sentinel de "sem dado de custo" é `0`, não `null` — os testes foram ajustados para `custoProduto: 0` nos casos "sem custo" (o plano não especificava a nulabilidade exata do campo).
- **Quoting RFC 4180 do CSV virou condicional** (aspas só quando a célula tem vírgula/aspas/quebra de linha) em vez do padrão fixo de hoje, onde Produtos e Pagamento eram sempre citados e Nome nunca. Isso corrige um bug real — nome de cliente com vírgula deslocava todas as colunas seguintes — mantendo o header idêntico. Documentado no plano como mudança deliberada de comportamento.
- **O total do rodapé do PDF (`TOTAL DO PERÍODO`) continua somando `valorTotalVenda(v)` diretamente**, independente de quais colunas o usuário selecionou — não soma a coluna `valorTotal` do catálogo, para não desaparecer se o usuário desmarcar essa coluna.
- **`MARGEM_CONSIGNAVEL_FATOR = 0.3`** exportado como constante nomeada, com comentário apontando que a mesma regra vive em `src/app/api/clientes/[id]/limite/route.ts` (não unificado nesta task — fora de escopo, só documentado para as duas não divergirem no futuro sem aviso).
- **`resolverColunasParaExport` substitui a composição manual `filtrarColunasPorPerfil(resolverColunas(...))` nas duas rotas** — além de fechar o achado de segurança do review (ver Deviations), reduz a duplicação entre CSV e PDF para essa regra, coerente com D-02 (fonte única de verdade).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `itens[].custoProduto` corrigido para `number` obrigatório (não nullable)**
- **Found during:** Task 1 (desenho do módulo, antes de escrever o teste)
- **Issue:** A tabela do plano não especifica a nulabilidade exata de `itens.custoProduto`; um desenho ingênuo como `number | null` quebraria a assinatura estrutural de `margemVenda`/`custoTotalVenda` em `venda-utils.ts`, que esperam `custoProduto: number` (porque o campo real no Prisma, `ItemVenda.custoProduto`, é `Float` NOT NULL).
- **Fix:** Campo tipado como `number` obrigatório; sentinel de "sem custo" é `0` (consistente com a checagem `i.custoProduto != null && i.custoProduto > 0` já existente em `custoTotalVenda`). Testes que simulavam "sem dado de custo" passaram a usar `custoProduto: 0` em vez de `null`.
- **Files modified:** `src/lib/relatorio-vendas-colunas.ts`, `src/__tests__/relatorio-vendas-colunas.test.ts`
- **Verification:** Rastreamento manual de tipos linha a linha contra `prisma/schema.prisma` e `src/lib/venda-utils.ts` (ver Issues Encountered sobre a impossibilidade de rodar `tsc` neste ambiente).
- **Committed in:** `97bc00a` (teste já nasceu com o tipo corrigido) e `2763c44` (implementação)

**2. [Rule 1 - Bug] Filtro de perfil podia esvaziar a lista de colunas e gerar relatório em branco**
- **Found during:** Review por subagente (`Skill: code-review`, effort high) disparado após a Task 3, sobre o diff completo das três tasks — achado confirmado e aplicado antes do fechamento da task (CLAUDE.md passo 4).
- **Issue:** `resolverColunas(param)` valida `margemPct`/`margemConsignavel` como keys legítimas do catálogo (não caem no fallback de D-03, que só dispara para key *desconhecida*). Um não-admin acessando `GET /api/relatorios/vendas?colunas=margemPct,margemConsignavel` passava pela allowlist normalmente e só depois `filtrarColunasPorPerfil` removia as duas — sobrando lista vazia. `cabecalhoCsv([])`/`linhaCsv([], v)` devolvem `""`, então o CSV baixado virava um bloco de linhas em branco; o PDF equivalente saía com cabeçalho e linhas em branco (`calcularLayoutPdf([], ...)` devolve `[]`). Nenhuma das duas rotas caía no padrão nesse caso.
- **Fix:** Nova função `resolverColunasParaExport(param, ehAdmin)` centraliza resolver + filtrar + fallback: se o resultado após o filtro de perfil ficar vazio, recai em `filtrarColunasPorPerfil(resolverColunas(null), ehAdmin)` — o padrão nunca contém coluna sensível, então esse segundo filtro é só um no-op defensivo, sem reabrir T-QT-01. As duas rotas passaram a chamar essa função única em vez da composição manual anterior.
- **Files modified:** `src/lib/relatorio-vendas-colunas.ts`, `src/app/api/relatorios/vendas/route.ts`, `src/app/api/relatorios/vendas/pdf/route.ts`, `src/__tests__/relatorio-vendas-colunas.test.ts`
- **Verification:** Ciclo RED/GREEN completo (teste simulado manualmente contra a implementação, mesma limitação de ambiente do restante da task — ver Issues Encountered).
- **Committed in:** `05af32c` (RED) e `5bdbf6f` (GREEN)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 — um de tipo antes de virar bug em produção, um de segurança/UX encontrado por review externo e corrigido no mesmo ciclo)
**Impact on plan:** Ambas correções necessárias para o catálogo se comportar como o plano descreve (D-03 "sempre produz o relatório de hoje ou a seleção pedida", nunca um relatório vazio); sem impacto de escopo.

## Issues Encountered

- **`vitest`, `tsc` e `eslint` indisponíveis neste ambiente.** `node_modules/` não existe no checkout (`npm install` falha por permissão, conforme já documentado em `CLAUDE.md`), e não há `typescript`/`eslint` instalados globalmente. Isso é mais forte do que a limitação já conhecida ("testes não rodam localmente") — aqui nem o compilador roda. Registrado como entrada `unrun-verify` (id 7) em `.planning/WINDOWS.md`.
  - **Mitigação aplicada:** verificação manual extensiva substituindo as ferramentas ausentes:
    - Cada asserção da suíte de testes (incluindo a rodada pós-review) foi simulada manualmente contra a implementação — todas batem.
    - Compatibilidade estrutural de tipos conferida campo a campo contra `prisma/schema.prisma` (nulabilidade real de `custoProduto`, `renda`, `status`, `cliente`, etc.) para os dois endpoints e o módulo do catálogo.
    - `npm run cores:check` **foi executado com sucesso** rodando `node scripts/design-tokens/raw-color-scan.mjs src --check` diretamente — esse script não tem dependências externas (só `node:fs`/`node:path`/`node:url`) e passou sem regressão, inclusive após o commit de fallback.
  - **O CI é o gate real** — este SUMMARY não declara "testes passando", apenas "lógica verificada manualmente e sem execução automatizada local disponível". O bloco `coverage` marca `human_judgment: true` em quase todos os itens por essa razão.
- **Revisão por subagente (CLAUDE.md passo 4) disparada em background via `Skill: code-review` (effort high) sobre o diff completo — retornou durante a execução e os findings foram aplicados antes do fechamento.** A skill roda como execução em background/forked; o resultado chegou como notificação assíncrona depois que o Task 3 já estava commitado, então o achado (deviation #2 acima) entrou como um ciclo RED/GREEN adicional em vez de dentro do commit do Task 3. Um segundo achado do mesmo review — cabeçalho da tabela do PDF não é redesenhado em páginas após quebra de página — foi confirmado como **pré-existente** (mesma estrutura já presente no commit `6db8f0c`, antes desta task) e **não foi corrigido**: o plano trava explicitamente "manter o comportamento de quebra de página como está — não é escopo desta task melhorá-lo" (Task 2, ponto 6). Registrado como follow-up (`todo` id 8 em `.planning/WINDOWS.md`).

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Follow-ups registrados (fora do escopo travado desta task)

- **`/api/relatorios/vendas-xlsx` (usado por `/historico`) é candidato a adotar o mesmo catálogo.** Não entrou nesta task porque não é alcançável pela tela `/relatorios` (D-06) e sua ordem de colunas de hoje não é subsequência da ordem canônica — adotá-la mudaria o layout do `/historico`, fora de escopo. O catálogo já inclui as chaves `qtd` e `status` justamente para viabilizar isso depois sem alterar o módulo.
- **T-QT-04 (formula injection no CSV)** — valor de célula começando com `=`, `+`, `-` ou `@` não é neutralizado. Exposição pré-existente, idêntica antes e depois desta task; disposição `accept` no threat model do plano porque corrigir mudaria o conteúdo de células de todos os relatórios (fora do escopo travado, D-06).
- **Cabeçalho da tabela do PDF não é redesenhado após quebra de página** (achado do review por subagente, confirmado pré-existente ao commit `6db8f0c`). Com colunas selecionáveis, admins tendem a escolher mais colunas / períodos maiores, tornando PDFs de múltiplas páginas mais prováveis — páginas 2+ saem sem identificar qual coluna é qual. Fora do escopo travado desta task (plano trava "não é escopo desta task melhorar" a paginação); registrado como `todo` id 8 em `.planning/WINDOWS.md`.

## Next Phase Readiness

- O catálogo (`src/lib/relatorio-vendas-colunas.ts`) está pronto para ser reutilizado por `vendas-xlsx` num follow-up futuro, sem mudança de forma — só depende de decidir se a ordem canônica atual é aceitável para aquela tela.
- **Bloqueador para fechar oficialmente:** UAT manual do `<human-check>` do Task 3 (abrir `/relatorios` como admin, baixar CSV/PDF com seleção parcial, conferir botões desabilitados com seleção vazia, conferir "Exportação Rápida" com as 8 colunas de sempre e data correta, e — novo, por causa do achado do review — conferir com uma sessão não-admin que `?colunas=margemPct,margemConsignavel` cai no relatório padrão em vez de vir em branco) ainda não foi executado nesta sessão — requer navegador/servidor rodando, que não estava disponível neste ambiente de execução autônoma.
- **Commit e push:** todos os commits desta task estão em `nextjs-migration` local; CLAUDE.md exige nunca deixar mudança só local — o push é responsabilidade do orquestrador após a revisão (conforme constraints desta execução).

## Self-Check: PASSED

Todos os arquivos criados/modificados existem no disco e todos os 7 hashes de
commit (`97bc00a`, `2763c44`, `37e1e21`, `901b17c`, `7778c73`, `05af32c`,
`5bdbf6f`) estão presentes em `git log --oneline --all`.

---
*Phase: quick-260811-coa*
*Completed: 2026-08-11*
