# Reestruturar templates de relatório, recibo, assinatura e boleto

Data: 2026-07-21

## Objetivo

Tornar aprováveis e úteis na Meta Cloud API os três templates que hoje não
funcionam como template (herança da migração Evolution → Meta):

1. **`bfx_relatorio_empresa`** — passa a mensagem inteira como `{{1}}`, o que a
   Meta rejeita (corpo não pode ser só variável). É usado para 3 tipos de
   mensagem estruturalmente diferentes.
2. **`bfx_recibo`** e **`bfx_boleto`** — a URL do documento vive só no
   `fallbackText` (texto livre), não é variável do template; fora da janela de
   24h o link não é enviado.

Além disso, `bfx_boleto` está inconsistente hoje: passa `[cliente.nome]` como
variável, mas o `fallbackText` nem usa o nome (usa `vendaId` e a URL).

O comportamento dentro da janela de 24h (texto livre via `fallbackText`) não
muda; só o caminho de template ganha as variáveis corretas.

## Contexto (código atual)

`comFallback(name, bodyParams, fallbackText)` monta o `WhatsAppTemplate`.
`enviarWhatsApp` envia `fallbackText` como texto livre dentro da janela de 24h e
o template (com `bodyParams` preenchendo `{{n}}`) fora dela.

Call sites afetados:
- `src/lib/email.ts:431` — notificação de venda individual ao RH da empresa.
- `src/lib/email.ts:502` e `:532` — relatório semanal (fallback WhatsApp).
- `src/lib/relatorio-mensal-service.ts:209` — relatório mensal.
- `src/app/(app)/venda-rapida/actions.ts:~493-511` — recibo / assinatura / boleto.
- `src/lib/boleto-actions.ts:101` — boleto ao gerar.

## Decisões de escopo

| Item | Decisão |
|---|---|
| relatório | 3 templates dedicados com variáveis reais |
| recibo | separar em recibo / assinatura / boleto, mensagens distintas |
| recibo + boleto juntos | enviar duas mensagens (não concatenar) |
| janela de 24h | inalterada (`fallbackText` mantém a mensagem atual) |
| link | variável no corpo (sem botão de URL) |

### Fora de escopo
- Botões de CTA/URL (a URL fica como variável de corpo).
- Mudança do texto livre enviado dentro da janela de 24h.

## Templates novos/reestruturados

Todos categoria **UTILITY**, idioma `pt_BR`.

### Relatório (substituem `bfx_relatorio_empresa`, que é aposentado)

| Template | Vars | Corpo |
|---|---|---|
| `bfx_relatorio_venda` | 4 | `Nova venda registrada na BFX. Cliente: {{1}}. Valor: {{2}}. Parcelas: {{3}}. Vendedor: {{4}}.` |
| `bfx_relatorio_semanal` | 4 | `Relatório semanal BFX — {{1}}. Período: {{2}}. Total de vendas: {{3}}. Valor total: {{4}}.` |
| `bfx_relatorio_mensal` | 4 | `Relatório mensal BFX — {{1}}. Total de vendas: {{2}}. Valor total: {{3}}. A descontar em folha: {{4}}.` |

Variáveis:
- `bfx_relatorio_venda`: 1=nome do cliente, 2=valor total, 3=nº de parcelas, 4=vendedor
- `bfx_relatorio_semanal`: 1=empresa, 2=período, 3=total de vendas, 4=valor total
- `bfx_relatorio_mensal`: 1=empresa, 2=total de vendas, 3=valor total, 4=valor a descontar em folha

### Recibo / assinatura / boleto

| Template | Vars | Corpo |
|---|---|---|
| `bfx_recibo` | 3 | `Olá {{1}}! Seu recibo da venda #{{2}} está disponível: {{3}}` |
| `bfx_assinatura` | 3 | `Olá {{1}}! Assine sua autorização de desconto em folha da venda #{{2}}: {{3}}` |
| `bfx_boleto` | 3 | `Olá {{1}}! Seu boleto da venda #{{2}} foi gerado: {{3}}` |

Todos: 1=nome, 2=vendaId, 3=URL.

**Nota de aprovação:** o corpo termina na variável de URL. Se a Meta rejeitar por
terminar em variável, acrescentar um ponto final ou texto curto após `{{3}}` (ex.:
`...: {{3}} .`). O código não precisa mudar para isso — é só ajuste no texto
aprovado na Meta.

## Mudanças no registry (`src/lib/whatsapp-templates.ts`)

- Remover: `relatorioEmpresa`.
- Adicionar: `relatorioVenda: "bfx_relatorio_venda"`, `relatorioSemanal: "bfx_relatorio_semanal"`, `relatorioMensal: "bfx_relatorio_mensal"`, `assinatura: "bfx_assinatura"`.
- Manter (nomes inalterados): `recibo`, `boleto`.

