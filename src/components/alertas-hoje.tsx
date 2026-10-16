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
export function AlertasHoje({ alertas }: { alertas?: AlertasShell }) {
  if (!alertas || alertas.parcelasVencidas === undefined) return null;

  const itens = [
    {
      label: "Assinaturas pendentes",
      n: alertas.assinaturasPendentes,
      // Leva ao Histórico já filtrado (E2a).
      href: "/historico?assinatura=pendente",
      Icone: CircleCheck,
      cor: "text-primary",
    },
    {
      label: "Parcelas vencidas",
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
      <h2 id="alertas-hoje" className="px-3 pb-1.5 text-xs font-medium text-sidebar-muted">
        Alertas de hoje
      </h2>
      {itens.map(({ label, n, href, Icone, cor }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-11 items-center gap-3 rounded-controle px-3 text-sm text-texto-secundario outline-none transition-[background-color,color] duration-[var(--mov-nav)] ease-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none"
        >
          <Icone className={`h-[18px] w-[18px] shrink-0 ${n > 0 ? cor : "text-sidebar-muted"}`} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className={`font-mono text-sm ${n > 0 ? cor : "text-sidebar-muted"}`}>{n}</span>
        </Link>
      ))}
    </section>
  );
}
