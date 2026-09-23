# E-mail em cópia por empresa — spec

Pedido do Felipe (23/09): a Prudent precisa ficar sabendo de cada aceite da AF (termo assinado). O
André aprovou o artboard "E-mail em Cópia BFX" (https://claude.ai/artifact/VQXvRiWUkoDkmN8CWWXDsA).

## Comportamento atual

- Termo assinado, consolidado semanal e relatório mensal vão só para `EmpresaParceira.emailRh`.
- `smtpSend` (`src/lib/email.ts`) só entrega ao **primeiro** destinatário: o índice do próximo `RCPT TO`
  conta todas as respostas 250 da sessão (EHLO, MAIL FROM…), não só as de RCPT, e manda `DATA` cedo.
  Um RCPT recusado também pula os seguintes. Hoje isso já derruba os `emailsExtras` da notificação de venda.

## Comportamento esperado

1. Campo novo `EmpresaParceira.emailCopia` (`email_copia`, texto, nulo por padrão). Aceita vários
   endereços separados por vírgula ou ponto e vírgula; é gravado normalizado (minúsculas, sem
   duplicatas, separados por `, `). Vazio grava `NULL`. Endereço inválido: não grava e avisa.
2. Os três e-mails ao RH saem com `Cc:` para `emailCopia`: termo assinado, consolidado semanal e
   relatório mensal (no grupo econômico, a cópia é a da empresa canônica, a mesma que dá o `emailRh`).
   Sem `emailRh` nada é enviado, como hoje: a cópia não substitui o RH.
3. `smtpSend` entrega a todos os destinatários (To + Cc), um `RCPT TO` por endereço. Recusado é
   pulado; se nenhum for aceito, falha.
4. Tela `/relatorios/mensais`: cartão "Destinatários por empresa" no topo, uma linha por empresa
   (nome, e-mail do RH ou selo "Sem e-mail do RH", campo "Em cópia" + Salvar). Server action com
   `requireAdminOrThrow` próprio.

## Fora do escopo

- `emailsExtras` e a notificação de venda continuam como estão (só ganham a correção do SMTP).
- Cópia oculta (Bcc), cópia global, cópia por tipo de e-mail.
