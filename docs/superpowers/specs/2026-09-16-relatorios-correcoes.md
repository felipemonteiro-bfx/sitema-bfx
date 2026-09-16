# Relatórios, edição de venda e segurança — correções (2026-09-16)

Origem: pedido do André ("corrija tudo o que achar no caminho") depois da correção do CMV
no DRE. Auditoria por subagente das rotas `src/app/api/relatorios/*` e dos resumos da IA,
mais o que apareceu na edição de venda. Dados de produção conferidos (VKE, 16/09): 169
vendas, todas `ativa`; 547 parcelas, nenhuma `paga`; `whatsapp_auto_inadimplencia = 0`;
nenhum item de venda inválido para as regras da criação.

## Lote 1 — edição de venda e margem

| # | Hoje | Correção |
|---|---|---|
| 1.1 | Abrir a edição de venda com frete/desconto redistribuía as parcelas pela soma só dos itens; salvar sem mexer gravava parcelas que não somam o total (vendas 67, 69, 70, 77, 81, 100, 162, 228). | `EditVendaComParcelas` recebe frete e desconto do form (estado controlado) e passa `totalParaParcelas` (itens + frete − desconto); subtotal inicial vem dos itens, então a montagem não redistribui. `key={editVenda.id}` no form. |
| 1.2 | `updateVenda` aceitava qualquer `itensJson`: custo negativo, subtotal ≠ valor × qtd, frete/desconto negativo, 0 parcelas, desconto maior que o total. | Mesmas regras da criação (`produtoItemSchema` + `validarItensContraCatalogo`), campos numéricos finitos, taxa da nota 0–100, total ≥ 0, parcelas ≥ 1. |
| 1.3 | Margem por produto (rota e IA) somava venda cancelada e ignorava venda só de cabeçalho (18 em produção); CSV sem escape. | `agregarMargemPorProduto` única; `src/lib/csv.ts` (`celulaCsv`/`linhaCsv`: aspas, `;`, fórmula `= + - @ \t \r`, número em texto preservado). |
| 1.4 | Resumo de vendas da IA somava cancelada/estornada. | `FILTRO_VENDA_VALIDA`. |

## Lote 2 — segurança

| # | Hoje | Correção |
|---|---|---|
| 2.1 | XSS armazenado: `/api/relatorios/catalogo` montava HTML com nome, marca, categoria e imagem sem escape; vendedor grava esses campos. | `escaparHtml` em todo campo; `urlImagemSegura` aceita só http(s) e caminho do site. |
| 2.2 | `margem-produto`, `inadimplencia`, `antecipacao`, `antecipacao-xlsx`, `antecipacao-imagem` só exigiam sessão; a tela é só admin (custo, CPF, lote). | `requireAdmin()` antes de qualquer acesso ao banco → 403. |

## Lote 3 — relatórios

| # | Hoje | Correção |
|---|---|---|
| 3.1 | PDF de antecipação estimava 30 pt por mês e 18 por parcela; o desenho gasta 42 e 16: TOTAL GERAL cortado com 2+ empresas. | `alturaPaginaAntecipacao` com os passos reais do desenho. |
| 3.2 | Caractere fora do WinAnsi (emoji, ✓) derrubava qualquer PDF com 500. | `fontePdfSegura` nas 8 fontes embutidas (relatórios, catálogo, recibo, relatório mensal). |
| 3.3 | XML das planilhas não removia caractere de controle (Excel recusa o arquivo). | `escaparXml` compartilhado em `vendas-xlsx` e `antecipacao-xlsx`. |
| 3.4 | Planilha de antecipação mostrava só o 1º produto da venda. | Itens antes do nome do cabeçalho. |
| 3.5 | CSV de inadimplência e da financeira sem escape/fórmula; vendas e inadimplência sem BOM. | `linhaCsv`/`celulaCsv`; `escaparCsv` do relatório de vendas delega a `celulaCsv`; BOM. |
| 3.6 | Datas padrão da tela de relatórios em UTC (depois das 20h em Manaus, "hoje" era amanhã). | `hojeDataPura` + `inicioDoMesDataPura`. |
| 3.7 | Inadimplência: tela mandava `from` = dia 1 do mês e a rota cortava em 1º de janeiro; atraso antigo sumia. Somava venda cancelada. | Links só com `to`; sem piso quando não vem `from`; `FILTRO_VENDA_VALIDA`. |
| 3.8 | IA `resumo_relatorio_vendas`: período só com from **e** to; filtro de empresa só em `porEmpresa`; lucro sem taxa de antecipação. | `filtroPeriodoVendas` (cada ponta sozinha, `to` inclui o dia) e `resumirRelatorioVendas`. |
| 3.9 | IA `resumo_margem_produto` não anunciava `from`/`to` na tool. | Parâmetros anunciados. |
| 3.10 | Antecipação (fila, CSV, planilha, PDF, ação) aceitava venda cancelada/estornada. | `WHERE_VENDA_ANTECIPAVEL` e o espelho `vendaEhAntecipavel` excluem venda desfeita. |

## Fica para decisão do André (não aplicado)

- **Inadimplência sem baixa de pagamento:** nenhum fluxo grava `paga = true` (0 de 547
  parcelas). O relatório trata toda parcela vencida como atraso, e o cron de cobrança por
  WhatsApp (hoje desligado) cobraria parcela já paga. Precisa definir de onde vem a baixa.
- **Dados de parcelas divergentes (13 vendas):** 8 do bug 1.1 (228 já antecipada), 3 com
  cabeçalho 1x e 2 linhas duplicadas (51, 52, 53 — 52 antecipada), 2 boletos com 6 linhas
  somando muito mais que o total (158, 159).
- **Planilha de antecipação sem período estima parcelas** que o CSV/PDF/ação não incluem.
- **Reemitir lote** inclui parcelas de outros lotes no mesmo intervalo de meses.
- **`vendas-xlsx` para vendedor** traz só as vendas dele, e a tela `/historico` mostra todas.

## Testes

`edit-venda-parcelas-total`, `valor-parcela-edicao` (validação), `margem-produto`,
`relatorios-seguranca`, `relatorios-correcoes`, `dre-custo-legado`.
