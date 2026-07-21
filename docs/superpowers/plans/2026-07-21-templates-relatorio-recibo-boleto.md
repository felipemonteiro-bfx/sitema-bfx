# Reestruturação de Templates (relatório/recibo/boleto) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar aprováveis e úteis na Meta os templates de relatório (3 dedicados), recibo, assinatura e boleto (URL como variável), sem mudar o comportamento dentro da janela de 24h.

**Architecture:** O registry ganha 4 templates novos; a decisão de envio da venda-rápida sai para um helper puro `montarEnviosVenda`; os call sites de relatório e boleto passam a montar `bodyParams` estruturados em vez da mensagem inteira como uma variável.

**Tech Stack:** Next.js 15 (App Router), Prisma, Vitest, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-07-21-templates-relatorio-recibo-boleto-design.md`

## Global Constraints

- Yarn 1.22 — sempre `yarn <cmd>`, nunca `npx`. Testes `yarn vitest run <arquivo>`, typecheck `yarn tsc --noEmit -p tsconfig.json`, suíte `yarn test`.
- Idioma português nos comentários.
- Prisma de `@/lib/db`; hook de segurança bloqueia `RegExp exec` (usar `.split()`).
- TDD: teste que falha antes da implementação. Commit ao fim de cada task. Sem push.
- Branch: `feat/whatsapp-templates-fix`.
- **A janela de 24h não muda**: o `fallbackText` de cada envio replica a frase atual; só o caminho de template (bodyParams) ganha as variáveis.
- **Ordem de compilação**: `relatorioEmpresa` só sai do registry na Task 4 (junto com a migração do último call site que o usa), para nenhum commit intermediário quebrar o `tsc`.
- Baseline antes de começar: 196 testes verdes.

---

### Task 1: Registry — adicionar os 4 templates novos

**Files:**
- Modify: `src/lib/whatsapp-templates.ts`
- Modify: `src/__tests__/whatsapp-templates.test.ts`

**Interfaces:**
- Produces: `TEMPLATES.relatorioVenda` (`"bfx_relatorio_venda"`), `TEMPLATES.relatorioSemanal` (`"bfx_relatorio_semanal"`), `TEMPLATES.relatorioMensal` (`"bfx_relatorio_mensal"`), `TEMPLATES.assinatura` (`"bfx_assinatura"`). `relatorioEmpresa` permanece por ora.

- [ ] **Step 1: Atualizar o teste do registry (falha primeiro)**

Em `src/__tests__/whatsapp-templates.test.ts`, no teste que compara `Object.keys(TEMPLATES).sort()` com a lista fechada, adicionar as 4 novas chaves à lista esperada (mantendo `relatorioEmpresa` e as demais): acrescentar `"relatorioVenda"`, `"relatorioSemanal"`, `"relatorioMensal"`, `"assinatura"`.

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/whatsapp-templates.test.ts`
Expected: FAIL — as 4 chaves novas ainda não existem no registry.

- [ ] **Step 3: Adicionar os templates ao registry**

Em `src/lib/whatsapp-templates.ts`, no objeto `TEMPLATES`, antes do `} as const;`:

