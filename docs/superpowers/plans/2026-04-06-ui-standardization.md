# UI Standardization Plan — BFX Sistema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar UX/UI do sistema inteiro — titulos, botoes, labels, cards, empty states, breadcrumbs — para que todas as paginas sigam o mesmo design system.

**Architecture:** Criar componente `PageHeader` reutilizavel, substituir todas as cores hardcoded blue-900 por tokens semanticos, padronizar forms com Label component, e unificar empty states. Abordagem bottom-up: primeiro componentes base, depois aplicar em cada pagina.

**Tech Stack:** React, Tailwind CSS, shadcn/ui components, Next.js App Router

---

## File Structure

### New Files
- `src/components/page-header.tsx` — Componente PageHeader padronizado (titulo, breadcrumb, descricao)

### Files to Modify (by task)
- `src/components/clientes-tab-client.tsx` — Trocar blue-900 por primary, usar Label
- `src/components/empresas-tab-client.tsx` — Trocar blue-900 por primary, usar Label
- `src/components/fornecedores-tab-client.tsx` — Trocar blue-900 por primary, usar Label
- `src/components/produtos-tab-client.tsx` — Trocar blue-900 por primary
- `src/app/(app)/cadastros/page.tsx` — Trocar blue-900, usar PageHeader
- `src/app/(app)/dashboard/page.tsx` — Usar PageHeader
- `src/app/(app)/venda-rapida/page.tsx` — Usar PageHeader (normalizar font-black -> font-bold)
- `src/app/(app)/historico/page.tsx` — Usar PageHeader (adicionar gradiente)
- `src/app/(app)/relatorios/page.tsx` — Trocar blue-900, usar PageHeader
- `src/app/(app)/importacao/page.tsx` — Trocar blue-900, usar PageHeader
- `src/app/(app)/perfil/page.tsx` — Trocar blue-900
- `src/app/(app)/gestao-rh/page.tsx` — Trocar blue-900
- `src/components/link-catalogo-button.tsx` — Trocar blue-900
- `src/components/antecipacao-client.tsx` — Trocar blue-900

---

### Task 1: Criar componente PageHeader

**Files:**
- Create: `src/components/page-header.tsx`

- [ ] **Step 1: Criar o componente PageHeader**

```tsx
// src/components/page-header.tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Inicio</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((item, i) => (
              <span key={i} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title-gradient text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

Padrao escolhido:
- Titulo: sempre `text-2xl font-bold tracking-tight` com `page-title-gradient`
- Breadcrumb: sempre presente, comecando com "Inicio"
- Descricao: `text-sm text-muted-foreground`
- Actions: slot para botoes a direita

- [ ] **Step 2: Commit**

```bash
git add src/components/page-header.tsx
git commit -m "feat(ui): criar componente PageHeader padronizado"
```

---

### Task 2: Substituir blue-900 por primary nos tabs de cadastros

**Files:**
- Modify: `src/components/clientes-tab-client.tsx`
- Modify: `src/components/empresas-tab-client.tsx`
- Modify: `src/components/fornecedores-tab-client.tsx`
- Modify: `src/components/produtos-tab-client.tsx`

- [ ] **Step 1: Substituir em clientes-tab-client.tsx**

Trocar TODAS as ocorrencias:
- `"text-blue-900"` → `"text-primary"` (nos CardTitle)
- `"bg-blue-900 hover:bg-blue-800"` → `""` (nos botoes — usar Button component com variant default)
- Botao submit: trocar de `<button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>` para `<Button type="submit">` importando Button de `@/components/ui/button`

Exemplo do pattern a aplicar — trocar:
```tsx
<button className={cn(buttonVariants(), "bg-blue-900 hover:bg-blue-800 cursor-pointer")}>Salvar Cliente</button>
```
Por:
```tsx
<Button type="submit">Salvar Cliente</Button>
```

E trocar:
```tsx
<CardTitle className="text-blue-900">Novo Cliente</CardTitle>
```
Por:
```tsx
<CardTitle className="text-primary">Novo Cliente</CardTitle>
```

- [ ] **Step 2: Mesma substituicao em empresas-tab-client.tsx**

Mesmas trocas:
- `"text-blue-900"` → `"text-primary"` (CardTitle)
- `"bg-blue-900 hover:bg-blue-800"` → remover, usar `<Button type="submit">` padrao
- Certificar que Button esta importado

- [ ] **Step 3: Mesma substituicao em fornecedores-tab-client.tsx**

Mesmas trocas de blue-900 → primary e botoes padronizados.

- [ ] **Step 4: Mesma substituicao em produtos-tab-client.tsx**

Se houver blue-900 neste arquivo, trocar igualmente.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "env-validation.test"
```
Esperado: zero erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/clientes-tab-client.tsx src/components/empresas-tab-client.tsx src/components/fornecedores-tab-client.tsx src/components/produtos-tab-client.tsx
git commit -m "fix(ui): substituir blue-900 hardcoded por primary nos tabs de cadastros"
```

---

### Task 3: Padronizar labels nos forms de cadastros

**Files:**
- Modify: `src/components/clientes-tab-client.tsx`
- Modify: `src/components/empresas-tab-client.tsx`
- Modify: `src/components/fornecedores-tab-client.tsx`

- [ ] **Step 1: Trocar divs de label por componente Label**

Em cada arquivo, trocar o padrao:
```tsx
<div className="text-xs font-semibold text-muted-foreground">Nome/Razao Social</div>
```
Por:
```tsx
<Label>Nome/Razao Social</Label>
```

Importar `Label` de `@/components/ui/label` no topo do arquivo.

Isso aplica automaticamente: `text-xs font-semibold text-muted-foreground uppercase tracking-wider` — que e o padrao da venda-rapida.

Aplicar em TODOS os labels de TODOS os forms (novo + edicao) nos 3 arquivos.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "env-validation.test"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/clientes-tab-client.tsx src/components/empresas-tab-client.tsx src/components/fornecedores-tab-client.tsx
git commit -m "fix(ui): padronizar labels usando componente Label nos forms de cadastros"
```

