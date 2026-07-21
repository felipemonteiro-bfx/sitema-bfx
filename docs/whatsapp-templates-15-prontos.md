# 15 templates prontos para aprovar — WhatsApp Manager

Aprove estes 15 já. Os 6 restantes (relatório, recibo, assinatura, boleto) já foram corrigidos no código e estão prontos em `docs/whatsapp-templates-meta.md`.

**Ao criar cada um:** Idioma = **Português (BR)** / `pt_BR`. Nome EXATO (não dá pra renomear depois). Nº de variáveis = coluna Vars. Categoria conforme indicado.

---

## UTILITY (6)

**`bfx_lembrete_parcela`** — 5 vars (1=nome, 2=nº parcela, 3=nº venda, 4=vencimento, 5=valor)
```
Olá {{1}}! Lembrete: a parcela {{2}} da venda #{{3}} vence em {{4}}. Valor: {{5}}. Evite atraso.
```

**`bfx_parcela_vencida`** — 4 vars (1=nome, 2=nº parcela, 3=nº venda, 4=valor)
```
Olá {{1}}, a parcela {{2}} da venda #{{3}} venceu. Valor: {{4}}. Regularize assim que possível para evitar juros.
```

**`bfx_agradecimento`** — 1 var (nome)
```
Olá {{1}}! Como foi sua compra? Estamos à disposição para qualquer dúvida. Obrigado por escolher a BFX!
```

**`bfx_nps`** — 2 vars (1=nome, 2=nº venda)
```
Olá {{1}}! Como você avalia sua experiência na compra da venda #{{2}}? Responda de 0 a 10.
```

**`bfx_boas_vindas`** — 1 var (nome)
```
Bem-vindo(a), {{1}}! Obrigado pela primeira compra. Em caso de dúvidas, estamos à disposição.
```

**`bfx_primeira_compra`** — 1 var (nome)
```
Olá {{1}}! Que alegria ter você como cliente da BFX pela primeira vez. Qualquer coisa, é só chamar. Seja bem-vindo(a)!
```

---

## MARKETING (9) — exigem opt-in

**`bfx_aniversario`** — 1 var (nome)
```
Feliz aniversário, {{1}}! A BFX deseja um dia especial. Passe para conferir nossas novidades. 🎉
```

**`bfx_reativacao`** — 1 var (nome)
```
Olá {{1}}! Sentimos sua falta. Temos novidades e condições especiais. Quer ver?
```

**`bfx_recompra`** — 1 var (nome)
```
Olá {{1}}! Já faz um tempinho desde sua última compra. Temos novidades esperando por você — quer dar uma olhada?
```

**`bfx_natal`** — 1 var (nome)
```
Olá {{1}}! Feliz Natal! A BFX deseja tudo de bom para você e sua família. 🎄
```

**`bfx_ano_novo`** — 1 var (nome)
```
Olá {{1}}! Feliz Ano Novo! Que o ano novo traga muitas conquistas. A BFX agradece sua confiança. 🎉
```

**`bfx_dia_cliente`** — 1 var (nome)
```
Olá {{1}}! Hoje é o Dia do Cliente e você é muito especial para a BFX. Obrigado por fazer parte! 💙
```

**`bfx_dia_criancas`** — 1 var (nome)
```
Olá {{1}}! Feliz Dia das Crianças! A BFX deseja muita alegria neste dia. 🧸
```

**`bfx_dia_namorados`** — 1 var (nome)
```
Olá {{1}}! Feliz Dia dos Namorados! A BFX deseja muito amor e carinho. ❤️
```

**`bfx_dia_mulheres`** — 1 var (nome)
```
Olá {{1}}! Feliz Dia Internacional da Mulher! A BFX celebra e admira você. 💐
```

---

**Exemplo de valores** que a Meta pede ao criar (para a prévia): para `{{1}}` use "Maria"; para os numéricos, use "3", "R$ 150,00", "amanhã" etc. Não afeta o envio real — é só amostra para a revisão.
