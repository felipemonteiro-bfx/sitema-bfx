# Atendimento WhatsApp: recuperar melhorias do fork pessoal

Origem: andrebrumdev/sistema-bfx, main 68758965. O repositório Felipe ainda não contém mídias, previews de links, álbuns, citações, tamanhos de bolhas e controles unificados já implementados no fork. Importar componentes do atendimento, APIs autenticadas e dependências de mídia com seus testes existentes. Preservar correções recentes de email e histórico; não importar workflows do fork nem trocar configurações de produção automaticamente.

As mudanças de banco são aditivas: mídia privada, tipo de mensagem, citação, páginas e metadados de áudio. Executar migrações pelo pipeline existente, sem modificar históricos ou marcar falhas como sucesso. Conferir testes importados, revisão independente e navegação desktop/celular.

Falhas reais: templates recusados por modo gratuito (35), assinatura fora da janela sem template (11), configuração ausente em registros antigos (37). A correção deve evitar tentativas incompatíveis com a política gratuita e explicar o bloqueio ao operador; não habilitar mensagens tarifadas nem reenviar em massa. Investigar estado atual da conexão por consulta somente leitura. Manter os registros históricos fiéis.

## Decisão do usuário
Em 23/10 autorizou explicitamente templates tarifados com cobrança pela Meta. Ativar por variável de ambiente explícita META_WHATSAPP_ALLOW_PAID_TEMPLATES=1, com padrão gratuito preservado nas demais instalações. Validar nomes e parâmetros aprovados por consulta à Meta. Assinatura precisa de template próprio de utilidade; não reutilizar template de recibo com conteúdo diferente.

## Infraestrutura e validação
Produção usa Garage 2.3, não MinIO. Bucket whatsapp-midias criado sem website; chave app-bfx autorizada apenas nesse novo bucket. MINIO_WHATSAPP_STORAGE_DRIVER=garage valida HeadBucket e GetBucketWebsite vazio (confirmado no serviço) e recusa website configurado. SSM versão 9 contém flag paga autorizada e driver; nenhuma credencial gravada no repositório. Cinco migrações aditivas aplicadas antes do deploy, compatíveis com a versão anterior. Nenhuma mensagem foi reenviada durante a validação.

Meta confirmou token válido e templates NPS/agradecimento aprovados. Criação de bfx_assinatura_folha recusada pela conta (HTTP400/código100: sem permissão para criar/atualizar modelos). O código bloqueia com motivo explícito até a aprovação, sem trocar autorização por recibo. Resolver permissão da conta e aprovar template é dependência externa restante.
