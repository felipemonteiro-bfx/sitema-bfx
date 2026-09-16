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
})

export type VendaV2FormData = z.infer<typeof vendaV2Schema>