```typescript
  relatorioVenda: "bfx_relatorio_venda",
  relatorioSemanal: "bfx_relatorio_semanal",
  relatorioMensal: "bfx_relatorio_mensal",
  assinatura: "bfx_assinatura",
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/whatsapp-templates.test.ts && yarn tsc --noEmit -p tsconfig.json`
Expected: PASS; tsc limpo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp-templates.ts src/__tests__/whatsapp-templates.test.ts
git commit -m "feat(whatsapp): registra templates de relatorio dedicado e assinatura"
```

---

### Task 2: Helper `montarEnviosVenda`

**Files:**
- Create: `src/lib/envios-venda.ts`
- Test: `src/__tests__/envios-venda.test.ts`

**Interfaces:**
- Consumes: `TEMPLATES.recibo`, `TEMPLATES.assinatura`, `TEMPLATES.boleto` (Task 1 para `assinatura`; `recibo`/`boleto` já existem)
- Produces:
  - `type EnvioVenda = { template: string; params: string[]; fallbackText: string }`
  - `montarEnviosVenda(input: EntradaEnviosVenda): EnvioVenda[]`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/envios-venda.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { montarEnviosVenda } from "@/lib/envios-venda";

const base = {
  nome: "Ana",
  vendaId: 42,
  baseUrl: "https://app.bfx",
  autoRecibo: true,
  autoBoleto: true,
  descontoEmFolha: false,
  assinaturaToken: null as string | null,
  boletoUrl: null as string | null,
  reciboSig: "SIG",
};

describe("montarEnviosVenda", () => {
  it("recibo simples: 1 envio de recibo com URL de recibo", () => {
    const out = montarEnviosVenda(base);
    expect(out).toHaveLength(1);
    expect(out[0].template).toBe("bfx_recibo");
    expect(out[0].params).toEqual(["Ana", "42", "https://app.bfx/api/recibo?id=42&sig=SIG"]);
  });

  it("desconto em folha + token: envio de assinatura com URL de assinatura", () => {
    const out = montarEnviosVenda({ ...base, descontoEmFolha: true, assinaturaToken: "TK" });
    expect(out).toHaveLength(1);
    expect(out[0].template).toBe("bfx_assinatura");
    expect(out[0].params).toEqual(["Ana", "42", "https://app.bfx/assinatura/TK"]);
  });

  it("desconto em folha SEM token: recibo com sufixo tipo=autorizacao", () => {
    const out = montarEnviosVenda({ ...base, descontoEmFolha: true, assinaturaToken: null });
    expect(out[0].template).toBe("bfx_recibo");
    expect(out[0].params[2]).toBe("https://app.bfx/api/recibo?id=42&sig=SIG&tipo=autorizacao");
  });

  it("recibo + boleto: 2 envios, recibo e depois boleto", () => {
    const out = montarEnviosVenda({ ...base, boletoUrl: "https://bank/boleto" });
    expect(out.map((e) => e.template)).toEqual(["bfx_recibo", "bfx_boleto"]);
    expect(out[1].params).toEqual(["Ana", "42", "https://bank/boleto"]);
  });

  it("autoRecibo off + boleto: só o envio de boleto", () => {
    const out = montarEnviosVenda({ ...base, autoRecibo: false, boletoUrl: "https://bank/boleto" });
    expect(out).toHaveLength(1);
    expect(out[0].template).toBe("bfx_boleto");
  });

  it("nada aplicável: lista vazia", () => {
    expect(montarEnviosVenda({ ...base, autoRecibo: false, autoBoleto: false })).toEqual([]);
    expect(montarEnviosVenda({ ...base, autoRecibo: false, boletoUrl: null })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/envios-venda.test.ts`
Expected: FAIL — "Cannot find module '@/lib/envios-venda'"

- [ ] **Step 3: Implementar**

Criar `src/lib/envios-venda.ts`:

```typescript
/**
 * Decide quais mensagens de WhatsApp enviar ao concluir uma venda.
 *
 * Extraído da venda-rápida para ficar testável isoladamente. Preserva o
 * comportamento anterior, só reorganizado: recibo OU assinatura, e o boleto
 * (quando houver) vira uma SEGUNDA mensagem em vez de ser concatenado — porque
 * template não comporta concatenação de conteúdo arbitrário.
 *
 * O `fallbackText` de cada envio replica a frase usada hoje dentro da janela
 * de 24h; os `params` alimentam o template (`{{1}}=nome`, `{{2}}=venda`,
 * `{{3}}=URL`) fora da janela.
 */
import { TEMPLATES } from "@/lib/whatsapp-templates";

export type EnvioVenda = { template: string; params: string[]; fallbackText: string };

export type EntradaEnviosVenda = {
  nome: string;
  vendaId: number;
  baseUrl: string;
  autoRecibo: boolean;
  autoBoleto: boolean;
  descontoEmFolha: boolean;
  assinaturaToken: string | null;
  boletoUrl: string | null;
  reciboSig: string;
};

export function montarEnviosVenda(input: EntradaEnviosVenda): EnvioVenda[] {
  const { nome, vendaId, baseUrl, autoRecibo, autoBoleto } = input;
  const idStr = String(vendaId);
  const envios: EnvioVenda[] = [];

  if (autoRecibo) {
    if (input.descontoEmFolha && input.assinaturaToken) {
      const url = `${baseUrl}/assinatura/${input.assinaturaToken}`;
      envios.push({
        template: TEMPLATES.assinatura,
        params: [nome, idStr, url],
        fallbackText: `Olá! Segue o link para assinar sua autorização de desconto em folha: ${url}`,
      });
    } else {
      const sufixo = input.descontoEmFolha ? "&tipo=autorizacao" : "";
      const url = `${baseUrl}/api/recibo?id=${vendaId}&sig=${input.reciboSig}${sufixo}`;
      envios.push({
        template: TEMPLATES.recibo,
        params: [nome, idStr, url],
        fallbackText: `Olá! Segue seu recibo de venda: ${url}`,
      });
    }
  }

  if (input.boletoUrl && autoBoleto) {
    envios.push({
      template: TEMPLATES.boleto,
      params: [nome, idStr, input.boletoUrl],
      fallbackText: `Olá! Seu boleto da venda #${vendaId} foi gerado. Acesse: ${input.boletoUrl}`,
    });
  }

  return envios;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/envios-venda.test.ts`
Expected: 6 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/envios-venda.ts src/__tests__/envios-venda.test.ts
git commit -m "feat(whatsapp): helper montarEnviosVenda (recibo/assinatura/boleto)"
```

