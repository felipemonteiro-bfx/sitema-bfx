/**
 * Padrão de resposta para Server Actions
 * Garante consistência no tratamento de sucesso/erro
 */

export type ActionResponse<T = void> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

/**
 * Cria uma resposta de sucesso
 */
export function successResponse<T = void>(message?: string, data?: T): ActionResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Cria uma resposta de erro
 */
export function errorResponse<T = void>(error: string): ActionResponse<T> {
  return {
    success: false,
    error,
  };
}
