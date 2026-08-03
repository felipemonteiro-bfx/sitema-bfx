# Evidência UXP-04: origem do "amarelo" relatado pelo cliente

**Requisito:** UXP-04 — origem do "amarelo" relatado pelo cliente determinada com evidência
(mesmo build, sem filtro de tela) antes de qualquer alteração de token.

**Satisfeito durante o discuss, em 2026-08-03**, antes de qualquer alteração de token — que é
literalmente o que o requisito exige ("antes de qualquer alteração de token"). Este artefato só
versiona e torna verificável a investigação já registrada em `08-CONTEXT.md`; a Task 2 do plano
08-03 **transcreve, não reinvestiga** (nenhum comando de cluster foi executado para produzir este
documento).

## Pergunta investigada

O "amarelo" que aparece nos 3 screenshots enviados pelo cliente vem do CSS, de um build velho
rodando em produção, ou de um filtro de tela do lado do cliente?

## Evidência 1 — build em produção

A imagem rodando é `bfx-shop:88268e909239e35b65bbdfb2da52bea6b9931af1` — o commit `88268e9`,
feito no mesmo dia da investigação (2026-08-03). A hipótese "build desatualizado" está
**descartada**: produção não está rodando código antigo.

## Evidência 2 — CSS realmente servido

O chunk `/app/.next/static/chunks/cdaa6f7fb61cc7c2.css`, dentro do pod, define:

- `--background: #fdfaf3`
- `--card: #fffdf8`

Esse é o CSS que o navegador do cliente efetivamente baixa e aplica — não um valor de fonte ou de
build local desatualizado.

## Evidência 3 — leitura das cores

`#fdfaf3` e `#fffdf8` são off-white **creme**, levemente quentes. Nenhum dos dois é o amarelo
saturado e uniforme que aparece nos 3 screenshots do cliente — inclusive cobrindo áreas que o CSS
manda ser quase brancas (cards, `--card: #fffdf8`).

## Conclusão dupla

Nas duas direções, sem suavizar nenhuma:

1. **O amarelo forte e uniforme dos 3 prints é filtro de tela do lado do cliente** (Night Shift /
   f.lux / modo leitura). Nada no código produz um amarelo saturado cobrindo até áreas quase
   brancas — o CSS servido em produção não tem esse valor em lugar nenhum do tema claro.
2. **O cliente não está imaginando coisas.** O fundo tem, sim, tom quente: `#fdfaf3` não é branco
   neutro. É exatamente isso que a demanda 6 ("trocar cor amarela por branco") descreve.

## Consequência no plano

Por isso `UXP-05` vira **D-01** (zerar o croma dos quatro tokens de fundo do tema claro) e não
"aplicar a paleta da marca" (**D-02**, bloqueada — ver `08-EVIDENCE-UXP-04.md` e `REQUIREMENTS.md`
UXP-06). E por isso a Fase 8 não carrega nenhuma task de investigação: a investigação já aconteceu
no discuss, com evidência de produção, e este artefato só a torna rastreável e verificável em vez
de "a gente investigou, confia".

## Como reverificar sem acessar o cluster

1. Rodar o one-liner de croma da Task 1 do plano `08-03-PLAN.md` (verifica que `--background`,
   `--card`, `--popover` e `--glass-bg` do tema claro têm croma 0 em `src/app/globals.css`).
2. Comparar visualmente um print do tema claro do sistema **com filtro de tela desligado**
   (Night Shift / f.lux / modo leitura) contra os 3 screenshots originais do cliente — o fundo deve
   ler como branco/cinza neutro, não amarelo.

Nenhuma variável de ambiente, secret, token, URL autenticada ou dump de manifesto foi incluído
neste documento — apenas digest de imagem, caminho de chunk estático (servido publicamente pelo
Next.js) e valores de cor, que não são segredo.
