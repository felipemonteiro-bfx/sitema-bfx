# Correção do reenvio de termos e relatórios

Data: 2026-10-23 · Escopo: reenvio de termo assinado ao RH e notificações de relatórios.

## Problema observado

Em produção, um envio de relatório mensal pode ser aceito pelo SMTP e depois ser registrado como erro porque a notificação interna tenta usar `usuarioId: 1`, usuário que já não existe. O fluxo semanal repete a mesma referência fixa e pode lançar erro depois do envio. O relatório mensal então fica elegível para reenvio, com risco de duplicar e-mail.

Os envios manuais do termo e o relatório semanal da AMAZON FIVE foram recusados pelo SMTP com `550` no comando `RCPT TO`. Ambos usaram o `emailRh` atualmente cadastrado. Isso aponta para caixa/domínio destinatário inválido ou recusado pelo servidor; não é uma falha de autenticação SMTP do BFX. O endereço correto depende de confirmação operacional.

## Comportamento esperado

- Notificações de relatório e de venda usam os IDs dos administradores que existem no banco; notificações do vendedor também deduplicam administradores e ignoram usuários removidos.
- A falha ao criar uma notificação nunca muda o resultado de um e-mail já enviado nem faz o job tentar enviar novamente.
- Falha real do SMTP continua registrada como falha e o reenvio manual informa que o endereço RH precisa ser conferido, sem expor o endereço ou o erro bruto do servidor.
- O reenvio do termo mantém o mesmo documento assinado e o histórico de tentativas.

## Arquivos previstos

- `src/lib/avisar-admins.ts`, `src/lib/relatorio-mensal-service.ts` e `src/lib/email.ts` para relatórios semanais e avisos de venda.
- Action e feedback do reenvio do termo.
- Testes focados nos fluxos e no helper de notificação.

## Fora de escopo

- Trocar o endereço RH da AMAZON FIVE sem confirmação do endereço correto.
- Reenviar automaticamente e-mails que o SMTP aceitou ou recusou.
- Alterar outros dados de produção além de corrigir registros de relatório comprovadamente enviados.
