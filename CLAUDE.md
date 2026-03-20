# BFX Sistema — Notas para Claude

## Ambiente
- Stack: Next.js 15 (App Router), Prisma, Tailwind, shadcn/ui
- Branch principal de desenvolvimento: `nextjs-migration` (PR aberto em `main` — PR #11)
- `npm install` falha por permissoes em node_modules — nao tentar instalar pacotes
- `remark-gfm` nao esta instalado e nao pode ser instalado — usar parser nativo
- Criar novos arquivos na raiz do projeto requer `sudo` (diretorio e `root:root`)

## Hooks de seguranca
- Hook bloqueia edicoes com padrao de `RegExp exec` — usar `.split()` + regex em vez disso
- Hook tambem bloqueia escrita de arquivos com esse padrao no conteudo

## BFX Intelligence (chat IA)
- Componente principal: `src/components/intelligence-chat-client.tsx`
- Logica de IA e ferramentas: `src/lib/ai.ts` → `runAiWithActions()`
- `buildToolSummary()` formata resultados das tools para o chat (retorna markdown com tabelas)
- Renderizacao de tabelas: `MarkdownContent` + `MarkdownTable` — parser nativo sem dependencias externas
- Tabelas usam `split(TABLE_BLOCK_RE)` para separar blocos de texto e blocos de tabela
- Provedores suportados: gemini (padrao), openai, litellm

## Estrutura de tabelas geradas em `buildToolSummary`
- Clientes → Nome | Telefone | E-mail
- Produtos → Produto | Estoque | Preco
- Vendas → Cliente | Data | Valor | Status
- Despesas → Descricao | Data | Valor
- Empresas → Nome | CNPJ
- Usuarios → Nome | E-mail | Perfil

## Git
- Sempre fazer `git pull --rebase` antes de push (CI faz commits automaticos no branch)
- Branch `nextjs-migration` e ativo; nao fazer merge direto em `main` sem PR