## Componentes

### `montarEnviosVenda` (novo helper, `src/lib/envios-venda.ts`)

Extrai a decisão de envio da venda-rápida para um helper puro e testável.

```
export type EnvioVenda = { template: string; params: string[]; fallbackText: string };

export function montarEnviosVenda(input: {
  nome: string;
  vendaId: number;
  baseUrl: string;
  autoRecibo: boolean;
  autoBoleto: boolean;
  descontoEmFolha: boolean;
  assinaturaToken: string | null;
  boletoUrl: string | null;
  reciboSig: string;   // signReciboId(vendaId)
}): EnvioVenda[]
```

Regras (preservam o comportamento atual, só reorganizado):
- `autoRecibo` ligado:
  - `descontoEmFolha && assinaturaToken` → envio de **assinatura**
    (`TEMPLATES.assinatura`, params `[nome, vendaId, <baseUrl>/assinatura/<token>]`).
  - senão → envio de **recibo** (`TEMPLATES.recibo`, params
    `[nome, vendaId, <baseUrl>/api/recibo?id=<vendaId>&sig=<sig>[&tipo=autorizacao]]`).
  - se `boletoUrl && autoBoleto` → **adiciona um segundo envio** de boleto
    (`TEMPLATES.boleto`, params `[nome, vendaId, boletoUrl]`).
- `autoRecibo` desligado e `boletoUrl && autoBoleto` → só o envio de boleto.
- nada aplicável → `[]`.

O `fallbackText` de cada envio replica a frase atual correspondente (mantém o
texto dentro da janela de 24h).

A `venda-rapida/actions.ts` passa a chamar `montarEnviosVenda(...)` e fazer um
`enviarWhatsApp` por item da lista.

### Call sites de relatório

Cada um monta os `bodyParams` estruturados em vez do blocão:
- `email.ts:431` → `comFallback(TEMPLATES.relatorioVenda, [clienteNome, valorTotalFmt, parcelasStr, vendedor], mensagem)`.
- `email.ts:502` e `:532` → `comFallback(TEMPLATES.relatorioSemanal, [empresaNome, periodo, String(totalVendas), valorTotalFmt], mensagem)`.
- `relatorio-mensal-service.ts:209` → `comFallback(TEMPLATES.relatorioMensal, [empresaNome, String(totalVendas), valorTotalFmt, descontoFolhaFmt], msg)`.

Os valores já existem nas variáveis locais de cada função (ver o código atual que
monta o `mensagem`/`msg` multi-linha). O `fallbackText` continua sendo o
`mensagem`/`msg` atual.

### `boleto-actions.ts:101`

`comFallback(TEMPLATES.boleto, [cliente.nome ?? "Cliente", String(venda.id), payment.bankSlipUrl], msg)` — corrige a inconsistência (hoje passa só `[nome]`).

## Tratamento de erros

Inalterado: `enviarWhatsApp` não lança (retorna boolean) e registra falha na
`WhatsAppMensagem`. Os call sites que hoje usam `void`/`try/catch` continuam iguais.

## Testes (Vitest, TDD)

- `montarEnviosVenda`:
  - desconto em folha + token → 1 envio de assinatura com a URL de assinatura.
  - sem desconto → 1 envio de recibo com a URL de recibo.
  - recibo + boleto → 2 envios (recibo e boleto), na ordem.
  - autoRecibo off + boleto → só boleto.
  - nada aplicável → `[]`.
  - params na ordem `[nome, vendaId, url]` e URLs bem formadas.
- registry (`whatsapp-templates.test.ts`): atualizar a lista fechada de chaves
  (remove `relatorioEmpresa`, adiciona os 4 novos) mantendo `toEqual`.
- call sites de relatório: com `enviarWhatsApp` mockado, verificar que o
  `template.name` e a ordem dos `bodyParams` batem com o esperado.

## Documentação

Atualizar `docs/whatsapp-templates-meta.md`: substituir a seção de atenção (os 3
problemáticos) pelos 6 templates corrigidos, prontos para aprovar. O arquivo
`docs/whatsapp-templates-15-prontos.md` (já entregue) não muda.

## Impacto na aprovação da Meta

Este lote adiciona **6 templates** a aprovar além dos 15 já entregues:
`bfx_relatorio_venda`, `bfx_relatorio_semanal`, `bfx_relatorio_mensal`,
`bfx_recibo`, `bfx_assinatura`, `bfx_boleto`. Total do sistema: 21 templates.
`bfx_relatorio_empresa` não deve ser criado (foi aposentado).
