# Novas Funcionalidades BFX Sistema — Design Spec

**Data:** 2026-04-06
**Branch:** nextjs-migration
**Abordagem:** Fundacao primeiro — campo empresa como FK antes das features dependentes

---

## Contexto

O usuario solicitou 8 funcionalidades. Apos analise, 3 ja estao implementadas:
- Alerta de nome parecido ao cadastrar cliente (onBlur + `/api/clientes/similar`)
- Fuzzy search em vendas (pg_trgm no historico)
- Colunas do PDF de vendas (ja na ordem correta: Mat., Nome, Produtos, Vendedor, Data, Valor, Parc.)

Restam 5 funcionalidades reais, implementadas na ordem abaixo.

---

## Feature 1: Campo Empresa como Select (Fundacao)

### Problema
O campo `empresa` no Cliente e texto livre. Isso causa:
- Matching fragil no relatorio semanal (texto vs nome da empresa)
- Impossibilidade de buscar empresa vinculada para enviar email
- Dados inconsistentes (typos, variacoes de nome)

### Schema
- Adicionar `empresaParceiraId Int?` ao modelo `Cliente` (FK para `EmpresaParceira`)
- Relacao: `empresaParceira EmpresaParceira? @relation(fields: [empresaParceiraId], references: [id])`
- Manter campo `empresa` (texto) como legado — nao remover

### Migracao de dados
- Script SQL na migration: para cada cliente com `empresa` preenchido, buscar `EmpresaParceira` com nome case-insensitive match (trim + lower)
- Match exato → preencher `empresaParceiraId`
- Sem match → manter null (resolver manualmente)

### UI
- Trocar `<Input>` por `<Combobox>` (shadcn) no form de novo cliente e edicao
- Busca empresas parceiras cadastradas, permite filtrar digitando
- Opcao "Nenhuma" para limpar vinculo
- Ao selecionar, grava `empresaParceiraId`

### Listagem de empresas
- Na aba "Empresas Parceiras", adicionar coluna "Clientes" com contagem
- Click expande para mostrar nomes dos clientes vinculados

---

## Feature 2: Email automatico para empresa na venda

### Trigger automatico
- Ao criar/finalizar venda, se `cliente.empresaParceiraId` preenchido:
  - Buscar `EmpresaParceira` com `emailRh` e `emailsExtras`
  - Enviar email de notificacao

### Trigger manual
- Botao "Enviar para empresa" na tela de historico (acao por venda)
- Disponivel apenas se cliente da venda tem empresa com email

### Conteudo do email
- Assunto: "Nova venda — [nome do cliente] — [nome da empresa]"
- Corpo HTML: matricula, nome, produtos, valor total, parcelas, data, vendedor
- CC para `adminEmail` (Config)

### Fallback
- Sem email → WhatsApp para `telefoneRh`
- Sem nenhum → log de aviso, nao falha silenciosamente

---

## Feature 3: Corrigir relatorio semanal

### Problema
- Query agrupa por `cliente.empresa` (texto) — matching fragil
- Com Feature 1 implementada, pode usar FK

### Correcao
- Alterar query para agrupar por `cliente.empresaParceiraId`
- Buscar vendas dos ultimos 7 dias onde `cliente.empresaParceiraId IS NOT NULL`
- Manter: CC admin, fallback WhatsApp, formato HTML tabela
- Funcao `sendWeeklyReport()` nao muda

---

## Feature 4: Campo data de nascimento no cadastro

### Estado atual
- `dataNascimento DateTime?` existe no schema Prisma
- Cron de aniversario ja usa o campo
- Falta input no form

### Implementacao
- Adicionar `<Input type="date">` no form (novo + edicao)
- Label: "Data de Nascimento"
- Posicao: apos email, antes de endereco
- Opcional
- Gravar no `addCliente()` e `updateCliente()` server actions

---

## Feature 5: Diagnostico WhatsApp Evolution

### Abordagem
Investigacao, nao feature nova:
1. Verificar Config: `evolutionApiUrl`, `evolutionApiKey`, `evolutionInstance`
2. Verificar conectividade: `getInstanceState()`
3. Verificar logs: `WhatsAppEnvioLog` — ultimos envios
4. Verificar flags de automacao
5. Corrigir o que for encontrado

### Entrega
- Diagnostico documentado
- Correcao no codigo se bug
- Instrucoes para usuario se problema de infra

---

## Features ja prontas (nenhuma acao necessaria)

- **Alerta nome parecido**: `onBlur` no campo nome → `/api/clientes/similar` → alerta amarelo
- **Fuzzy search em vendas**: `pg_trgm` com threshold 0.15, busca cliente/vendedor/produto
- **Colunas PDF vendas**: Mat., Nome, Produtos, Vendedor, Data, Valor, Parc.

---

## Ordem de implementacao

1. Feature 1 — Campo empresa como select (fundacao)
2. Feature 2 — Email para empresa na venda
3. Feature 3 — Corrigir relatorio semanal
4. Feature 4 — Data de nascimento no form
5. Feature 5 — Diagnostico WhatsApp

Features 2 e 3 dependem de Feature 1.
Features 4 e 5 sao independentes.
