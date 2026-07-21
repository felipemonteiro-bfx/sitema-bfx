# Sugestões de Melhorias - BFX Manager

## Melhorias Implementadas (versão atual)

### Sidebar
- Paleta escura (#2A2E3B) inspirada no referencial
- Item ativo com indicador lateral vermelho/rosa e ícone colorido
- Novo agrupamento de funcionalidades:
  - **Visão geral**: Início (Dashboard)
  - **Vendas & Operações**: Venda Rápida, Histórico, Importação
  - **Financeiro**: Financeiro & DRE, Boletos, Prudent
  - **Inteligência & Dados**: BFX Intelligence, Relatórios, Cadastros, Gestão de RH, Comissões
  - **Sistema**: Configurações, Perfil
- Botão Suporte no rodapé com ícone de fones
- Ícone Home para Início

### Páginas
- Títulos com gradiente rosa/roxo/azul (classe `page-title-gradient`)
- Barra decorativa gradiente abaixo dos títulos
- Páginas atualizadas: Dashboard, Venda Rápida, Importação, Relatórios

### Componentes
- Nova variante `gradient` para botões (uso em CTAs principais)
- Variáveis CSS de sidebar unificadas para light/dark mode

---

## Sugestões Futuras

### UX/UI
1. **Dropdowns com descrição** – Ao estilo do referencial, adicionar linha de descrição em cinza abaixo do label em selects importantes
2. **Cards vazios no Kanban** – Se houver fluxo Kanban futuramente, usar placeholders com ícone + texto "Arraste cards aqui ou crie um novo"
3. **Transições de página** – Considerar animações suaves entre rotas (ex.: Framer Motion)
4. **Breadcrumbs** – Em páginas aninhadas, adicionar breadcrumbs para contexto

### Acessibilidade
5. **Contraste** – Revisar contraste de texto em `--sidebar-muted` para garantir WCAG AA
6. **Focus visible** – Manter ring de foco consistente em todos os interativos
7. **Redução de movimento** – Já há `prefers-reduced-motion` em globals.css; garantir que novas animações o respeitem

### Performance
8. **Lazy load de rotas** – Considerar `next/dynamic` para páginas pesadas (Relatórios, Importação)
9. **Skeleton loaders** – Expandir uso de skeletons em carregamentos de tabelas e listas

### Funcionalidades
10. **Link do Suporte** – Configurar URL real no botão Suporte (atualmente `#`)
11. **Atalhos de teclado** – Ex.: Ctrl+K para busca global, teclas numéricas para itens do menu
12. **Modo compacto da sidebar** – Opção para recolher sidebar e mostrar apenas ícones

---

## Como usar as novas classes

```tsx
// Título com gradiente
<h1 className="page-title-gradient text-2xl font-bold">Meu Título</h1>

// Barra decorativa
<div className="gradient-bar mt-2" />

// Botão com gradiente (CTA principal)
<Button variant="gradient">Pesquisar</Button>
```
