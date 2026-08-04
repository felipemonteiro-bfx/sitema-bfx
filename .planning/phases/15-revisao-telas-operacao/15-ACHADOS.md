# Fase 15 — Achados da revisão visual (telas de operação)

**Revisor:** subagente dedicado com a skill `ui-ux-pro-max`
**Método:** Playwright em produção, contraste medido por composição em canvas (resolve `lab()`/`oklab()`),
tema alternado por clique real no dropdown Radix, `getComputedStyle` comparado entre páginas.
**Telas:** `/dashboard`, `/venda-rapida`, `/historico`, `/cadastros` (4 abas), `/importacao` + 2 sub.

> O dono relatou inconsistências depois do v1.2 e **estava certo**. O v1.2 mediu cor→token e o
> contraste dos tokens em `globals.css`, mas nunca inspecionou a tela renderizada. Token correto
> não impede padding divergente, componente errado ou texto quebrado.

## Alta

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 1 | `/importacao/clientes` | `<select>` nativo sem tema | altura 25px vs 40px dos vizinhos; `appearance:auto` |
| 2 | `/importacao` | "Total no Banco" quebra em 3 linhas | rótulo espremido em ~57px com `uppercase tracking-widest` |
| 3 | **todas** | Badge "9+" do sino ilegível no escuro | **contraste 3.37:1** (mínimo 4.5:1 para 10px) |

## Média

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 4 | `/venda-rapida` | "Resumo Financeiro" é o único card sem `bg-card-elevated` | outros 5 cards em `rgb(238,242,247)` |
| 5 | `/venda-rapida` | Títulos de seção divergentes | 5× `<div>` 16px/600 vs 1× `<h3>` 18px/700; sem heading semântico |
| 6 | `/importacao` | `h1` diferente das outras rotas | `font-semibold` + `.gradient-bar` vs `font-bold` nas outras 6 |
| 7 | `/historico` vs `/venda-rapida` | Card com token de fundo diferente | `bg-card` vs `bg-card-elevated` |
| 8 | `/cadastros` (Produtos) | Busca em posição/tamanho diferente das outras abas | 384px em linha própria vs inline com o título |
| 9 | `/cadastros` (Produtos) | `input[type=file]` corta o texto nativo | renderiza "No fil...osen"; classe do `<Input>` não serve para `type=file` |

## Baixa

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 10 | todas | Badge "Admin" na sidebar | contraste 4.39:1 (limiar 4.5:1) |

## OK (registrado para não parecer omissão)

- Nenhuma das 7 rotas tem rolagem horizontal (`scrollWidth === clientWidth` em ambos os temas).

## Causa raiz apontada

Dívida de componente, já catalogada na skill `shadcn-bfx`: **15 `<select>` nativos em 6 arquivos**.
O `<select>` nativo é renderizado pelo SO e ignora o tema da aplicação — é a inconsistência mais
visível no modo escuro.
