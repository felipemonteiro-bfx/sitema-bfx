import { z } from "zod"

/**
 * Schema de validação para login
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export type LoginFormData = z.infer<typeof loginSchema>
