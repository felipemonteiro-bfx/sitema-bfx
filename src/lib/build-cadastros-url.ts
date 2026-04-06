/**
 * Builds a URL for the /cadastros page merging current search params with new ones.
 */
export function buildCadastrosUrl(
  currentParams: Record<string, string | undefined>,
  newParams: Record<string, string | undefined>
): string {
  const merged = { ...currentParams, ...newParams };
  const search = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) search.set(k, v);
  });
  return `/cadastros?${search.toString()}`;
}
