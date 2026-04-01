---
quick_id: 260401-np7
status: complete
commit: 57b2be9
date: 2026-04-01
---

# Summary: Fix DateInput em Venda Rápida

## Problema

Ao clicar no campo "Data da Venda" em Venda Rápida, o sistema "quebrava" — o formulário era submetido prematuramente.

## Causa Raiz

O componente `DateInput` (`src/components/ui/date-input.tsx`) usa um `<Button>` como `PopoverTrigger`. Em HTML, botões dentro de `<form>` assumem `type="submit"` por padrão quando nenhum tipo é especificado. Ao clicar para abrir o calendário, o form era submetido.

## Fix

Adicionado `type="button"` no `<Button>` dentro do `DateInput`.

**Arquivo alterado:** `src/components/ui/date-input.tsx` (+1 linha)

## Impacto

- Venda Rápida (v1 e v2): campo de data agora abre o calendário corretamente
- Fix global: qualquer outro formulário que use `DateInput` também está protegido
