import { z } from "zod"

/**
 * Schema de validação para cadastro de produto
 */
export const produtoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  codigo: z.string().optional(),
  precoCusto: z
    .number({
      invalid_type_error: "Preço de custo deve ser um número",
    })
    .min(0, "Preço de custo deve ser positivo"),
  precoVenda: z
    .number({
      invalid_type_error: "Preço de venda deve ser um número",
    })
    .min(0, "Preço de venda deve ser positivo"),
  estoque: z
    .number({
      invalid_type_error: "Estoque deve ser um número",
    })
    .int("Estoque deve ser um número inteiro")
    .min(0, "Estoque não pode ser negativo"),
})

export type ProdutoFormData = z.infer<typeof produtoSchema>
