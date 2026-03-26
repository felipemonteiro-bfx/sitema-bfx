---
phase: quick-260326-m0e
plan: 3
subsystem: antecipacao
tags: [historico, pdf, relatorio, antecipacao, pdf-lib]
key-files:
  created:
    - src/components/historico-antecipacoes.tsx
    - src/app/api/relatorios/antecipacao-imagem/route.ts
  modified:
    - src/app/(app)/prudent/page.tsx
    - src/components/antecipacao-client.tsx
decisions:
  - PDF retorna inline (Content-Disposition: inline) para visualizacao no browser sem forcar download
  - Altura da pagina PDF calculada dinamicamente baseada no volume de dados para evitar corte de conteudo
  - Filtro de mes/ano no historico derivado dos dados (sem state externo, sem query params)
metrics:
  duration: ~20min
  completed: "2026-03-26"
  tasks: 2
  files: 4
---

# Phase quick-260326-m0e Plan 3: Historico de Antecipacoes e Relatorio Visual PDF

**One-liner:** Historico tabelado de antecipacoes realizadas com filtro por mes + PDF gerado com pdf-lib agrupando parcelas por empresa/mes com CNPJ, contato e totais.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Historico de antecipacoes realizadas | 47a87b6 | historico-antecipacoes.tsx (new), prudent/page.tsx |
| 2 | Gerar imagem/card com dados de antecipacao por empresa/mes | 2b303ca | antecipacao-imagem/route.ts (new), antecipacao-client.tsx |

## What Was Built

### Task 1: HistoricoAntecipacoes Component

- Componente client `src/components/historico-antecipacoes.tsx` com tabela de antecipacoes ja realizadas
- Colunas: Data, Cliente, Empresa, Produto, Valor, Parcelas
- Filtro por mes/ano derivado dos dados com select simples
- Footer com contagem total e valor total das antecipacoes exibidas
- Estado vazio com mensagem "Nenhuma antecipacao realizada ainda."
- `prudent/page.tsx` busca vendas com `antecipada: 1` (top 50 mais recentes) e renderiza o componente abaixo do card principal

### Task 2: Relatorio Visual PDF

- Endpoint GET `/api/relatorios/antecipacao-imagem?ids=1,2,3` usando pdf-lib
- Recebe IDs de vendas, busca dados completos incluindo cliente, itens, parcelasVencimento
- Lookup em EmpresaParceira para obter CNPJ e contato (telefoneRh/emailRh)
- PDF estruturado:
  - Header azul escuro com titulo "RELATORIO DE ANTECIPACAO", data de geracao, total geral
  - Bloco por empresa: nome (bold grande), CNPJ, contato, subtotal empresa
  - Sub-secao por mes: cabecalho com mes/ano e total do mes, tabela de parcelas (numero, vencimento, valor)
  - Footer: "TOTAL GERAL" em fundo azul
  - Altura da pagina calculada dinamicamente
- Botao "Gerar Relatorio Visual" adicionado em `antecipacao-client.tsx` (icone ImageIcon, desabilitado sem selecao, abre em nova aba)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `src/components/historico-antecipacoes.tsx` exists
- [x] `src/app/api/relatorios/antecipacao-imagem/route.ts` exists
- [x] Commits 47a87b6 and 2b303ca exist
- [x] TypeScript check passes (only 2 pre-existing unrelated errors in .next/dev/types/validator.ts)

## Self-Check: PASSED
