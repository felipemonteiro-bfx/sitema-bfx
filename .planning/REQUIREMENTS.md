# Requirements: Sistema BFX

**Defined:** 2026-02-19
**Last milestone update:** 2026-08-03 (v1.2 — Consistencia Visual e UX)
**Core Value:** O PDV deve ser rapido, completo e sem friccao — uma venda com multiplos produtos e parcelamento deve poder ser registrada em segundos.

## v1.2 Requirements — Consistencia Visual e UX

Auditoria tela a tela com a skill `ui-ux-pro-max` como criterio, validada em producao via
Playwright. **24 telas** mapeadas (21 internas + 3 publicas).

### Premissa de escopo — o que esta auditoria NAO e

Nao e um redesign. A skill `ui-ux-pro-max` sugeriu uma paleta propria (azul `#1E40AF` + ambar),
que foi **descartada**: o BFX ja tem identidade (slate + verde) e a paleta oficial da marca
continua bloqueada em UXP-06, aguardando os hex do cliente. O que se aproveita da skill e o
**checklist de qualidade** — acessibilidade, contraste, alvos de toque, foco, consistencia.

### Achados que motivaram o milestone (medidos em 2026-08-03)

- **250 ocorrencias** de cor Tailwind crua (`bg-red-500`, `text-green-600`) em vez dos tokens
  semanticos — violando a propria convencao do projeto, registrada no CLAUDE.md
  ("Design System: usar tokens semanticos do globals.css — sem cores hardcoded").

- Das 39 cores neutras cruas, apenas 13 tem variante `dark:` → **26 pontos que nao se adaptam
  ao tema escuro**. Isso e bug visual, nao preferencia estetica.

- Apenas 2 de 5 botoes `size="icon"` tem `aria-label`.
- O design system ja oferece os tokens necessarios (`success`, `warning`, `error`, `info`, cada
  um com variante `-bg` e `-foreground`) — a migracao e de uso, nao de infraestrutura.

- Concentracao: `bfx-intelligence-panel.tsx` (100), `antecipacao-client.tsx` (48),
  `catalogo-publico-client.tsx` (24) somam 172 das 250 ocorrencias.

### Fundacao (UI)

- [x] **UI-01**: Nenhuma cor Tailwind crua (`bg-*-500`, `text-*-600`) em `src/` — toda cor vem de token semantico
- [x] **UI-02**: Toda tela renderiza corretamente em tema claro e escuro, sem texto ilegivel nem area sem contraste
- [x] **UI-03**: Existe uma regra de lint que barra cor crua, impedindo regressao
- [x] **UI-04**: Todo botao apenas-icone tem `aria-label` descritivo
- [x] **UI-05**: Texto de corpo com contraste minimo 4.5:1 (WCAG AA) nos dois temas
- [x] **UI-06**: Elementos interativos tem estado de foco visivel para navegacao por teclado

### Telas de Operacao (OPE)

- [x] **OPE-01**: `/venda-rapida` — consistencia visual, estados de erro e foco validados
- [x] **OPE-02**: `/historico` — idem, incluindo tabela e filtros
- [x] **OPE-03**: `/cadastros` (4 abas) — idem
- [x] **OPE-04**: `/importacao` e as 2 sub-telas — idem

### Telas Financeiras (FIN)

- [x] **FIN-01**: `/financeiro` (4 abas) — idem, com atencao a leitura de numeros
- [x] **FIN-02**: `/boletos` e `/prudent` — idem
- [x] **FIN-03**: `/relatorios` e `/relatorios/mensais` — idem
- [x] **FIN-04**: `/comissoes` — idem

### Telas de Dados e IA (DIA)

- [x] **DIA-01**: `/inteligencia` — o arquivo com mais cor crua do projeto (100 ocorrencias)
- [x] **DIA-02**: `/crm` e as 3 sub-telas — idem

### Telas de Sistema e Publicas (SIS)

- [x] **SIS-01**: `/dashboard` — idem
- [x] **SIS-02**: `/configuracoes` (5 abas) e `/perfil` — idem
- [x] **SIS-03**: `/gestao-rh` — idem
- [x] **SIS-04**: Telas publicas (`/login`, `/catalogo`, `/assinatura/[token]`) — idem

## Pendencias herdadas do v1.1 (bloqueadas em terceiros)

- [ ] **UXP-06**: Paleta oficial da marca BFX aplicada aos tokens (bloqueado: hex nao fornecidos)
- [ ] **INT-01**: Cotacao Uber ativa em producao (bloqueado: credenciais `UBER_*` no AWS SSM)

## Backlog

### Bugs latentes identificados

- **BUG-01**: `src/app/(app)/venda-rapida/actions.ts` debita estoque com `updateMany({ where: { nome } })`, atingindo todos os produtos homonimos. Ha produtos com estoque negativo (-3, -2) e 115 itens zerados em producao — possivelmente relacionado.
- **BUG-02**: Drift entre a tag de imagem em `deploy/bfx/app.yaml` e `newTag` em `kustomization.yaml`.
- **PDV-05 / PDV-06**: Desconto % por item no PDV.

### Infraestrutura

- **INFRA-01**: `database is locked` intermitente no dqlite do microk8s. Diagnostico e comandos em `deploy/bfx/README.md`; correcao exige acesso ao host.
- **INFRA-02**: `vke-router` do Tailscale offline quebra a resolucao DNS de `*.softlive.dev`.
- **INFRA-03**: `rh-dev` e `site` falham no `pg_dumpall` do backup diario.

### Modulo de Compras / Relatorios Avancados

- **COMP-01..03**, **REL-01..03** — ver historico do v1.0.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Redesign / troca de paleta | O sistema tem identidade propria; a paleta da marca depende dos hex oficiais (UXP-06) |
| Trocar shadcn/ui por outra biblioteca | 34 componentes ja padronizados; custo sem beneficio |
| Reescrever telas do zero | A auditoria corrige consistencia, nao refaz funcionalidade |
| SaaS multi-tenant, app nativo, NF-e | Ver decisoes anteriores |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01..UI-06 | Phase 10 — Fundacao visual | Complete |
| OPE-01..OPE-04 | Phase 11 — Telas de operacao | Complete |
| FIN-01..FIN-04 | Phase 12 — Telas financeiras | Complete |
| DIA-01..DIA-02 | Phase 13 — Telas de dados e IA | Complete |
| SIS-01..SIS-04 | Phase 14 — Telas de sistema e publicas | Complete |

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-08-03 ao iniciar o milestone v1.2*
