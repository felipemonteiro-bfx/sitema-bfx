# Notificação do termo assinado ao RH

## Objetivo

Após o cliente assinar uma venda vinculada a uma empresa parceira, enviar automaticamente o termo assinado em PDF para o endereço principal de RH (`emailRh`) cadastrado nessa empresa.

O envio não deve ocorrer na criação da venda. O RH não receberá o termo por `emailsExtras` nem por WhatsApp.

## Escopo

- Disparar o envio somente após a assinatura ser persistida.
- Anexar o PDF assinado já salvo no documento da venda.
- Registrar o estado e o último erro do envio.
- Permitir reenvio manual pelo histórico da venda.
- Remover os disparos atuais ao RH feitos durante a criação/edição da venda.

Fora do escopo: fila assíncrona, novos canais de comunicação, geração de outro documento ou alteração do fluxo de assinatura do cliente.

## Arquitetura e componentes

### Finalização da assinatura

O endpoint existente de assinatura continuará responsável por:

1. Validar o token e a assinatura.
2. Gerar o PDF completo com a assinatura incorporada.
3. Salvar o PDF em `documentos` como `comprovante_assinatura`.
4. Marcar `Assinatura.assinaturaStatus` como `assinado`.
5. Acionar o serviço de notificação ao RH.

O envio será feito depois que o documento e o estado da assinatura forem persistidos. Uma falha de e-mail não desfaz a assinatura nem retorna erro ao cliente que assinou.

### Serviço de notificação

O serviço receberá o `vendaId`, carregará a venda, o cliente, a empresa parceira e o documento assinado mais recente. A empresa será resolvida preferencialmente por `cliente.empresaParceiraId`; o fallback por nome existente será preservado quando necessário.

O destinatário será exclusivamente `EmpresaParceira.emailRh`. O serviço reutilizará a infraestrutura SMTP existente e enviará:

- assunto: `Termo assinado — venda #{id} — {cliente}`;
- corpo HTML com empresa, cliente, matrícula, itens, vendedor, data, parcelas e valor;
- anexo `termo-assinado-{id}.pdf`, com `application/pdf` e o conteúdo salvo no banco.

### Histórico e reenvio manual

O histórico exibirá o estado do envio e um botão `Reenviar termo ao RH` quando houver uma assinatura concluída. O reenvio buscará o documento salvo, sem gerar novo PDF, e enviará somente para `emailRh`.

O reenvio usará a autorização e o padrão de action já existentes no histórico. A interface exibirá sucesso ou erro da tentativa.

## Estado persistido

Serão adicionados à venda:

- `termoEmailStatus`: `pendente`, `enviado`, `falhou`, `sem_email` ou `erro_dados`;
- `termoEmailEnviadoEm`: data/hora do último envio bem-sucedido;
- `termoEmailErro`: mensagem sanitizada da última falha.

Quando o envio funcionar, o status será `enviado`, `termoEmailEnviadoEm` será atualizado e o erro será limpo. Em falha SMTP, o status será `falhou`; sem `emailRh`, será `sem_email`; sem cliente/empresa ou com documento ausente, será `erro_dados`. A assinatura permanecerá válida em todos esses casos.

## Tratamento de falhas

- Venda sem cliente ou sem empresa: não enviar e registrar estado apropriado para diagnóstico.
- Empresa sem `emailRh`: não tentar fallback para WhatsApp ou e-mails extras; marcar `sem_email`.
- SMTP indisponível ou erro de transporte: marcar `falhou`, registrar o erro sanitizado e manter o reenvio manual disponível.
- Documento assinado ausente: não tentar gerar outro documento automaticamente; registrar falha para investigação.
- Tentativa de reenvio sem assinatura: rejeitar a action e não enviar nada.

## Testes e validação

Serão adicionados ou ajustados testes para verificar:

- envio automático após assinatura com o PDF anexado;
- uso exclusivo de `emailRh`;
- não envio para `emailsExtras` ou WhatsApp;
- ausência de `emailRh`;
- falha SMTP sem invalidar a assinatura;
- reenvio manual reutilizando o mesmo documento;
- bloqueio do reenvio antes da assinatura;
- ausência dos disparos antecipados na criação da venda;
- atualização correta de status, data e erro.

## Critérios de aceite

1. Depois de uma assinatura válida, o RH recebe um único e-mail automático com o PDF assinado anexado.
2. O e-mail automático não é enviado no momento da criação da venda.
3. Apenas o `emailRh` recebe o e-mail.
4. Uma falha no e-mail não impede a conclusão da assinatura.
5. O usuário consegue reenviar manualmente o termo pelo histórico.
6. O reenvio usa o PDF já salvo e informa claramente sucesso ou falha.
