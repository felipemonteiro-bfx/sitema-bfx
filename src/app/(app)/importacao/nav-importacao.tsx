import { FileSpreadsheet, ShoppingCart, Truck, Users } from "lucide-react";
import { NavSegmentada } from "@/components/nav-segmentada";

/**
 * Navegação entre os quatro importadores (vendas, clientes, fornecedores, e-Consignado).
 * Antes os três últimos só eram alcançáveis por um cartão no fim da tela de vendas.
 */
const IMPORTADORES = [
  { href: "/importacao", nome: "Vendas", Icone: ShoppingCart },
  { href: "/importacao/clientes", nome: "Clientes", Icone: Users },
  { href: "/importacao/fornecedores", nome: "Fornecedores", Icone: Truck },
  { href: "/importacao/consignado", nome: "e-Consignado", Icone: FileSpreadsheet },
] as const;

export function NavImportacao({ atual }: { atual: string }) {
  return <NavSegmentada itens={IMPORTADORES} atual={atual} rotulo="Tipos de importação" />;
}
