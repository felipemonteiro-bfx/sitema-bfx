"use client";

/**
 * Regras por período da empresa conveniada (spec 2026-09-30 §3.1): corte, vencimento das
 * parcelas, dia do Pix do fechamento, repasse e a chave "Cobrança via BFX". Fica no painel de
 * edição da empresa, fora do formulário dela (formulário aninhado não é HTML válido).
 */
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { salvarRegraEmpresa, excluirRegraEmpresa } from "@/app/(app)/cadastros/regras-actions";
import { REGRA_PADRAO } from "@/lib/regra-empresa";

export type RegraEmpresaLinha = {
  id: number;
  vigenteDe: Date;
  vigenteAte: Date | null;
  diaCorte: number;
  diaVencimento: number;
  diaPix: number;
  repassePct: number | null;
  cobrancaViaBfx: boolean;
};

/** Data pura em UTC → `AAAA-MM-DD` (valor do `<input type="date">`). */
const isoDe = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
/** Data pura em UTC → `DD/MM/AAAA`, sem passar pelo fuso do navegador. */
const brDe = (d: Date) => isoDe(d).split("-").reverse().join("/");
const pct = (n: number) => `${String(n).replace(".", ",")}%`;

export function RegrasEmpresaSection({ empresaParceiraId, regras }: { empresaParceiraId: number; regras: RegraEmpresaLinha[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<RegraEmpresaLinha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  // Remonta o formulário (e zera os campos não controlados) depois de salvar.
  const [versaoForm, setVersaoForm] = useState(0);

  const ordenadas = [...regras].sort((a, b) => new Date(a.vigenteDe).getTime() - new Date(b.vigenteDe).getTime());

  const fecharEdicao = () => {
    setEditando(null);
    setErro(null);
    setVersaoForm((v) => v + 1);
  };

  const handleSalvar = async (formData: FormData) => {
    setSalvando(true);
    setErro(null);
    try {
      const r = await salvarRegraEmpresa(formData);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success(editando ? "Regra atualizada." : "Regra salva.");
      fecharEdicao();
      startTransition(() => router.refresh());
    } catch {
      setErro("Não foi possível salvar a regra. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!editando) return;
    setExcluindo(true);
    try {
      const r = await excluirRegraEmpresa(editando.id);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success("Regra excluída.");
      fecharEdicao();
      startTransition(() => router.refresh());
    } catch {
      setErro("Não foi possível excluir a regra. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  };

  const campo = (nome: string) => `regra-${empresaParceiraId}-${nome}`;
  const inicial = editando ?? null;

  return (
    <section aria-labelledby={campo("titulo")} className="grid gap-4">
      <div className="space-y-1">
        <h3 id={campo("titulo")} className="text-base font-semibold text-foreground">Regras por período</h3>
        <p className="text-sm text-muted-foreground">
          Sem regra, a empresa segue o padrão de hoje: corte dia {REGRA_PADRAO.diaCorte}, vencimento dia{" "}
          {REGRA_PADRAO.diaVencimento}, Pix dia {REGRA_PADRAO.diaPix}, sem repasse.
        </p>
      </div>

      {ordenadas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Vigência</TableHead>
                <TableHead>Corte</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pix</TableHead>
                <TableHead>Repasse</TableHead>
                <TableHead>Cobrança via BFX</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((r) => (
                <TableRow key={r.id} aria-current={editando?.id === r.id ? "true" : undefined} className={editando?.id === r.id ? "bg-muted/50" : undefined}>
                  <TableCell className="whitespace-nowrap font-semibold">
                    {brDe(r.vigenteDe)} → {r.vigenteAte ? brDe(r.vigenteAte) : "em aberto"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">dia {r.diaCorte}</TableCell>
                  <TableCell className="whitespace-nowrap">dia {r.diaVencimento}</TableCell>
                  <TableCell className="whitespace-nowrap">dia {r.diaPix}</TableCell>
                  <TableCell>{r.repassePct === null ? <span className="text-muted-foreground">—</span> : pct(r.repassePct)}</TableCell>
                  <TableCell>
                    <Badge variant={r.cobrancaViaBfx ? "success" : "secondary"}>{r.cobrancaViaBfx ? "ligada" : "desligada"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditando(r);
                        setErro(null);
                        setVersaoForm((v) => v + 1);
                      }}
                      aria-label={`Editar regra de ${brDe(r.vigenteDe)}`}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <form key={versaoForm} action={handleSalvar} aria-labelledby={campo("form-titulo")} className="grid gap-4 rounded-xl border p-4">
        <h4 id={campo("form-titulo")} className="text-sm font-semibold text-foreground">
          {inicial ? `Editar regra de ${brDe(inicial.vigenteDe)}` : "Nova regra"}
        </h4>
        <input type="hidden" name="empresaParceiraId" value={empresaParceiraId} />
        {inicial && <input type="hidden" name="id" value={inicial.id} />}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={campo("de")}>
              Início <span className="font-normal text-muted-foreground">dia 1º</span>
            </Label>
            <Input id={campo("de")} name="vigenteDe" type="date" required defaultValue={isoDe(inicial?.vigenteDe ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={campo("ate")}>
              Fim <span className="font-normal text-muted-foreground">opcional · dia 1º, não incluso</span>
            </Label>
            <Input id={campo("ate")} name="vigenteAte" type="date" defaultValue={isoDe(inicial?.vigenteAte ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={campo("corte")}>Dia de corte</Label>
            <Input id={campo("corte")} name="diaCorte" type="number" min={1} max={28} step={1} required defaultValue={inicial?.diaCorte ?? REGRA_PADRAO.diaCorte} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={campo("venc")}>Dia de vencimento</Label>
            <Input id={campo("venc")} name="diaVencimento" type="number" min={1} max={28} step={1} required defaultValue={inicial?.diaVencimento ?? REGRA_PADRAO.diaVencimento} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={campo("pix")}>Dia do Pix</Label>
            <Input id={campo("pix")} name="diaPix" type="number" min={1} max={28} step={1} required defaultValue={inicial?.diaPix ?? REGRA_PADRAO.diaPix} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={campo("repasse")}>Repasse %</Label>
            <Input
              id={campo("repasse")}
              name="repassePct"
              inputMode="decimal"
              autoComplete="off"
              placeholder="sem repasse"
              defaultValue={inicial?.repassePct == null ? "" : String(inicial.repassePct).replace(".", ",")}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 border-t pt-4">
          <Checkbox id={campo("bfx")} name="cobrancaViaBfx" defaultChecked={inicial?.cobrancaViaBfx ?? false} aria-describedby={campo("bfx-ajuda")} className="mt-0.5" />
          <div className="grid gap-1 text-sm">
            <Label htmlFor={campo("bfx")} className="font-semibold">Cobrança via BFX</Label>
            <p id={campo("bfx-ajuda")} className="text-muted-foreground">
              A empresa paga um Pix por mês e a BFX quita os boletos da Prudent. Só ligue depois da confirmação formal da Prudent.
            </p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {inicial && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="mr-auto text-destructive hover:text-destructive" disabled={excluindo}>
                    Excluir regra
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir a regra de {brDe(inicial.vigenteDe)}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sem ela, esse período volta ao padrão (corte dia {REGRA_PADRAO.diaCorte}, vencimento dia {REGRA_PADRAO.diaVencimento}). Vendas já
                      gravadas não mudam.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={excluindo} onClick={handleExcluir}>
                      {excluindo ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="outline" onClick={fecharEdicao}>
                Cancelar edição
              </Button>
            </>
          )}
          <Button type="submit" loading={salvando}>
            Salvar regra
          </Button>
        </div>
      </form>
    </section>
  );
}
