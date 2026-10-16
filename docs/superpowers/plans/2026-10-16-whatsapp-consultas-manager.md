# Atendimento gratuito com contexto do Manager

## Comportamento
O modo gratuito atual consulta catálogo, mas responde genericamente sobre compras e pagamentos. Integrar o resolvedor de identidade já usado pelo MCP do cliente final ao atendimento local do Manager. Não chamar por HTTP o próprio servidor nem compartilhar credenciais administrativas. Continuar sem modelo externo ou embedding tarifado.

## Escopo
- Novo serviço `whatsapp-manager-consultas.ts`: leitura de últimas cinco vendas válidas e até doze parcelas por venda, apenas do cadastro único resolvido pelo telefone do webhook. Nunca aceitar nome/ID informado na mensagem como identidade. Sem CPF, renda, dados bancários, documentos ou dados de terceiros na resposta.
- Intenções compras/cadastro/pagamento: informar registros, nunca quitação comprovada ou atraso presumido. Prudent futura continua a vencer; baixa manual é registro, não conciliação de comprovante. Não alterar dados.
- Catálogo e demais regras permanecem gratuitos e sob demanda, sem oferta firme baseada em preço histórico ou saldo local.
- Integrar após todas as guardas de janela, opt-out e pausa humana, antes da reserva antirrepetição existente.
- Nenhum reenvio de mensagens antigas; sem campanha ou template pago. Kanban é uma sugestão separada, não implementada por esta alteração.

## Verificação
Testar vínculo ambíguo/ausente, tentativa de consultar terceiros pelo texto, filtro de venda válida, baixa manual e Prudent, indisponibilidade da consulta, preservação de pausa, janela e antirrepetição. Revisão independente antes do commit; checagem de tipos e pipeline antes de declarar implantação.
