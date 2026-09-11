# Planilha de controle (.xlsx) — SUMMARY

Data: 2026-09-11 · Spec: `SPEC.md` (nesta pasta) · Design aprovado no artifact v7 (sem cargo e secretaria)

## Entregue

- Botão **"Baixar planilha de controle"** no card da fila (`/prudent`) → popover com meses de
  desconto, empresa, "Incluir meses que já passaram", resumo contado no servidor
  (`resumoPlanilhaControleAction`) e **Baixar .xlsx** (fetch + blob; erro vira aviso, sem sair da tela).
- `GET /api/relatorios/controle-xlsx` (só admin): `.xlsx` de verdade, uma aba por mês de desconto
  ("SETEMBRO 2026"), um bloco por empresa ("DESCONTOS EM FOLHA {EMPRESA} - AF/BFX"), as colunas da
  planilha da equipe, status ANTECIPAÇÃO OK / À VENCER / VENCIDA - CONFERIR REPASSE, coluna K com os
  antecipados e a soma `=SUM` em amarelo mesclada em 2 linhas.
- Formato medido na aba AGOSTO 2026 da planilha da equipe: título Calibri 28 negrito #92D050 mesclado
  A:I (altura 36), cabeçalho negrito, borda fina, datas do Excel (formato 14), R$ contábil, parcela
  como texto, larguras de coluna iguais, zoom 80%.
- Sem dependência nova: `src/lib/xlsx/zip.ts` (zip com `node:zlib` + CRC-32) e
  `src/lib/xlsx/planilha-controle-xlsx.ts` (Office Open XML). Modelo puro em `src/lib/planilha-controle.ts`.

## Verificação

- TDD: 4 arquivos de teste no RED (módulos inexistentes); GREEN com 43 testes em 5 arquivos.
- Amostra gerada e validada: `unzip -t` sem erro, as 11 partes XML bem-formadas no `xmllint`,
  miniatura do Quick Look com a faixa verde, bordas e cabeçalho em negrito.
- Suíte completa: 1.248 testes passando (Uber só no CI); `tsc`, `eslint`, `cores:check`,
  `contraste:check`, `escala:check`, `jsx:check` e detector de design OK.
- Revisão por subagente — aplicado: filtro de empresa sem diferenciar maiúsculas (e opções sem
  repetir no popover), download por fetch em vez de navegar para a rota, mês "8/2026" normalizado
  para "08/2026", U+FFFE/U+FFFF removidos do XML, popover cabendo no celular, testes de rota separados
  (empresa, meses, `passados=0`), teste da ação do resumo, teste do zip conferindo bytes.
- Não aberto no Excel de verdade (não há Excel nesta máquina): conferir o primeiro download.
