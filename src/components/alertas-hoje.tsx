import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { AlertasShell } from "@/lib/alertas-shell";

/**
 * Bloco "Alertas de hoje" do rodapé do menu (redesign Vantage, tarefa B). Só admin: o contador
 * de parcelas vencidas só existe na resposta de `carregarAlertasShell` para admin, e o bloco
 * inteiro some quando ele falta — vendedor nunca vê o bloco, mesmo que alguém o monte por engano.
 * Sem estoque (decisão do milestone v1.1). Os dados chegam por prop: quem consulta é o layout,
 * uma vez, porque o conteúdo da sidebar é montado duas vezes (aside e folha mobile).
 */
export function AlertasHoje({ alertas, urlAssinaturas }: { alertas?: AlertasShell; urlAssinaturas: string }) {
  if (!alertas || alertas.parcelasVencidas === undefined) return null;

  const itens = [
    {
      // Duas colunas numa linha só: o rótulo visível é curto e o prefixo vai em `sr-only`, de modo que
      // o nome acessível continua "Assinaturas pendentes" / "Parcelas vencidas".
      curto: "Pendentes",
      prefixo: "Assinaturas ",
      n: alertas.assinaturasPendentes,
      // Leva ao Histórico já filtrado, com a URL única que cobre o mesmo conjunto do contador.
      href: urlAssinaturas,
      Icone: CircleCheck,
      cor: "text-primary",
    },
    {
      curto: "Vencidas",
      // Nome completo para leitores de tela: "Parcelas vencidas".
      prefixo: "Parcelas ",
      n: alertas.parcelasVencidas,
      // O relatório de inadimplência vive em /relatorios ("Outros relatórios"); a rota de
      // download (/api/relatorios/inadimplencia) devolve arquivo, não é página.
      href: "/relatorios",
      Icone: CircleAlert,
      cor: "text-texto-secundario",
    },
  ];

  return (
    <section aria-labelledby="alertas-hoje" className="flex flex-col gap-0.5">
      <h2 id="alertas-hoje" className="px-3 pb-1 text-xs font-medium text-sidebar-muted">
        Alertas de hoje
      </h2>
      <div className="flex items-center justify-between gap-1">
      {itens.map(({ curto, prefixo, n, href, Icone, cor }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-8 items-center gap-1.5 rounded-controle px-2 text-xs text-texto-secundario outline-none transition-[background-color,color] duration-[var(--mov-nav)] ease-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none"
        >
          <Icone className={`h-4 w-4 shrink-0 ${n > 0 ? cor : "text-sidebar-muted"}`} aria-hidden="true" />
          <span className="min-w-0 truncate">
            {prefixo && <span className="sr-only">{prefixo}</span>}
            {curto}
          </span>
          <span className={`font-mono text-xs ${n > 0 ? cor : "text-sidebar-muted"}`}>{n}</span>
        </Link>
      ))}
      </div>
    </section>
  );
}
