# Sistema BFX

## What This Is

Sistema BFX é um sistema de vendas/PDV (Ponto de Venda) para pequenas empresas, com múltiplos perfis de acesso (admin e vendedor). Permite registrar vendas, controlar cadastros (clientes, produtos, fornecedores), acompanhar comissões, gerar relatórios financeiros e PDF, e conta com IA integrada (BFX Intelligence) para análises e sugestões.

## Core Value

O PDV deve ser rápido, completo e sem fricção — uma venda com múltiplos produtos e parcelamento deve poder ser registrada em segundos.

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

<!-- Escopo atual — melhorias no PDV. -->

- [ ] PDV suporta múltiplos produtos por venda (lista de itens com quantidade e desconto individual)
- [ ] PDV permite parcelamento com data de vencimento por parcela (ex: 2x → 10/03 e 10/04)
- [ ] PDV tem desconto individual por item além do desconto geral da venda
- [ ] PDV tem busca rápida de cliente com autocomplete (sem sair da tela)

### Out of Scope

- Módulo de compras/estoque — próxima iteração após PDV
- Relatórios avançados adicionais — próxima iteração
- SaaS multi-tenant — sistema é single-tenant por design
- App mobile nativo — web responsivo é suficiente por ora

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

---
*Last updated: 2026-02-19 after initialization*