---

### Task 4: Aplicar PageHeader nas paginas — Cadastros e Dashboard

**Files:**
- Modify: `src/app/(app)/cadastros/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Cadastros — usar PageHeader**

Trocar o bloco de titulo atual:
```tsx
<div>
  <h1 className="text-2xl font-semibold">Cadastros</h1>
  <p className="text-sm text-muted-foreground">Base de clientes, produtos, fornecedores e empresas.</p>
</div>
```
Por:
```tsx
<PageHeader
  title="Cadastros"
  description="Base de clientes, produtos, fornecedores e empresas."
  breadcrumbs={[{ label: "Cadastros" }]}
/>
```

Importar `PageHeader` de `@/components/page-header`.

Tambem trocar quaisquer `"text-blue-900"` ou `"border-blue-900"` restantes neste arquivo por `"text-primary"` / `"border-primary"`.

- [ ] **Step 2: Dashboard — usar PageHeader**

Trocar o bloco de titulo personalizado (com icone e gradiente) por:
```tsx
<PageHeader
  title="Dashboard Executivo"
  breadcrumbs={[{ label: "Dashboard" }]}
/>
```

Manter os filtros de data/vendedor FORA do PageHeader (abaixo dele).

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/cadastros/page.tsx src/app/(app)/dashboard/page.tsx
git commit -m "fix(ui): aplicar PageHeader padronizado em cadastros e dashboard"
```

---

### Task 5: Aplicar PageHeader — Historico, Venda Rapida, Relatorios

**Files:**
- Modify: `src/app/(app)/historico/page.tsx`
- Modify: `src/app/(app)/venda-rapida/page.tsx`
- Modify: `src/app/(app)/relatorios/page.tsx`

- [ ] **Step 1: Historico — usar PageHeader**

Trocar o bloco de breadcrumb manual + titulo por:
```tsx
<PageHeader
  title="Historico de Vendas"
  description="Filtre e edite vendas do periodo."
  breadcrumbs={[{ label: "Historico de Vendas" }]}
/>
```

Remover o import de Breadcrumb components se nao usados em mais nenhum lugar da pagina.

- [ ] **Step 2: Venda Rapida — normalizar titulo**

Trocar:
```tsx
<h1 className="page-title-gradient text-3xl font-black tracking-tight">Terminal de Vendas</h1>
```
Por PageHeader:
```tsx
<PageHeader
  title="Terminal de Vendas"
  description="PDV Inteligente BFX Intelligence"
  breadcrumbs={[{ label: "Venda Rapida" }]}
/>
```

Isso normaliza de `text-3xl font-black` para `text-2xl font-bold` (padrao).

- [ ] **Step 3: Relatorios — usar PageHeader + trocar blue-900**

Trocar titulo por PageHeader e substituir todas as ocorrencias de `"text-blue-900"` nos CardTitle por `"text-primary"`.

```tsx
<PageHeader
  title="Relatorios"
  description="Exporte relatorios de vendas e financeiro."
  breadcrumbs={[{ label: "Relatorios" }]}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "env-validation.test"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/historico/page.tsx src/app/(app)/venda-rapida/page.tsx src/app/(app)/relatorios/page.tsx
git commit -m "fix(ui): aplicar PageHeader em historico, venda-rapida e relatorios"
```

---

### Task 6: Aplicar PageHeader — Importacao, Perfil, Gestao RH + limpar blue-900 restante

