# E-mail em cópia no cadastro + histórico de e-mails enviados — spec

Aprovado pelo André em 25/09 no artboard "E-mail em Cópia BFX" (https://claude.ai/artifact/VQXvRiWUkoDkmN8CWWXDsA),
seção "Proposta 25/09": Cadastro, Editar, Histórico e Detalhe.

## 1. Cópia no cadastro da empresa

Atual: o campo "Em cópia" (`EmpresaParceira.emailCopia`) só existe em Relatórios → Mensais; o André não
achou. Esperado:

- Formulário "Nova Empresa" e painel "Editar empresa" ganham o bloco "RH e e-mails": Responsável RH,
  Telefone RH, E-mail do RH, **Em cópia**, **Aviso de cada venda** (é o antigo "Emails adicionais" —
  `emailsExtras`, só o rótulo muda), cada um com uma linha de ajuda.
- `addEmpresa`/`updateEmpresa` gravam `emailCopia` normalizado (`normalizarEmailsCopia`). Endereço
  inválido: não grava; o formulário avisa qual endereço antes de enviar.
- A lista de empresas mostra `Cc <emailCopia>` na coluna Contato.
- Sai de /relatorios/mensais o cartão "Destinatários por empresa", o `EmailCopiaForm` e a action
  `salvarEmailCopia`.
- A validação de endereço sai de `email-mime.ts` (que importa `node:crypto`) para `email-endereco.ts`,
  puro, para o formulário (client) poder validar.

## 2. Histórico de e-mails enviados

Atual: não há histórico. O semanal só cria uma notificação que aponta para /relatorios; o mensal guarda
um log por empresa/mês que o reenvio sobrescreve; o termo guarda só o status na venda.

Esperado:

- Tabelas `email_envios` (tipo termo|semanal|mensal|venda, origem automatico|manual, empresa, venda,
  remetente, para, cc, assunto, corpo HTML, status enviado|falhou, erro, enviado_em) e
  `email_envio_anexos` (nome, tipo, tamanho, conteúdo em BYTEA). Os anexos ficam no Postgres, não no
  MinIO: o bucket do MinIO é de leitura pública e o termo tem CPF e assinatura.
- `sendEmail` aceita `registro` e grava cada tentativa (enviado ou falhou + erro), com os anexos. Erro ao
  gravar o histórico não derruba o envio. Os quatro envios passam o registro; os reenvios manuais
  (relatório mensal, termo, e o botão Reenviar do histórico) gravam `origem: manual`.
- Tela /relatorios/emails (admin): filtros empresa, tipo e mês; lista com data, tipo, empresa, assunto,
  Para, Cc, anexos, status/erro e "Ver e-mail e arquivos".
- Detalhe (painel lateral via `?envio=ID`): status, data, De, Para, Cc, origem; anexos com tamanho,
  **Baixar** e **Ver** (PDF abre no navegador; planilha mostra prévia das primeiras linhas); corpo do
  e-mail num iframe sem scripts; **Reenviar** (mesmo conteúdo, mesmos destinatários).
- Download em `/api/emails/[id]/anexos/[anexoId]`, só admin.
- As notificações de relatório semanal e mensal passam a apontar para /relatorios/emails?empresa=ID.
- Link para a tela nova em /relatorios.

## Fora do escopo

- Histórico dos envios anteriores ao deploy (não foram guardados).
- Retenção/limpeza automática do histórico (volume baixo; revisitar se crescer).
- E-mails que não passam por `sendEmail`.
