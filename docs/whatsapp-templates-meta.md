# Templates WhatsApp para aprovação na Meta

Referência para criar/aprovar os templates no **WhatsApp Manager** (business.facebook.com → WhatsApp Manager → Modelos de mensagem).

**Total: 21 templates** (12 transacionais + 9 marketing).

**Regras que evitam retrabalho:**
- O **nome** de cada template deve bater EXATAMENTE com o registry em `src/lib/whatsapp-templates.ts` — a Meta não deixa renomear depois.
- O **número de variáveis `{{n}}`** no corpo deve bater com o que o código envia (coluna "Vars"). Se divergir, o envio falha em produção com erro de parâmetros.
- **Idioma:** `pt_BR` (Português - Brasil). O código usa `META_TEMPLATE_LANG` (default `pt_BR`).
- **Categoria:** a Meta decide na revisão, mas você escolhe a inicial. Sugestões abaixo. Marketing exige opt-in e conta diferente na cobrança.
- A Meta **rejeita** corpo que seja só variável, que comece/termine em variável sem texto, ou com variáveis coladas (`{{1}}{{2}}`).

---

## Transacionais (categoria sugerida: UTILITY)

| Template | Vars | Corpo sugerido (cole no WhatsApp Manager) |
|---|---|---|
| `bfx_lembrete_parcela` | 5 | `Olá {{1}}! Lembrete: a parcela {{2}} da venda #{{3}} vence em {{4}}. Valor: {{5}}. Evite atraso.` |
| `bfx_parcela_vencida` | 4 | `Olá {{1}}, a parcela {{2}} da venda #{{3}} venceu. Valor: {{4}}. Regularize assim que possível para evitar juros.` |
| `bfx_agradecimento` | 1 | `Olá {{1}}! Como foi sua compra? Estamos à disposição para qualquer dúvida. Obrigado por escolher a BFX!` |
| `bfx_nps` | 2 | `Olá {{1}}! Como você avalia sua experiência na compra da venda #{{2}}? Responda de 0 a 10.` |
| `bfx_boas_vindas` | 1 | `Bem-vindo(a), {{1}}! Obrigado pela primeira compra. Em caso de dúvidas, estamos à disposição.` |
| `bfx_primeira_compra` | 1 | `Olá {{1}}! Que alegria ter você como cliente da BFX pela primeira vez. Qualquer coisa, é só chamar. Seja bem-vindo(a)!` |
| `bfx_relatorio_venda` | 4 | `Nova venda registrada na BFX. Cliente: {{1}}. Valor: {{2}}. Parcelas: {{3}}. Vendedor: {{4}}.` |
| `bfx_relatorio_semanal` | 4 | `Relatório semanal BFX — {{1}}. Período: {{2}}. Total de vendas: {{3}}. Valor total: {{4}}.` |
| `bfx_relatorio_mensal` | 4 | `Relatório mensal BFX — {{1}}. Total de vendas: {{2}}. Valor total: {{3}}. A descontar em folha: {{4}}.` |
| `bfx_recibo` | 3 | `Olá {{1}}! Seu recibo da venda #{{2}} está disponível: {{3}}` |
| `bfx_assinatura` | 3 | `Olá {{1}}! Assine sua autorização de desconto em folha da venda #{{2}}: {{3}}` |
| `bfx_boleto` | 3 | `Olá {{1}}! Seu boleto da venda #{{2}} foi gerado: {{3}}` |

**Variáveis:**
- `bfx_lembrete_parcela`: 1=nome, 2=nº da parcela, 3=nº da venda, 4=vencimento, 5=valor
- `bfx_parcela_vencida`: 1=nome, 2=nº da parcela, 3=nº da venda, 4=valor
- `bfx_nps`: 1=nome, 2=nº da venda
- `bfx_relatorio_venda`: 1=cliente, 2=valor, 3=parcelas, 4=vendedor
- `bfx_relatorio_semanal`: 1=empresa, 2=período, 3=total de vendas, 4=valor total
- `bfx_relatorio_mensal`: 1=empresa, 2=total de vendas, 3=valor total, 4=a descontar em folha
- `bfx_recibo`: 1=nome, 2=nº da venda, 3=URL do recibo
- `bfx_assinatura`: 1=nome, 2=nº da venda, 3=URL de assinatura
- `bfx_boleto`: 1=nome, 2=nº da venda, 3=URL do boleto
- demais: 1=nome

