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

export type UsuarioEscopo = VendedorSessionScope & { id: number };

/**
 * Filtro Prisma das vendas que o usuário da sessão pode ver.
 *
 * O vínculo real é `Venda.vendedorId`; a coluna `vendedor` (texto) é DEPRECATED
 * (schema.prisma) e não é única: dois usuários podem ter o mesmo nome de exibição.
 * Por isso a perna principal é o id. A segunda perna cobre vendas legadas/importadas
 * SEM id (a importação em api/importacao/batch grava `vendedorId: null` quando o texto
 * não bate com nenhum usuário) e exige `vendedorId: null`, para que um texto igual ao
 * nome nunca puxe venda que pertence a outro usuário.
 *
 * Admin: `{}` (sem restrição).
 */
export function whereVendasDoUsuario(session: UsuarioEscopo): {
  OR?: ({ vendedorId: number } | { vendedorId: null; vendedor: string })[];
} {
  if (session.role === "admin") return {};
  const nome = session.nomeExibicao || session.username;
  return { OR: [{ vendedorId: session.id }, { vendedorId: null, vendedor: nome }] };
}
