import { z } from "zod"
import { FORMAS_PAGAMENTO_LIST } from "@/lib/forma-pagamento"

/**
 * Schema de validação para venda rápida (formato antigo)
 */
export const vendaRapidaSchema = z.object({
  clienteId: z
    .number()
    .min(1, "Cliente é obrigatório"),
  produtoId: z
    .number()
    .min(1, "Produto é obrigatório"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(1, "Quantidade deve ser pelo menos 1"),
  valorTotal: z
    .number()
    .min(0.01, "Valor total deve ser maior que zero"),
  numeroParcelas: z
    .number()
    .int("Número de parcelas deve ser um inteiro")
    .min(1, "Deve ter pelo menos 1 parcela")
    .max(12, "Máximo de 12 parcelas"),
  observacoes: z.string().optional(),
})

export type VendaRapidaFormData = z.infer<typeof vendaRapidaSchema>

/**
 * Schema para item de produto na venda V2
 */
export const produtoItemSchema = z.object({
  produtoNome: z.string().min(1, "Nome do produto é obrigatório"),
  custoProduto: z.number().min(0, "Custo não pode ser negativo"),
  // Valor de venda deve ser > 0: impede venda salva com R$ 0,00 (produto sem preço).
  valorVenda: z.number().positive("Informe o valor de venda do produto (maior que zero)"),
  quantidade: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
  subtotal: z.number().positive("Subtotal deve ser maior que zero"),
})

/**
 * Schema para parcela com data de vencimento
 */
const parcelaVencimentoSchema = z.object({
  numeroParcela: z.number().int().min(1),
  dataVencimento: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Data de vencimento inválida"),
  valorParcela: z.number().min(0),
})

export const MSG_CUSTO_ENVIO_OBRIGATORIO =
  "Informe o custo real do envio: há frete cobrado nesta venda."

/** Há frete cobrado, então houve entrega e o custo real do envio é obrigatório. */
export function erroCustoEnvio(frete: number, envio: number): string | null {
  return frete > 0 && !(envio > 0) ? MSG_CUSTO_ENVIO_OBRIGATORIO : null
}

/**
 * Na edição a regra só vale se frete ou envio mudaram em relação ao gravado:
 * venda antiga com frete e custo 0 não pode travar a edição de outro campo.
 */
export function erroCustoEnvioNaEdicao(
  novo: { frete: number; envio: number },
  atual: { frete: number; envio: number } | null,
): string | null {
  if (atual && novo.frete === atual.frete && novo.envio === atual.envio) return null
  return erroCustoEnvio(novo.frete, novo.envio)
}

export const MSG_ENTREGA_OBRIGATORIA = "Escolha Entrega ou Retirada."
export const MSG_RETIRADA_COM_FRETE = "Retirada não pode ter frete cobrado."
export const MSG_CUSTO_ENVIO_ENTREGA = "Informe o custo real do envio: a venda é uma entrega."

type EntregaFrete = { entrega: boolean | null | undefined; frete: number; envio: number }

/** Venda nova: a escolha é obrigatória e entrega exige o custo real do envio. */
export function erroEntrega(v: EntregaFrete): string | null {
  if (v.entrega === null || v.entrega === undefined) return MSG_ENTREGA_OBRIGATORIA
  if (v.entrega && !(v.envio > 0)) return MSG_CUSTO_ENVIO_ENTREGA
  if (!v.entrega && v.frete > 0) return MSG_RETIRADA_COM_FRETE
  return null
}

/**
 * Edição: venda sem alteração em entrega, frete e envio salva sempre. Venda que segue `null`
 * só responde ao piso `frete > 0 ⇒ envio > 0`; qualquer outra segue a regra de venda nova.
 */
export function erroEntregaNaEdicao(
  novo: { entrega: boolean | null; frete: number; envio: number },
  atual: { entrega: boolean | null; frete: number; envio: number } | null,
): string | null {
  if (!atual) return erroEntrega(novo)
  if (novo.entrega === atual.entrega && novo.frete === atual.frete && novo.envio === atual.envio) return null
  if (novo.entrega === null) return erroCustoEnvio(novo.frete, novo.envio)
  return erroEntrega(novo)
}

/** `"1"` = entrega, `"0"` = retirada; qualquer outro valor conta como "não escolhido". */
export function lerEntregaDoForm(v: FormDataEntryValue | null): boolean | undefined {
  if (v === "1") return true
  if (v === "0") return false
  return undefined
}

/**
 * Schema de validação para venda V2 (múltiplos produtos)
 */
export const vendaV2Schema = z.object({
  data: z.string().min(1, "Data da venda é obrigatória").refine((s) => !isNaN(new Date(s).getTime()), "Data inválida"),
  vendedor: z.string().min(1, "Vendedor é obrigatório"),
  clienteId: z.number().int().min(1, "Cliente é obrigatório"),
  frete: z.number().min(0, "Frete não pode ser negativo"),
  envio: z.number().min(0, "Custo de envio não pode ser negativo"),
  parcelas: z.number().int().min(1, "Deve ter pelo menos 1 parcela").max(60, "Máximo de 60 parcelas"),
  temNota: z.boolean(),
  taxaNota: z.number().min(0).max(100, "Taxa de nota deve ser entre 0 e 100"),
  produtos: z.array(produtoItemSchema).min(1, "Adicione pelo menos um produto"),
  parcelasVencimento: z.array(parcelaVencimentoSchema).optional(),
  desconto: z.number().min(0, "Desconto não pode ser negativo").optional().default(0),
  pontosResgatar: z.number().int().min(0, "Pontos a resgatar não pode ser negativo").optional().default(0),
  descontoEmFolha: z.boolean().optional().default(false),
  boleto: z.boolean().optional().default(false),
  formaPagamento: z.enum(FORMAS_PAGAMENTO_LIST as [string, ...string[]]).optional(),
  entrega: z.boolean().optional(),
}).superRefine((v, ctx) => {
  const msg = erroEntrega({ entrega: v.entrega, frete: v.frete, envio: v.envio })
  if (!msg) return
  const path = msg === MSG_ENTREGA_OBRIGATORIA ? "entrega" : msg === MSG_RETIRADA_COM_FRETE ? "entrega" : "envio"
  ctx.addIssue({ code: "custom", path: [path], message: msg })
})

export type VendaV2FormData = z.infer<typeof vendaV2Schema>
