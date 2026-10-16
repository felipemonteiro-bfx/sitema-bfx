"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROTULO_TIPO_EMAIL, TIPOS_EMAIL } from "@/lib/email-tipos";

interface Props {
  empresas: { id: number; nome: string }[];
  empresa: string;
  tipo: string;
  mes: string;
  total: number;
}

const TODAS = "todas";

/** Filtros da tela de e-mails enviados: cada troca vai para a URL (e fecha o detalhe aberto). */
export function EmailsFiltros({ empresas, empresa, tipo, mes, total }: Props) {
  const router = useRouter();

  const aplicar = (campo: "empresa" | "tipo" | "mes", valor: string) => {
    const params = new URLSearchParams();
    const atual = { empresa, tipo, mes, [campo]: valor === TODAS ? "" : valor };
    for (const [k, v] of Object.entries(atual)) if (v) params.set(k, v);
    const qs = params.toString();
    router.push(qs ? `/relatorios/emails?${qs}` : "/relatorios/emails");
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="filtro-empresa" className="text-sm font-medium normal-case tracking-normal">Empresa</Label>
        <Select value={empresa || TODAS} onValueChange={(v) => aplicar("empresa", v)}>
          <SelectTrigger id="filtro-empresa" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filtro-tipo" className="text-sm font-medium normal-case tracking-normal">Tipo</Label>
        <Select value={tipo || TODAS} onValueChange={(v) => aplicar("tipo", v)}>
          <SelectTrigger id="filtro-tipo" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todos</SelectItem>
            {TIPOS_EMAIL.map((t) => (
              <SelectItem key={t} value={t}>{ROTULO_TIPO_EMAIL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filtro-mes" className="text-sm font-medium normal-case tracking-normal">Mês</Label>
        <Input id="filtro-mes" type="month" value={mes} onChange={(e) => aplicar("mes", e.target.value)} className="w-44" />
      </div>
      <span className="ml-auto text-sm font-mono text-muted-foreground" aria-live="polite">
        {total === 1 ? "1 e-mail" : `${total} e-mails`}
      </span>
    </div>
  );
}