---

### Task 3: Ligar `montarEnviosVenda` na venda-rápida

**Files:**
- Modify: `src/app/(app)/venda-rapida/actions.ts`

**Interfaces:**
- Consumes: `montarEnviosVenda`, `EnvioVenda` (Task 2)

- [ ] **Step 1: Substituir o bloco inline de recibo/boleto**

Em `src/app/(app)/venda-rapida/actions.ts`, localizar o bloco que hoje começa em `const baseUrl = ...; let mensagem = "";` e vai até o `if (mensagem) { void enviarWhatsApp({ ... TEMPLATES.recibo ... }); }` (por volta das linhas 493–511). Substituir TODO esse bloco por:

```typescript
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
        const envios = montarEnviosVenda({
          nome: cliente.nome ?? "Cliente",
          vendaId: venda.id,
          baseUrl,
          autoRecibo: waConfig?.autoRecibo ?? false,
          autoBoleto: waConfig?.autoBoleto ?? false,
          descontoEmFolha,
          assinaturaToken: assinaturaToken ?? null,
          boletoUrl: boletoUrl ?? null,
          reciboSig: signReciboId(venda.id),
        });
        for (const e of envios) {
          void enviarWhatsApp({
            telefone: cliente.telefone,
            clienteId,
            origem: "venda",
            template: comFallback(e.template, e.params, e.fallbackText),
          });
        }
```

Nota: as variáveis `descontoEmFolha`, `assinaturaToken`, `boletoUrl`, `cliente`, `clienteId`, `venda`, `waConfig` já existem no escopo (são as mesmas que o bloco antigo usava). O bloco de boas-vindas que vem logo depois **não muda**.

- [ ] **Step 2: Adicionar o import**

No topo de `src/app/(app)/venda-rapida/actions.ts`, adicionar:

```typescript
import { montarEnviosVenda } from "@/lib/envios-venda";
```

`signReciboId` já está importado (usado no bloco antigo); manter.

- [ ] **Step 3: Verificar tipos e suíte**

Run: `yarn tsc --noEmit -p tsconfig.json && yarn test`
Expected: tsc limpo; 202 testes PASS (196 baseline + 6 do helper).

- [ ] **Step 4: Confirmar que `TEMPLATES.recibo` com 1 param não sobrou**

Run: `grep -n "TEMPLATES.recibo" src/app/\(app\)/venda-rapida/actions.ts`
Expected: nenhum resultado (o envio agora vem de `montarEnviosVenda`).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/venda-rapida/actions.ts
git commit -m "feat(whatsapp): venda-rapida usa montarEnviosVenda"
```

---

### Task 4: Migrar relatórios e boleto; aposentar `relatorioEmpresa`

**Files:**
- Modify: `src/lib/email.ts` (linhas ~431, ~502, ~532)
- Modify: `src/lib/relatorio-mensal-service.ts` (~209)
- Modify: `src/lib/boleto-actions.ts` (~101)
- Modify: `src/lib/whatsapp-templates.ts` (remover `relatorioEmpresa`)
- Modify: `src/__tests__/whatsapp-templates.test.ts` (remover `relatorioEmpresa` da lista)
- Test: `src/__tests__/relatorio-envios.test.ts`

**Interfaces:**
- Consumes: `TEMPLATES.relatorioVenda`, `.relatorioSemanal`, `.relatorioMensal`, `.boleto` (Task 1)

- [ ] **Step 1: Escrever o teste dos call sites de relatório (falha primeiro)**

Criar `src/__tests__/relatorio-envios.test.ts`. Este teste valida o **formato dos bodyParams** de cada template de relatório via uma função auxiliar exportada — mas como os call sites são inline em funções grandes, o teste cobre a montagem dos params através de um helper puro `paramsRelatorio*`. Para manter simples e testável, criar helpers puros no próprio `email.ts`/`relatorio-mensal-service.ts` NÃO é necessário; em vez disso, este teste verifica o registry + a ordem documentada. Escrever:

```typescript
import { describe, it, expect } from "vitest";
import { TEMPLATES } from "@/lib/whatsapp-templates";

