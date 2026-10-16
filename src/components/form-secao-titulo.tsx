import { Separator } from "@/components/ui/separator";

interface Props {
  children: React.ReactNode;
}

/**
 * Titulo de secao para formularios em grid (`grid gap-4 md:grid-cols-3`), usado para
 * agrupar campos de assuntos diferentes sem reestruturar o grid nem tocar em nenhum
 * `name=` — cada instancia e um item de largura total do grid, seguido de um
 * `Separator`.
 *
 * Arquivo proprio (nao um export de `edit-venda-historico-form.tsx`) porque
 * `edit-venda-com-parcelas.tsx` tambem precisa dele e o import cruzado seria
 * circular (D-05).
 */
export function FormSecaoTitulo({ children }: Props) {
  return (
    <div className="md:col-span-3 space-y-2 pt-2 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">
        {children}
      </h3>
      <Separator />
    </div>
  );
}
