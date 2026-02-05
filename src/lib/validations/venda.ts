import { z } from "zod"

/**
 * Schema de validação para venda rápida
 */
export const vendaRapidaSchema = z.object({
  clienteId: z.number({
    required_error: "Cliente é obrigatório",
    invalid_type_error: "Cliente inválido",
  }).min(1, "Cliente é obrigatório"),
  produtoId: z.number({
    required_error: "Produto é obrigatório",
    invalid_type_error: "Produto inválido",
  }).min(1, "Produto é obrigatório"),
  quantidade: z
    .number({
      required_error: "Quantidade é obrigatória",
      invalid_type_error: "Quantidade deve ser um número",
    })
    .int("Quantidade deve ser um número inteiro")
    .min(1, "Quantidade deve ser pelo menos 1"),
  valorTotal: z
    .number({
      required_error: "Valor total é obrigatório",
      invalid_type_error: "Valor deve ser um número",
    })
    .min(0.01, "Valor total deve ser maior que zero"),
  numeroParcelas: z
    .number({
      required_error: "Número de parcelas é obrigatório",
      invalid_type_error: "Número de parcelas deve ser um número",
    })
    .int("Número de parcelas deve ser um inteiro")
    .min(1, "Deve ter pelo menos 1 parcela")
    .max(12, "Máximo de 12 parcelas"),
  observacoes: z.string().optional(),
})

export type VendaRapidaFormData = z.infer<typeof vendaRapidaSchema>