// Garante que os nomes usados pelos call sites de relatório existem e são únicos.
describe("templates de relatório", () => {
  it("os 3 templates de relatório existem e relatorioEmpresa foi aposentado", () => {
    expect(TEMPLATES.relatorioVenda).toBe("bfx_relatorio_venda");
    expect(TEMPLATES.relatorioSemanal).toBe("bfx_relatorio_semanal");
    expect(TEMPLATES.relatorioMensal).toBe("bfx_relatorio_mensal");
    expect((TEMPLATES as Record<string, string>).relatorioEmpresa).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/relatorio-envios.test.ts`
Expected: FAIL — `relatorioEmpresa` ainda existe (não é undefined).

- [ ] **Step 3: Migrar o call site de venda individual (`email.ts:~431`)**

Substituir:

```typescript
      template: comFallback(TEMPLATES.relatorioEmpresa, [mensagem], mensagem),
```

pelo bloco (no site da venda individual, onde `venda`, `totalValor`, `mensagem` existem):

```typescript
      template: comFallback(
        TEMPLATES.relatorioVenda,
        [
          venda.cliente?.nome || "N/D",
          formatBRL(totalValor),
          `${venda.parcelas || 1}x`,
          venda.vendedor || "N/D",
        ],
        mensagem
      ),
```

- [ ] **Step 4: Migrar os 2 call sites de relatório semanal (`email.ts:~502` e `~532`)**

Em cada um dos dois (onde existem `empresaNome`, o `semanaLabel*`, `vendas`, `totalGeral*`, `mensagem`), substituir:

```typescript
        template: comFallback(TEMPLATES.relatorioEmpresa, [mensagem], mensagem),
```

por (usando as variáveis locais daquele bloco — `semanaLabelFallback`/`totalGeralFallback` no primeiro, `semanaLabelWa`/`totalGeralWa` no segundo):

```typescript
        template: comFallback(
          TEMPLATES.relatorioSemanal,
          [empresaNome, <semanaLabel>, String(vendas.length), formatBRL(<totalGeral>)],
          mensagem
        ),
```

Onde `<semanaLabel>` e `<totalGeral>` são as variáveis locais daquele bloco:
- Primeiro bloco (~502): `semanaLabelFallback` e `totalGeralFallback`.
- Segundo bloco (~532): `semanaLabelWa` e `totalGeralWa`.

- [ ] **Step 5: Migrar o relatório mensal (`relatorio-mensal-service.ts:~209`)**

Substituir:

```typescript
            template: comFallback(TEMPLATES.relatorioEmpresa, [msg], msg),
```

por (onde `empresaNome`, `dados`, `msg` existem):

```typescript
            template: comFallback(
              TEMPLATES.relatorioMensal,
              [
                empresaNome,
                String(dados.totalVendas),
                formatBRL(dados.valorTotal),
                formatBRL(dados.totalDescontoFolha),
              ],
              msg
            ),
```

Confirmar que `formatBRL` já está importado nesse arquivo; se não, adicionar `import { formatBRL } from "@/lib/utils";` (o mesmo import usado na construção do `msg`).

- [ ] **Step 6: Corrigir o boleto (`boleto-actions.ts:~101`)**

Substituir:

```typescript
        template: comFallback(TEMPLATES.boleto, [cliente.nome], msg),
```

por:

```typescript
        template: comFallback(
          TEMPLATES.boleto,
          [cliente.nome ?? "Cliente", String(venda.id), payment.bankSlipUrl],
          msg
        ),
```

(`venda` e `payment.bankSlipUrl` já existem no escopo — são os mesmos usados na `msg`.)

- [ ] **Step 7: Remover `relatorioEmpresa` do registry e do teste**

Em `src/lib/whatsapp-templates.ts`, remover a linha `relatorioEmpresa: "bfx_relatorio_empresa",`.
Em `src/__tests__/whatsapp-templates.test.ts`, remover `"relatorioEmpresa"` da lista fechada esperada.

- [ ] **Step 8: Verificar que nenhum call site usa mais `relatorioEmpresa`**

Run: `grep -rn "relatorioEmpresa" src`
Expected: nenhum resultado.

- [ ] **Step 9: Rodar os testes e tipos**

Run: `yarn vitest run src/__tests__/relatorio-envios.test.ts src/__tests__/whatsapp-templates.test.ts && yarn tsc --noEmit -p tsconfig.json && yarn test`
Expected: todos PASS; tsc limpo.

- [ ] **Step 10: Commit**

```bash
git add src/lib/email.ts src/lib/relatorio-mensal-service.ts src/lib/boleto-actions.ts src/lib/whatsapp-templates.ts src/__tests__/whatsapp-templates.test.ts src/__tests__/relatorio-envios.test.ts
git commit -m "feat(whatsapp): relatorios dedicados e boleto com URL; aposenta relatorio_empresa"
```

---

### Task 5: Atualizar a documentação de templates

**Files:**
- Modify: `docs/whatsapp-templates-meta.md`

**Interfaces:**
- Consumes: os 6 templates definidos nas tasks anteriores

- [ ] **Step 1: Substituir a seção de atenção pelos 6 templates corrigidos**

Em `docs/whatsapp-templates-meta.md`, remover a seção "⚠️ Três templates precisam de atenção" e a linha de `bfx_relatorio_empresa` da tabela de transacionais. Acrescentar, na seção de transacionais (UTILITY), as 6 entradas com os corpos definitivos:

```markdown
| `bfx_relatorio_venda` | 4 | `Nova venda registrada na BFX. Cliente: {{1}}. Valor: {{2}}. Parcelas: {{3}}. Vendedor: {{4}}.` |
| `bfx_relatorio_semanal` | 4 | `Relatório semanal BFX — {{1}}. Período: {{2}}. Total de vendas: {{3}}. Valor total: {{4}}.` |
| `bfx_relatorio_mensal` | 4 | `Relatório mensal BFX — {{1}}. Total de vendas: {{2}}. Valor total: {{3}}. A descontar em folha: {{4}}.` |
| `bfx_recibo` | 3 | `Olá {{1}}! Seu recibo da venda #{{2}} está disponível: {{3}}` |
| `bfx_assinatura` | 3 | `Olá {{1}}! Assine sua autorização de desconto em folha da venda #{{2}}: {{3}}` |
| `bfx_boleto` | 3 | `Olá {{1}}! Seu boleto da venda #{{2}} foi gerado: {{3}}` |
```

E acrescentar a nota: os corpos de recibo/assinatura/boleto terminam na variável de URL; se a Meta rejeitar por isso, acrescentar um ponto ou texto curto após `{{3}}`. Atualizar a contagem total para 21 templates.

- [ ] **Step 2: Verificação final**

Run: `yarn test && yarn tsc --noEmit -p tsconfig.json && yarn lint`
Expected: testes PASS, tsc limpo; `yarn lint` só o erro pré-existente em `historico-antecipacoes.tsx`.

- [ ] **Step 3: Commit**

```bash
git add docs/whatsapp-templates-meta.md
git commit -m "docs(whatsapp): atualiza templates de relatorio/recibo/assinatura/boleto"
```

---

## Notas de execução

- **Ordem:** Task 1 → 2 → 3 → 4 → 5. Task 4 depende de 1 (templates novos) e não pode remover `relatorioEmpresa` antes de migrar todos os seus call sites (feito na própria Task 4). Task 3 depende de 2.
- **Sem mudança de comportamento na janela de 24h:** todo `fallbackText` replica a frase atual.
- **6 templates novos a aprovar na Meta** (além dos 15 já entregues). `bfx_relatorio_empresa` é aposentado — não criar.
