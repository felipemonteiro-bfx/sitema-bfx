export type VendedorSessionScope = {
  role: string;
  nomeExibicao?: string | null;
  username: string;
};

/**
 * Resolve qual "vendedor" deve ser usado num filtro de consulta/relatório.
 *
 * Quando `session` é passada e o papel não é "admin", o parâmetro vindo da
 * query string é ignorado e o resultado é travado no próprio usuário — evita
 * que um vendedor consulte dados (comissão, vendas, relatórios) de outro só
 * trocando o parâmetro na URL (IDOR).
 */
export function resolveVendedorScope(
  vendedorParam: string | undefined,
  session: VendedorSessionScope | null
): string | undefined {
  if (session && session.role !== "admin") {
    return session.nomeExibicao || session.username;
  }
  return vendedorParam;
}
