# Kanban do atendimento WhatsApp

## Escopo aprovado
Quadro padrão com Novas, Em atendimento, Aguardando cliente, Aguardando fornecedor e Concluídas; manter lista pesquisável. Cartão mostra contato, responsável, próxima ação e links para conversa/ficha. Etapa e atribuição são por conversa/telefone, não pelo estágio comercial global do cliente. Nenhuma mudança na autorização admin atual, no envio ou nos pagamentos.

## Persistência e concorrência
Usar eventos internos `sistema/kanban_controle` no histórico existente, sem migração de banco ou custo. JSON versionado validado no servidor, resumo humano no histórico. Último evento válido define estado. Nunca interpretar mensagens externas como estado do quadro. Conversa sem estado explícito fica em Novas, identificada como sem classificação; responsável Não atribuído e próxima ação Revisar histórico e definir próximo passo. Nenhuma tarefa marcada concluída automaticamente.

Gravação autenticada, valida telefone, conversa existente, etapa, usuário responsável existente e próxima ação. Trava transacional por telefone com revisão esperada evita sobrescrever alteração de outro atendente. Novo evento não envia mensagem nem modifica janela/pausa/financeiro. Busca e datas de última mensagem excluem eventos internos do quadro.

## Interface
Colunas com contagem e nomes textuais; cartões com links grandes e distintos para conversa e ficha, edição por formulário acessível e confirmação visível. Seletor de etapa funciona no celular e teclado, sem depender de arrastar. Responsável e próxima ação também visíveis na lista e na conversa. Filtros de busca preservados ao alternar modo. Atualização periódica sem descartar rascunho de organização; cancelar não grava.

## Verificação
Testes: validação, não autorizado, telefone/conversa ausente, responsável inválido, persistência por telefone, leitura do evento salvo, conflito de revisão, dados inválidos sem classificação falsa. Verificação de tipos/lint/design tokens, revisão independente, pipeline e inspeção visual quando sessão acessível. Implantação e verificação visual são etapas distintas.

## Ampliação aprovada: arrastar e soltar
Cartões arrastáveis para as colunas visíveis. Só arrasto iniciado no próprio quadro pode mover; não importar dados de arrasto externo. Preservar responsável e próxima ação e usar a mesma ação autenticada, com revisão concorrente. Não mover com editor aberto nem durante gravação; manter seletor por teclado/celular. Feedback no quadro informa sucesso/conflito e estado otimista só muda depois de confirmação do servidor. Retornar revisão do novo evento para uma segunda movimentação não usar revisão antiga.
