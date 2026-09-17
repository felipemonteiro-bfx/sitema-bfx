# Planilha da folha (evento 5002 do Domínio)

Data: 2026-09-17. Aprovado pelo André no chat ("sim").

## Contexto

A folha da Amazon Five roda no sistema Domínio. Todo mês as meninas mandam ao departamento
pessoal a "RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO" (modelo `02- Planilha`), que é colada,
convertida em TXT e importada. O desconto das compras BFX é o evento **5002 — Desconto de
Produto**: uma célula por funcionário, identificado pela **matrícula**, com a soma das parcelas
do mês. Hoje essa coluna é montada à mão.

Na planilha de 08/2026: empresa 97 (AMAZON FIVE LTDA), 589 funcionários, 45 com Desconto de
Produto somando R$ 14.428,49. Contra a aba AGOSTO 2026 da planilha de controle, 43 batem e 4 não
— 7 dos 43 só batem com nome escrito diferente, o que a matrícula resolve.

## Comportamento atual × esperado

- Atual: o sistema não gera nada no formato da folha; a coluna M é digitada.
- Esperado: `GET /api/relatorios/folha-xlsx?competencia=MM/AAAA&empresa=...` devolve um .xlsx
  no layout do modelo do Domínio, só com a coluna do BFX, pronto para colar. A empresa é
  obrigatória (400 sem ela, e sem "todas"): o arquivo do Domínio é por empresa e a matrícula é
  numerada por empresa, então juntar empresas colaria o desconto de um funcionário em outro.
  Cliente sem empresa não entra em nenhum arquivo — aparece no bloco SEM EMPRESA da planilha
  de controle.

## Regra do valor (`src/lib/planilha-folha.ts`, pura)

1. Vendas em desconto em folha (`WHERE_VENDA_ANTECIPAVEL`), fora canceladas e estornadas.
2. Parcela entra se o mês de desconto (`mesDoDesconto`: vencimento dia 10 do mês seguinte) é a
   competência.
3. Entra parcela em aberto e parcela antecipada na Prudent (`origemPagamento = "prudent"`): a
   folha continua descontando. Fica fora parcela quitada pelo cliente (Asaas ou baixa manual) —
   a mesma regra de `situacaoParaCliente`.
4. Uma linha por empresa + matrícula (sem espaços nas pontas; "45" e "00045" são a mesma),
   somando em centavos todas as compras. A matrícula é numerada por empresa no Domínio, então
   sem filtro de empresa a mesma matrícula em empresas diferentes fica em linhas separadas.
5. Cliente sem matrícula: uma linha por cliente, com a matrícula em branco, depois das outras.
   Nunca some do arquivo. O resumo conta quantos são. Venda sem cliente: uma linha por venda.
6. Venda sem linhas em `parcelas_vencimento` (a venda rápida só grava com mais de uma parcela;
   vendas antigas também): as parcelas saem da regra da criação — primeiro vencimento de
   `calcularPrimeiroVencimento(dataVenda)`, uma por mês no dia 10, `valorTotalVenda / parcelas`
   com o resto de centavos na última. Essas parcelas só existem no cálculo: não dá para dar
   baixa nem antecipar (gravar as linhas na venda em 1x é tarefa à parte).
7. Filtro de empresa sem diferenciar maiúsculas, como a planilha de controle.
8. Ordem por nome (pt-BR).

**Em aberto (decisão do André):** a baixa manual também registra o repasse da folha não
antecipada (spec de 16/09). A regra exclui baixa manual porque, no fluxo normal, a planilha é
gerada antes do dia 25 e o repasse chega depois — o que já está baixado nessa hora foi pago por
fora (PIX, boleto). Regerar a competência depois do repasse sai sem essas parcelas.

## Layout do .xlsx

| Linha | Conteúdo |
|---|---|
| 1 | `RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO` |
| 3 | `Codigo Empresa:` — valor em branco (não existe no cadastro) |
| 4 | `Razão Social:` — nome da empresa filtrada |
| 5 | `Inscrição Cnpj:` — CNPJ da empresa parceira, quando cadastrado |
| 6 | `Competencia:` — 1º dia do mês, como data do Excel |
| 9–10 | `Tipo de`/`Calculo` · `Código`/`Folha` · `Nome dos`/`Colaboradores` · `Desconto de Produto`/`5002` |
| 11+ | `11` · matrícula (número no formato `00000` do modelo até 14 dígitos; texto se tiver letra ou 15+ dígitos; vazia e amarela se faltar) · nome · valor |
| fim | `TOTAL` · quantidade de linhas · `Colaboradores` · soma |

## Fora do escopo

- Preencher as matrículas no cadastro (tarefa seguinte) — junto, avisar matrícula repetida em
  cadastros diferentes e cliente com a empresa escrita diferente do filtro.
- Código da empresa no Domínio, geração do TXT, outras colunas da folha.
- Lançamento fixo com início e fim (opção descartada em 17/09).

## Tela

Botão "Baixar planilha da folha" ao lado de "Baixar planilha de controle" na `/prudent`, com mês,
empresa (sem "todas"; abre na empresa quando só há uma) e resumo (compradores, total, sem
matrícula). **Artboard aprovado antes do código da tela.**
