import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Início</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((item, i) => (
              <span key={i} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {/* `flex-wrap`: em 390px o grupo de acoes nao tem para onde encolher e o
          excedente vira rolagem horizontal da PAGINA inteira. /importacao era a
          unica rota assim nos dois temas — documento de 393px numa janela de
          390 —, porque as acoes ali sao um bloco de 220px ("Total no Banco" +
          "Baixar Modelo") ao lado de um titulo de duas linhas. Podendo quebrar,
          as acoes descem para a linha de baixo e nada estoura. O `shrink-0`
          impede o caminho oposto: espremer os botoes ate o rotulo deles partir
          em duas linhas (o mesmo par ja resolveu o cabecalho de Produtos em
          /venda-rapida). */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title-gradient text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
