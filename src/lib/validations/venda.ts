import { z } from "zod"

/**
 * Schema de validação para venda rápida
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
