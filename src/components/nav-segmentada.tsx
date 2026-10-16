import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * Navegação segmentada do cabeçalho (a do atendimento do CRM, reaproveitada pelas demais
 * áreas): controle em trilho `bg-controle` com o item atual em `controle-ativo`.
 * Componente de servidor; a área atual é marcada com `aria-current="page"`.
 */
export type ItemNavSegmentada = { href: string; nome: string; Icone: LucideIcon };

export function NavSegmentada({
  itens,
  atual,
  rotulo,
}: {
  itens: readonly ItemNavSegmentada[];
  atual: string;
  rotulo: string;
}) {
  return (
    <nav aria-label={rotulo} className="flex flex-wrap gap-1 rounded-controle border border-divisoria bg-controle p-1">
      {itens.map(({ href, nome, Icone }) => {
        const ativo = href === atual;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm ${
              ativo ? "bg-controle-ativo font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icone className="size-4" aria-hidden="true" />
            {nome}
          </Link>
        );
      })}
    </nav>
  );
}
