# Sistema BFX

## What This Is

Sistema BFX é um sistema de vendas/PDV (Ponto de Venda) para pequenas empresas, com múltiplos perfis de acesso (admin e vendedor). Permite registrar vendas, controlar cadastros (clientes, produtos, fornecedores), acompanhar comissões, gerar relatórios financeiros e PDF, e conta com IA integrada (BFX Intelligence) para análises e sugestões.

## Core Value

O PDV deve ser rápido, completo e sem fricção — uma venda com múltiplos produtos e parcelamento deve poder ser registrada em segundos.

## Current Milestone: v1.1 Demandas do Cliente BFX

**Goal:** Resolver as 11 demandas levantadas pelo cliente no documento "DEMANDAS PARA SISTEMA BFX", priorizando integridade de dados e fricção do vendedor, com storage de arquivos que sobreviva ao ciclo de vida dos pods no Kubernetes.

**Target features:**
- Storage durável para uploads (MinIO no cluster) — logo, imagens de produto e recibos param de sumir a cada rollout do ArgoCD
- Restore dos fornecedores apagados a partir da trilha de auditoria, e exclusão que deixa de ser destrutiva
- Exportação rápida com todas as empresas parceiras do banco (fim do hardcode de 2 empresas)
- PDV sem fricção: custo editável sem bloqueio, cadastro de cliente e de fornecedor sem sair da tela
- Estoque sem alertas na venda (mantendo os relatórios financeiros) e paleta alinhada à marca BFX
- Integrações: cotação Uber ativa em produção e carga de clientes da Equilibrium

**Origem:** documento DOCX do cliente (2026-08-03), analisado pelo Grok como revisor externo de plano. Ver `.planning/research/GROK-PLAN.md`.

## Requirements

### Validated

<!-- Funcionalidades já implementadas e em uso. -->

- ✓ Autenticação com roles (admin/vendedor) — JWT + HTTP-only cookies
- ✓ PDV (Venda Rápida) — registro de vendas com produto único, forma de pagamento, desconto, parcelamento básico
- ✓ Histórico de vendas — listagem com filtros, edição, exclusão
- ✓ Cadastro de clientes, produtos, fornecedores e empresa
- ✓ Dashboard com KPIs e gráficos (Recharts)
- ✓ Controle de comissões por vendedor
- ✓ Relatório financeiro (DRE/P&L)
- ✓ BFX Intelligence — chat com IA (OpenAI/Google) para análises e sugestões
- ✓ Exportação de PDF (recibo, catálogo)
- ✓ Importação via CSV
- ✓ Dark mode + design system com tokens semânticos (WCAG AA)
- ✓ Skeleton screens em todas as rotas
- ✓ Toast notifications com feedback visual (Sonner)
- ✓ Módulo de antecipação de recebíveis

### Active

<!-- Escopo atual — milestone v1.1, demandas do cliente. -->

- [ ] Uploads sobrevivem a rollout do ArgoCD (MinIO provisionado no cluster)
- [ ] Logo da BFX carrega no sistema, no recibo PDF e no catálogo
- [ ] Fornecedores apagados restaurados a partir de `audit_logs`
- [ ] Exclusão de fornecedor deixa de ser hard delete sem rede de proteção
- [ ] Exportação rápida lista todas as empresas parceiras do banco
- [ ] Vendedor altera o custo do produto na venda rápida sem bloqueio do servidor
- [ ] Cadastro de cliente novo por modal, sem sair do PDV
- [ ] Cadastro de fornecedor novo no fluxo de produto rápido do PDV
- [ ] Venda rápida sem alertas de estoque baixo/sem estoque (relatórios financeiros preservados)
- [ ] Paleta alinhada às cores oficiais da BFX, após desambiguar a origem do "amarelo"
- [ ] Cotação Uber ativa em produção com degradação clara sem credencial
- [ ] Import de clientes da Equilibrium idempotente com dry-run

### Out of Scope

- Módulo de compras/estoque — próxima iteração após PDV
- Relatórios avançados adicionais — próxima iteração
- SaaS multi-tenant — sistema é single-tenant por design
- App mobile nativo — web responsivo é suficiente por ora
- Desconto % por item no PDV (PDV-05) — remanescente do v1.0, movido para backlog
- Migrar storage para Amazon S3 — decisão foi MinIO no cluster
- Criar corrida Uber end-to-end (delivery, tracking, conciliação) — só cotação neste ciclo
- Soft-delete em todos os cadastros — neste ciclo só fornecedores

## Context

- Stack: Next.js 16, React 18, TypeScript, Prisma + PostgreSQL, shadcn/ui, Tailwind CSS 4
- Já existe componente `venda-rapida-form-client.tsx` (PDV atual — produto único)
- Já existe `parcelas-vencimento-form.tsx` e `produto-item-form.tsx` (potencialmente reutilizáveis)
- API de autocomplete já existe em `/api/vendas/autocomplete/clientes` e `/api/vendas/autocomplete/produtos`
- Roles: `admin` (acesso total) e `vendedor` (acesso restrito ao PDV e histórico próprio)
- Banco de dados em PostgreSQL com Prisma ORM — migrations controladas

## Constraints

- **Tech Stack**: Next.js + Prisma + PostgreSQL — sem troca de stack
- **Design System**: Usar tokens semânticos do globals.css — sem cores hardcoded
- **Formulários**: React Hook Form + Zod — padrão estabelecido no projeto
- **Feedback**: Server Actions retornam `ActionResponse`, toasts via Sonner

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PDV multi-produto como lista de itens | UX mais natural para vendas com vários produtos | — Pending |
| Datas de parcelas calculadas ou manuais | Usuário precisa de datas específicas por contrato | — Pending |
| Desconto por item em % ou valor fixo | Flexibilidade para diferentes tipos de negócio | — Pending |
| Storage de uploads = MinIO no cluster (não S3) | Paridade com o ambiente de dev; sem dependência de conta AWS. Custo: equipe assume backup, upgrade e disco | — Pending |
| Liberar custo abaixo do custo de catálogo para todos os vendedores | Decisão do André em 2026-08-03: fricção na venda pesa mais que o risco. ⚠️ Reabre o vetor de comissão/margem inflados fechado no commit `a63dc04` | ⚠️ Revisit |
| Estoque: esconder alertas, manter decremento | Atende ao pedido do cliente sem quebrar capital imobilizado e potencial de receita no /financeiro. Reversível | — Pending |
| Fases 1-3 do v1.0 encerradas como entregues no código | Verificação do código mostrou VendaRapidaFormV2, ParcelasVencimentoForm e autocomplete de cliente já em produção. Replanejá-las seria retrabalho | — Pending |
| Grok como revisor externo de plano ("cérebro"), Claude como implementador ("mãos") | Pedido do André. Grok analisa e critica o plano em modo read-only; Claude implementa | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-03 after starting milestone v1.1*