**Files:**
- Modify: `src/app/(app)/importacao/page.tsx`
- Modify: `src/app/(app)/perfil/page.tsx`
- Modify: `src/app/(app)/gestao-rh/page.tsx`
- Modify: `src/components/link-catalogo-button.tsx`
- Modify: `src/components/antecipacao-client.tsx`

- [ ] **Step 1: Importacao — PageHeader + limpar blue-900**

Trocar titulo por PageHeader. Trocar `"text-blue-900"` por `"text-primary"` e `"border-blue-900"` por `"border-primary"`.

- [ ] **Step 2: Perfil — limpar blue-900**

Trocar todas as ocorrencias de `"text-blue-900"` e `"bg-blue-900"` por `"text-primary"` e `"bg-primary"`.

- [ ] **Step 3: Gestao RH — limpar blue-900**

Trocar `"bg-blue-900"` no botao por Button component com variant default.

- [ ] **Step 4: link-catalogo-button.tsx — limpar blue-900**

Trocar `"border-blue-900 text-blue-900 hover:bg-blue-50"` por `"border-primary text-primary hover:bg-primary/5"`.

- [ ] **Step 5: antecipacao-client.tsx — limpar blue-900**

Trocar `"bg-blue-100 text-blue-900"` por `"bg-primary/10 text-primary"`.

- [ ] **Step 6: Verificacao final — grep por blue-900**

```bash
grep -rn "blue-900" src/components/ src/app/\(app\)/ --include="*.tsx" --include="*.ts" | grep -v generated | grep -v node_modules
```

Esperado: ZERO resultados (exceto possivelmente arquivos de API que geram HTML para email/catalogo — esses sao aceitaveis).

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "env-validation.test"
```

- [ ] **Step 8: Commit**

```bash
git add src/app/(app)/importacao/page.tsx src/app/(app)/perfil/page.tsx src/app/(app)/gestao-rh/page.tsx src/components/link-catalogo-button.tsx src/components/antecipacao-client.tsx
git commit -m "fix(ui): eliminar blue-900 restante, aplicar PageHeader nas paginas finais"
```

---

### Task 7: Padronizar empty states

**Files:**
- Modify: `src/app/(app)/historico/page.tsx`

- [ ] **Step 1: Historico — trocar empty state inline por EmptyState component**

Trocar:
```tsx
<TableCell colSpan={...} className="text-center text-muted-foreground py-8">
  Sem dados para os filtros selecionados.
</TableCell>
```
Por:
```tsx
<TableCell colSpan={...}>
  <EmptyState
    variant="search"
    size="sm"
    title="Nenhuma venda encontrada"
    description="Ajuste os filtros ou o periodo de busca."
  />
</TableCell>
```

Importar `EmptyState` de `@/components/ui/empty-state`.

Aplicar o mesmo padrao para outros empty states inline no historico (se houver).

- [ ] **Step 2: Verificar outros empty states inline no codebase**

```bash
grep -rn "Sem dados\|Nenhum resultado\|Sem clientes\|Sem empresas\|Sem produtos\|Sem fornecedores" src/components/ src/app/ --include="*.tsx" | grep -v generated | grep -v node_modules
```

Para cada resultado encontrado, avaliar se faz sentido trocar por EmptyState component. Priorizar os que aparecem em tabelas e areas grandes.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "env-validation.test"
```

- [ ] **Step 4: Commit**

```bash
git add -A src/
git commit -m "fix(ui): padronizar empty states usando componente EmptyState"
```

---

### Task 8: Push final + verificacao visual em producao

- [ ] **Step 1: Pull rebase e push**

```bash
git stash && git pull --rebase && git stash pop && git push
```

- [ ] **Step 2: Aguardar deploy (CI + ArgoCD sync)**

```bash
gh run list --branch nextjs-migration --limit 3
```

Aguardar Build/Deploy passar. Se ImagePullBackOff, renovar ECR creds:
```bash
kubectl delete secret ecr-creds -n bfx --ignore-not-found
kubectl create secret docker-registry ecr-creds --namespace=bfx --docker-server=730335375436.dkr.ecr.sa-east-1.amazonaws.com --docker-username=AWS --docker-password="$(aws ecr get-login-password --region sa-east-1)"
```

- [ ] **Step 3: Verificacao visual**

Navegar por todas as paginas em producao e confirmar:
1. Todos os titulos usam PageHeader com gradiente e `text-2xl font-bold`
2. Todos os breadcrumbs presentes
3. Nenhum botao azul-escuro (blue-900) — todos usam cor primary do tema
4. Labels uppercase em todos os forms
5. Empty states com icone e descricao
6. Dark mode funciona corretamente (sem cores hardcoded quebrando)
