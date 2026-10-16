"use client"

/**
 * Modo discreto (2026-09-24): o olho que oculta valores e dados sensíveis em todas as telas.
 * Fica na barra do topo do conteúdo, ao lado do sino, em qualquer tamanho de tela (o tema desceu
 * para o pé da sidebar a pedido do André). As regras e o porquê do CSS estão em
 * `@/lib/modo-discreto`.
 */

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  CHAVE_DISCRETO,
  aplicarNoDocumento,
  lerPreferencia,
  rotuloDoBotao,
  valorParaGuardar,
} from "@/lib/modo-discreto"

function guardado(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_DISCRETO)
  } catch {
    // Janela anônima ou dados do site bloqueados: o modo simplesmente não é lembrado.
    return null
  }
}

export function ValoresToggle() {
  // Começa desligado no primeiro render para casar com o HTML do servidor (a hidratação compara os
  // dois). Quem já tinha ligado não vê valor nenhum nesse intervalo: o script do `<head>` já
  // marcou o documento antes da primeira pintura — aqui só o ícone se acerta.
  const [oculto, setOculto] = React.useState(false)

  React.useEffect(() => {
    const ligado = lerPreferencia(guardado())
    setOculto(ligado)
    aplicarNoDocumento(document.documentElement, ligado)
  }, [])

  function alternar() {
    const proximo = !oculto
    setOculto(proximo)
    aplicarNoDocumento(document.documentElement, proximo)
    try {
      window.localStorage.setItem(CHAVE_DISCRETO, valorParaGuardar(proximo))
    } catch {
      // Sem armazenamento, vale para esta sessão e pronto.
    }
  }

  const rotulo = rotuloDoBotao(oculto)

  return (
    <Button
      type="button"
      variant={oculto ? "controleAtivo" : "controle"}
      size="icon"
      // `size="icon"` exige nome acessivel (skill shadcn-bfx). O nome e' FIXO e o estado vai
      // no `aria-pressed`: nome que muda junto com o estado faz o leitor anunciar
      // "Mostrar valores, pressionado", que se contradiz. O `title` continua dizendo o que o
      // clique faz, para quem usa mouse.
      aria-label="Ocultar valores"
      aria-pressed={oculto}
      title={rotulo}
      onClick={alternar}
      className="relative touch-manipulation"
    >
      {oculto ? (
        <EyeOff className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Eye className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  )
}
