import { z } from "zod"

/**
 * Schema de validação para cadastro de cliente
 */
export const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.enum(["PF", "PJ"]),
  cpfCnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  endereco: z.string().optional(),
  limiteCredito: z
    .number()
    .min(0, "Limite de crédito deve ser positivo")
    .optional(),
})

export type ClienteFormData = z.infer<typeof clienteSchema>
