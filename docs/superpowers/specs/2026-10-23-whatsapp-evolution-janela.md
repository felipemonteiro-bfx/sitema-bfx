# Meta na janela, Evolution por QR fora dela

O usuário autorizou envio pela Evolution fora das 24h e quer conectar escaneando QR, sem digitar chaves e sem disparos para toda a base. A instalação Evolution 2.3.7 está disponível, mas não tem instância nem chave configurada no app; primário Meta continua funcionando.

Implementar opt-in explícito WHATSAPP_EVOLUTION_OUTSIDE_WINDOW=1. Dentro da janela Meta, manter Meta; fora dela escolher Evolution Baileys antes de qualquer envio, nunca retentar em outro canal após timeout/resultado incerto. Escopo padrão: texto manual e documentos transacionais de venda/boleto/relatório já habilitados nos respectivos fluxos. Campanhas, pré-atendimento e mensagens proativas (NPS, agradecimento, aniversário, reativação, boas-vindas) não ganham envio Evolution. Nenhum replay de falhas ou histórico ao conectar. Preferência opcional sobre automações foi perguntada; enquanto não houver resposta, manter escopo restrito.

QR em Configurações > WhatsApp junto da Meta, API administrativa separada: GET só lê estado; POST cria/conecta e devolve QR; polling não gera novo QR. Servidor já conhece URL/chave via SSM. Preparar instância sem sincronizar histórico e webhook autenticado, sem enviar mensagens. Conexão é comprovada por estado open, não por presença de config. O scan físico pelo usuário é necessário.

Adicionar provedor opcional às mensagens, marcando novas saídas/entradas. Entradas Evolution não abrem a janela Meta. Guardar ID Evolution com prefixo próprio; distinguir aceite de entrega. Receber textos novos do dispositivo pelo webhook, ignorando grupos e histórico antigo; sem bot ou respostas em lote. Mídia mantém as guardas oficiais atuais, sem liberar anexos só por liberar texto.

Reserva antes do HTTP, transação curta e lock por telefone. Dedupe persistente de documentos por corpo/origem por 24h; manual preserva 90s e intervalo mínimo entre envios. Limite de três documentos automáticos pelo canal Evolution por contato em 24h, contando reservas/resultado incerto. Sem chamada externa dentro da transação; HTTP sem retry automático. Erro de rede/5xx/aceite sem ID fica pendente. Sem registro de corpos, QR ou credenciais em logs.

Revisão do plano pelo Grok concluída: incorporar canal explícito, guardas separadas texto/mídia, persistência do provedor, dedupe e GET sem regenerar QR. Testes devem falhar antes e passar depois para roteamento, dedupe/limites, timeout, autenticação do QR/webhook e isolamento da janela Meta. Validar QR no navegador sem enviar mensagem, revisar com subagente, integrar via PR e publicar em produção. A rolagem é tratada em spec própria.

## Evidência de implementação
SSM versão 10 contém a conexão Evolution e opt-in; app não solicita chaves ao usuário. Instância bfx criada com webhook autenticado e sem histórico completo; API real gerou QR no navegador, ainda aguardando scan físico. Nenhuma mensagem enviada. Coluna de provedor e índice aditivos migrados. Revisão independente concluída, diretiva Server Actions e consulta da janela no frontend corrigidas. Limites também respeitam SAIR/PARAR nas automações. 5.035 testes e TypeScript passaram, lint sem erros.
