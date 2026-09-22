# Relatório mensal configurável por empresa — Design

## Objetivo

Permitir configurar, por empresa parceira, o dia do mês em que o RH receberá o relatório mensal. No dia configurado, o sistema enviará para o `emailRh` as vendas do mês corrente, do primeiro dia até o dia do envio, com duas planilhas preenchidas e um resumo no corpo do e-mail.

## Regras aprovadas

- Cada empresa terá um dia de envio configurável entre 1 e 31.
- O cron será executado diariamente, no horário padrão já usado pelos cronjobs da aplicação, e processará somente as empresas cujo dia configurado seja o dia atual no fuso de Manaus.
- O período será o mês corrente, do dia 1 até o dia atual do envio.
- O destinatário será somente o `emailRh` da empresa.
- O envio terá duas planilhas anexadas:
  1. o modelo `antecipacao-1790093663397.xls`, gerado no formato XML Spreadsheet já compatível com o modelo analisado;
  2. o modelo oficial `02- Planilha - Amazon Five 08 2026.xls`, preservando seu layout e preenchendo seus dados.
- As duas planilhas serão preenchidas com os dados existentes no sistema.
- Cada linha representa um produto de um funcionário. Um funcionário com vários produtos terá várias linhas, repetindo seus dados cadastrais.
- Os valores serão acumulados por funcionário e produto no período enviado, somando os descontos/parcelas aplicáveis.
- O corpo do e-mail apresentará empresa, período, quantidade de funcionários, quantidade de linhas de produtos e valor acumulado.
- O envio será registrado com sucesso ou erro e continuará permitindo reenvio manual.

## Arquitetura

O campo de configuração será adicionado a `EmpresaParceira`. A rotina mensal atual será adaptada para aceitar uma competência parcial do mês corrente e será chamada por um cron diário. A consulta de vendas continuará usando vendas ativas, vínculo por chave estrangeira e fallback por nome legado.

A consolidação será isolada em uma função pura que transforma vendas e parcelas em linhas `funcionário + produto`, permitindo testar soma, múltiplos produtos e limites de período sem SMTP ou banco. Os dois geradores de planilha receberão essas linhas e produzirão anexos separados; o segundo gerador reproduzirá o layout do modelo oficial em um formato editável pelo Excel, sem depender de ferramentas instaladas no servidor.

## Configuração e interface

O cadastro/edição de empresa exibirá o campo opcional “Dia do relatório mensal”, com valor padrão 1 para preservar o comportamento atual. A validação aceitará inteiros de 1 a 31. Empresas sem configuração explícita usarão o dia 1.

## Idempotência e erros

O log mensal continuará identificando empresa e período. Para evitar duplicação, uma execução automática bem-sucedida para a mesma empresa e a mesma competência parcial não será repetida. O reenvio manual usará `force=1`. Empresas sem `emailRh`, sem vendas ou com falha na geração/envio receberão status próprio no resultado e no log.

## Segurança e privacidade

O destinatário será validado e limitado ao `emailRh`; não serão usados `emailsExtras`, cópia administrativa ou WhatsApp nesse novo envio. Os anexos conterão apenas os dados necessários ao RH da empresa correspondente.

## Verificação

Serão adicionados testes para: seleção por dia configurado, período corrente até o dia atual, consolidação de vários produtos do mesmo funcionário, soma das parcelas/descontos, geração dos dois layouts e envio dos dois anexos somente ao `emailRh`. Também será executado o lint dos arquivos alterados e a suíte direcionada de relatórios/e-mail.