**Nota:** os corpos de `bfx_recibo`, `bfx_assinatura` e `bfx_boleto` terminam na variável de URL (`{{3}}`). Se a Meta rejeitar por o corpo terminar em variável, acrescentar um ponto final (ou texto curto) logo após `{{3}}`.

---

## Marketing (categoria sugerida: MARKETING)

Exigem opt-in do cliente e contam como conversa de marketing na cobrança.

| Template | Vars | Corpo sugerido |
|---|---|---|
| `bfx_aniversario` | 1 | `Feliz aniversário, {{1}}! A BFX deseja um dia especial. Passe para conferir nossas novidades. 🎉` |
| `bfx_reativacao` | 1 | `Olá {{1}}! Sentimos sua falta. Temos novidades e condições especiais. Quer ver?` |
| `bfx_recompra` | 1 | `Olá {{1}}! Já faz um tempinho desde sua última compra. Temos novidades esperando por você — quer dar uma olhada?` |
| `bfx_natal` | 1 | `Olá {{1}}! Feliz Natal! A BFX deseja tudo de bom para você e sua família. 🎄` |
| `bfx_ano_novo` | 1 | `Olá {{1}}! Feliz Ano Novo! Que o ano novo traga muitas conquistas. A BFX agradece sua confiança. 🎉` |
| `bfx_dia_cliente` | 1 | `Olá {{1}}! Hoje é o Dia do Cliente e você é muito especial para a BFX. Obrigado por fazer parte! 💙` |
| `bfx_dia_criancas` | 1 | `Olá {{1}}! Feliz Dia das Crianças! A BFX deseja muita alegria neste dia. 🧸` |
| `bfx_dia_namorados` | 1 | `Olá {{1}}! Feliz Dia dos Namorados! A BFX deseja muito amor e carinho. ❤️` |
| `bfx_dia_mulheres` | 1 | `Olá {{1}}! Feliz Dia Internacional da Mulher! A BFX celebra e admira você. 💐` |

Todos: `{{1}}` = nome do cliente.

---

## Ordem de aprovação sugerida

As comemorativas e o transacional são independentes — aprove na ordem da sua necessidade. Sugestão prática:

1. **Primeiro os transacionais de maior uso**: `bfx_lembrete_parcela`, `bfx_parcela_vencida`, `bfx_agradecimento` — são os que rodam todo dia e destravam a virada para a Cloud API.
2. **Depois** os demais transacionais (incluindo `bfx_relatorio_venda`, `bfx_relatorio_semanal`, `bfx_relatorio_mensal`, `bfx_recibo`, `bfx_assinatura`, `bfx_boleto`) e as comemorativas.

## Depois de aprovado cada template

Ligar a flag correspondente no `Config` (só depois do template APROVADO):

| Flag | Liga |
|---|---|
| `whatsappAutoLembrete` (padrão já on) | lembrete de parcela |
| `whatsappAutoInadimplencia` | parcela vencida |
| `whatsappAutoAgradecimento` | agradecimento |
| `whatsappAutoNPS` | pesquisa de satisfação |
| `whatsappAutoBoasVindas` | boas-vindas |
| `whatsappAutoPrimeiraCompra` | primeira compra |
| `whatsappAutoAniversario` | aniversário |
| `whatsappAutoReativacao` | reativação |
| `whatsappAutoRecompra` | recompra |
| `whatsappAutoComemorativas` | as 6 datas comemorativas |

A virada final para a Cloud API é `whatsappProvider = 'meta_cloud'` (ver `docs/whatsapp-cloud-api.md`).
