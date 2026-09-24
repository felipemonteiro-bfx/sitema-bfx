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
  // `ReactNode` e nao `string` por causa do modo discreto (24/09): descricao que
  // mistura texto e valor precisa envolver so o valor num <span
  // className="valor-sensivel">. Texto puro continua valendo.
  description?: React.ReactNode;
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
      {/* `flex-wrap`: em 390px o grupo de acoes nao tinha para onde ir e o
          excedente virava rolagem horizontal da PAGINA inteira. /importacao era
          a unica rota assim nos dois temas — documento de 393px numa janela de
          390 —, porque as acoes ali sao um bloco de 220px ("Total no Banco" +
          "Baixar Modelo") ao lado de um titulo de duas linhas. Podendo quebrar,
          as acoes descem e nada estoura.

          `shrink-0` nas acoes foi tentado junto e REMOVIDO: medido nas 22
          rotas em 390px, dava exatamente os mesmos numeros (uma vez na propria
          linha, as acoes tem a largura toda e nunca precisam encolher), mas um
          item flex com `shrink:0` e `basis:auto` resolve para max-content — o
          que desliga o `flex-wrap` INTERNO que /crm usa nos tres botoes dele.
          Zero beneficio medido, uma defesa a menos.

          Consequencia aceita: com `justify-between` e um item sozinho na linha
          quebrada, as acoes ficam a ESQUERDA sob o titulo, nao a direita. Em
          telas estreitas isso acompanha o alinhamento do proprio titulo. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
