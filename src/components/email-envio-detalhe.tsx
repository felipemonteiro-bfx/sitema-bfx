"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatarTamanho } from "@/lib/email-tipos";
import type { PreviaPlanilha } from "@/lib/xlsx/previa";
import { reenviarEmail } from "@/app/(app)/relatorios/emails/actions";

export type AnexoDetalhe = {
  id: number;
  nome: string;
  contentType: string;
  tamanho: number;
  previa: PreviaPlanilha | null;
};

interface Props {
  fecharHref: string;
  envio: {
    id: number;
    tipo: string;
    empresa: string | null;
    origem: string;
    status: string;
    erro: string | null;
    enviadoEm: string;
    remetente: string;
    para: string;
    cc: string | null;
    assunto: string;
    corpoHtml: string;
  };
  anexos: AnexoDetalhe[];
}

function IconeAnexo({ contentType }: { contentType: string }) {
  const Icone = contentType === "application/pdf" ? FileText : contentType.includes("spreadsheet") ? FileSpreadsheet : Paperclip;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-controle bg-poco text-muted-foreground">
      <Icone className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

function Anexo({ envioId, anexo }: { envioId: number; anexo: AnexoDetalhe }) {
  const [aberto, setAberto] = useState(false);
  const url = `/api/emails/${envioId}/anexos/${anexo.id}`;
  const pdf = anexo.contentType === "application/pdf";
  const previaId = `previa-${anexo.id}`;

  return (
    <li className="space-y-3 rounded-interno bg-card-elevated p-4">
      <div className="flex items-center gap-3">
        <IconeAnexo contentType={anexo.contentType} />
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-medium">{anexo.nome}</div>
          <div className="text-xs text-muted-foreground">{formatarTamanho(anexo.tamanho)}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          {pdf && (
            <a href={`${url}?inline=1`} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Ver
            </a>
          )}
          {anexo.previa && (
            <Button type="button" variant="outline" size="sm" aria-expanded={aberto} aria-controls={previaId} onClick={() => setAberto((v) => !v)}>
              {aberto ? "Ocultar" : "Ver"}
            </Button>
          )}
          <a href={url} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Baixar
          </a>
        </div>
      </div>
      {anexo.previa && aberto && (
        <div id={previaId} className="space-y-1.5 border-t pt-3">
          <div className="text-xs text-muted-foreground">
            Aba {anexo.previa.aba} · {anexo.previa.totalLinhas} linhas
            {anexo.previa.totalLinhas > anexo.previa.linhas.length && ` · mostrando as ${anexo.previa.linhas.length} primeiras`}
          </div>
          <div className="max-h-72 overflow-auto rounded-interno bg-poco">
            <Table tamanho="xs">
              <TableBody>
                {anexo.previa.linhas.map((linha, i) => (
                  <TableRow key={i}>
                    {linha.map((celula, j) => (
                      <TableCell mono key={j} className="whitespace-nowrap px-2 py-1.5">{celula}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </li>
  );
}

/** Painel lateral do e-mail enviado: cabeçalho, arquivos, corpo e reenvio. */
export function EmailEnvioDetalhe({ fecharHref, envio, anexos }: Props) {
  const router = useRouter();
  const [estado, reenviar, reenviando] = useActionState(reenviarEmail, undefined);

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) toast.success("E-mail reenviado.");
    else toast.error(`Não foi possível reenviar: ${estado.erro}`);
  }, [estado]);

  return (
    <Sheet open onOpenChange={(aberto) => !aberto && router.push(fecharHref, { scroll: false })}>
      <SheetContent className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{envio.tipo}</Badge>
            {envio.status === "enviado" ? <Badge variant="success">Enviado</Badge> : <Badge variant="error">Falhou</Badge>}
          </div>
          <SheetTitle>{envio.assunto}</SheetTitle>
          <SheetDescription>{envio.empresa ?? "Sem empresa"}</SheetDescription>
        </SheetHeader>

        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Enviado em</dt>
          <dd className="font-mono">{envio.enviadoEm}</dd>
          <dt className="text-muted-foreground">De</dt>
          <dd className="break-words">{envio.remetente || "—"}</dd>
          <dt className="text-muted-foreground">Para</dt>
          <dd className="break-words">{envio.para}</dd>
          <dt className="text-muted-foreground">Cc</dt>
          <dd className="break-words">{envio.cc ?? "—"}</dd>
          <dt className="text-muted-foreground">Enviado por</dt>
          <dd>{envio.origem}</dd>
          {envio.erro && (
            <>
              <dt className="text-muted-foreground">Erro</dt>
              <dd className="break-words text-error-text">{envio.erro}</dd>
            </>
          )}
        </dl>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Anexos ({anexos.length})</h3>
          {anexos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este e-mail não teve anexos.</p>
          ) : (
            <ul className="space-y-2">
              {anexos.map((a) => (
                <Anexo key={a.id} envioId={envio.id} anexo={a} />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Corpo do e-mail</h3>
          <iframe
            title={`Corpo do e-mail: ${envio.assunto}`}
            sandbox=""
            srcDoc={envio.corpoHtml}
            className="h-[28rem] w-full rounded-interno bg-background"
          />
          <p className="text-xs text-muted-foreground">Como o RH recebeu.</p>
        </section>

        <form action={reenviar} className="mt-auto flex justify-end border-t pt-4">
          <input type="hidden" name="envioId" value={envio.id} />
          <Button type="submit" variant="outline" loading={reenviando}>
            Reenviar
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
