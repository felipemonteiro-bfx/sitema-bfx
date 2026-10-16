import { Gift, HeartHandshake, Megaphone, MessageSquare, Users } from "lucide-react";
import { NavSegmentada } from "@/components/nav-segmentada";

/**
 * Navegação de áreas do CRM: o segmentado do cabeçalho do atendimento, para as demais telas.
 * A área atual é marcada com `aria-current="page"`.
 */
const AREAS = [
  { href: "/crm/atendimento", nome: "Conversas", Icone: MessageSquare },
  { href: "/crm", nome: "Clientes", Icone: Users },
  { href: "/crm/relacionamento", nome: "Relacionamento", Icone: HeartHandshake },
  { href: "/crm/campanhas", nome: "Campanhas", Icone: Megaphone },
  { href: "/crm/fidelidade", nome: "Fidelidade", Icone: Gift },
] as const;

export function NavAreasCrm({ atual }: { atual: string }) {
  return <NavSegmentada itens={AREAS} atual={atual} rotulo="Áreas do CRM" />;
}
