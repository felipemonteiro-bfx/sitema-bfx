# CRM no Sistema BFX — Roadmap

**Princípio-mestre:** o CRM **não é um sistema à parte**. Tudo se conversa e reusa o que já existe
(`Cliente`, `EmpresaParceira`, `Venda`, jornadas WhatsApp por cron, chatbot IA, provider WhatsApp).
Um **lead** é um `Cliente` que ainda não comprou (importado da lista de funcionários da empresa
parceira). Ao registrar a 1ª venda, ele vira **cliente** automaticamente.

## Fase 1 — Segmentação & tags (base) ✅ nesta entrega

- `Cliente.estagioCrm` (`novo_lead | contatado | negociando | cliente | inativo`) e `Cliente.origem`.
- Modelos `Tag` + `ClienteTag` (segmentação manual).
- `src/lib/crm.ts` — estágios, `isLead`, `buildClienteSegmentWhere(filtro)` (filtro puro e testável:
  estágio, tags, empresa, inatividade, comprou/nunca-comprou, busca).
- **Integração:** ao criar venda, um lead vira `cliente` automaticamente
  (`venda-rapida/actions.ts`). Migração `20260714120000_crm_segmentacao`. Testes em `crm.test.ts`.
- **A fazer na UI (próximo passo desta fase):** coluna de estágio + tags na aba Clientes
  (`cadastros`), gerenciador de tags, e filtro por segmento na listagem.

## Fase 2 — Captação de leads (funil)

- **Importar lista de funcionários** por empresa parceira (CSV/XLSX) → cria `Cliente` com
  `estagioCrm = "novo_lead"`, `origem = "import_funcionarios"`, vinculado à `empresaParceiraId`.
  Dedup por matrícula/telefone (reusar `clientes/similar`).
- **Funil/pipeline**: visão por estágio (mover lead entre estágios), com ações rápidas
  (WhatsApp, registrar venda). Conversão automática já cobre lead→cliente.
- Rota de importação reusa o padrão de `importacao/` existente.

## Fase 3 — Campanhas WhatsApp por segmento

- `Campanha` (nome, segmento/filtro, mensagem/template, status, agendadaPara) +
  `CampanhaEnvio` (idempotência, reusa padrão de `WhatsAppEnvioLog`).
- Builder: escolher segmento (via `buildClienteSegmentWhere`) → mensagem → enviar/agendar.
- **Só WhatsApp**, reusando `enviarWhatsAppTexto`/`enviarWhatsAppTemplate` (provider oficial Meta
  quando ativo). Um cron dispara campanhas agendadas. Reaproveita as jornadas já existentes.

## Fase 4 — Fidelidade

- `Cliente.pontos` + ledger `PontoTransacao` (ganho na venda, resgate, ajuste).
- Regras (ex.: X pontos por real), níveis (bronze/prata/ouro), resgate (desconto na próxima compra).
- Exibir no perfil do cliente e usar o nível como critério de segmento (fecha o ciclo:
  fidelidade → segmento → campanha → venda → pontos).

## Ordem e porquê

Segmentação é a espinha dorsal (todas as outras fases filtram clientes). Leads alimentam o funil;
campanhas agem sobre segmentos; fidelidade realimenta a segmentação. Cada fase entrega valor
sozinha e prepara a próxima.
