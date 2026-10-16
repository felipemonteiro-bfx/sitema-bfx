'use client';

import { useState, startTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskedInput } from "@/components/masked-input";
import { cn } from "@/lib/utils";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useTableFeatures } from "@/hooks/use-table-features";
import { alternarSelecaoDaPagina, contarSelecionadosForaDaPagina, estadoCheckboxDaPagina } from "@/lib/selecao-em-massa";
import { TablePagination } from "@/components/table-pagination";
import { SortableHeader } from "@/components/sortable-header";
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
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { diaEfetivoRelatorioMensal } from "@/lib/relatorio-mensal-config";
import { normalizarEmailsCopia } from "@/lib/email-copia";
import { Separator } from "@/components/ui/separator";
import { RegrasEmpresaSection, type RegraEmpresaLinha } from "@/components/regras-empresa-section";

type EmpresaListItem = {
  id: number;
  nome: string;
  responsavelRh: string | null;
  telefoneRh: string | null;
  emailRh: string | null;
  cnpj: string | null;
  emailsExtras: string | null;
  emailCopia: string | null;
  diaRelatorioMensal: number | null;
  vinculos?: { vinculada: { id: number; nome: string } }[];
  _count?: { clientes: number };
};

interface Props {
  empresas: EmpresaListItem[];
  editEmpresaData?: EmpresaListItem | null;
  /** Regras por período de cada empresa, pelo id (spec 2026-09-30 §3.1). */
  regrasPorEmpresa?: Record<number, RegraEmpresaLinha[]>;
  searchQuery?: string;
  searchParams: Record<string, string | undefined>;
  onAddAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onBulkDeleteAction: (ids: number[]) => Promise<void>;
  onVincularAction?: (empresaId: number, vinculadaIds: number[]) => Promise<void>;
}

/**
 * Bloco "RH e e-mails" do cadastro e da edição. Cada e-mail diz o que recebe:
 * o RH recebe termo e relatórios, "Em cópia" recebe junto tudo o que vai ao RH,
 * e "Aviso de cada venda" (campo `emailsExtras`) só o aviso de venda nova.
 */
function CamposRhEmails({ prefixo, empresa }: { prefixo: string; empresa?: EmpresaListItem | null }) {
  const campo = (nome: string) => `${prefixo}-empresa-${nome}`;
  return (
    <fieldset className="grid gap-3 rounded-interno bg-card-elevated p-4">
      <legend className="px-1.5 text-sm font-semibold text-muted-foreground">RH e e-mails</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={campo("rh")}>Responsável RH</Label>
          <Input id={campo("rh")} name="rh" defaultValue={empresa?.responsavelRh || ""} placeholder="Responsável RH" className="uppercase" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={campo("tel")}>Telefone RH</Label>
          <MaskedInput id={campo("tel")} name="tel" mask="phone" defaultValue={empresa?.telefoneRh || ""} />
        </div>
      </div>
      <div className={cn("grid gap-3", prefixo === "add" && "md:grid-cols-3")}>
        <div className="space-y-1">
          <Label htmlFor={campo("email")}>E-mail do RH</Label>
          <Input id={campo("email")} name="email" type="email" defaultValue={empresa?.emailRh || ""} placeholder="rh@empresa.com.br" aria-describedby={campo("email-ajuda")} />
          <p id={campo("email-ajuda")} className="text-xs text-muted-foreground">Recebe o termo assinado e os relatórios.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={campo("emailCopia")}>Em cópia</Label>
          <Input id={campo("emailCopia")} name="emailCopia" inputMode="email" autoComplete="off" defaultValue={empresa?.emailCopia || ""} placeholder="nome@prudent.com.br" aria-describedby={campo("emailCopia-ajuda")} />
          <p id={campo("emailCopia-ajuda")} className="text-xs text-muted-foreground">Recebe junto tudo o que vai ao RH (ex.: Prudent). Vários: separe por vírgula.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={campo("emailsExtras")}>Aviso de cada venda</Label>
          <Input id={campo("emailsExtras")} name="emailsExtras" defaultValue={empresa?.emailsExtras || ""} placeholder="email1@x.com, email2@y.com" aria-describedby={campo("emailsExtras-ajuda")} />
          <p id={campo("emailsExtras-ajuda")} className="text-xs text-muted-foreground">Recebe um aviso a cada venda nova.</p>
        </div>
      </div>
    </fieldset>
  );
}

/** Recusa antes de enviar: a server action também valida, mas o erro dela chega ao toast sem o endereço. */
function emailCopiaInvalido(formData: FormData): string | null {
  const r = normalizarEmailsCopia(String(formData.get("emailCopia") ?? ""));
  return r.ok ? null : `E-mail em cópia inválido: ${r.invalidos.join(", ")}`;
}

export default function EmpresasTabClient({
  empresas,
  editEmpresaData,
  regrasPorEmpresa = {},
  searchQuery,
  searchParams: sp,
  onAddAction,
  onUpdateAction,
  onBulkDeleteAction,
  onVincularAction,
}: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaListItem | null>(null);
  const [vinculandoId, setVinculandoId] = useState<number | null>(null);
  const [vinculacaoIds, setVinculacaoIds] = useState<Set<number>>(new Set());
  const [savingVinculo, setSavingVinculo] = useState(false);

  const handleAdd = async (formData: FormData) => {
    const invalido = emailCopiaInvalido(formData);
    if (invalido) {
      toast.error(invalido);
      return;
    }
    setSubmittingAdd(true);
    try {
      await onAddAction(formData);
      toast.success("Empresa salva com sucesso!");
      // Sem isso a lista so mostra o registro novo depois de F5. handleUpdate e
      // handleBulkDelete ja faziam; o cadastro tinha ficado de fora.
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    const invalido = emailCopiaInvalido(formData);
    if (invalido) {
      toast.error(invalido);
      return;
    }
    setSubmittingUpdate(true);
    try {
      await onUpdateAction(formData);
      toast.success("Empresa atualizada com sucesso!");
      setEditingEmpresa(null);
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao atualizar. Tente novamente.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const table = useTableFeatures({
    data: empresas as (EmpresaListItem & Record<string, unknown>)[],
    searchFields: ["nome", "cnpj", "responsavelRh", "emailRh", "telefoneRh"] as (keyof EmpresaListItem)[],
    defaultSort: "nome" as keyof EmpresaListItem,
  });

  // O cabecalho vale para a pagina visivel, nao para o dataset inteiro.
  const idsVisiveis = useMemo(
    () => (table.paginatedData as unknown as EmpresaListItem[]).map((e) => e.id),
    [table.paginatedData]
  );
  const estadoSelecaoCabecalho = estadoCheckboxDaPagina(selectedIds, idsVisiveis);
  // A selecao sobrevive a troca de pagina e ao filtro; sem avisar, da para
  // confirmar uma exclusao de registros que nao estao na tela.
  const selecionadosForaDaPagina = contarSelecionadosForaDaPagina(selectedIds, idsVisiveis);

  const handleSelectAll = useCallback((checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => alternarSelecaoDaPagina(prev, idsVisiveis, checked === true));
  }, [idsVisiveis]);

  const handleSelectOne = useCallback((id: number, checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleting(true);
    try {
      await onBulkDeleteAction(Array.from(selectedIds));
      setSelectedIds(new Set());
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBulkDeleting(false);
    }
  }, [onBulkDeleteAction, selectedIds, router]);

  const openVinculos = (empresa: EmpresaListItem) => {
    const currentIds = new Set((empresa.vinculos || []).map((v) => v.vinculada.id));
    setVinculacaoIds(currentIds);
    setVinculandoId(empresa.id);
  };

  const toggleVinculo = (id: number) => {
    const next = new Set(vinculacaoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setVinculacaoIds(next);
  };

  const saveVinculos = async () => {
    if (vinculandoId == null || !onVincularAction) return;
    setSavingVinculo(true);
    try {
      await onVincularAction(vinculandoId, Array.from(vinculacaoIds));
      toast.success("Vínculos atualizados.");
      setVinculandoId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Não foi possível salvar os vínculos. Tente novamente.");
    } finally {
      setSavingVinculo(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nova Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleAdd} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="add-empresa-nome">Empresa <span className="text-destructive">*</span></Label>
                <Input id="add-empresa-nome" name="nome" placeholder="Empresa" aria-required="true" className="uppercase" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-empresa-cnpj">CNPJ</Label>
                <Input id="add-empresa-cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-empresa-dia-relatorio">Dia do relatório mensal</Label>
                <Input
                  id="add-empresa-dia-relatorio"
                  name="diaRelatorioMensal"
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  defaultValue={diaEfetivoRelatorioMensal(null)}
                />
              </div>
            </div>
            <CamposRhEmails prefixo="add" />
            <div className="flex items-center justify-end">
              <Button type="submit" loading={submittingAdd}>Salvar Empresa</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle>Empresas Parceiras</CardTitle>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar empresas…"
              aria-label="Pesquisar empresas"
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              className={cn("pl-9 h-9", table.search && "pr-8")}
            />
            {table.search && (
              <Button type="button" variant="discreto" size="iconXs" onClick={() => table.setSearch("")} aria-label="Limpar busca" className="absolute right-1 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-interno bg-poco px-4 py-2 mb-2">
              <span className="text-sm font-medium">
                {selectedIds.size === 1 ? "1 selecionada" : `${selectedIds.size} selecionadas`}
                {selecionadosForaDaPagina > 0 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({selecionadosForaDaPagina} fora desta página)
                  </span>
                )}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                    <Trash2 className="h-4 w-4" />
                    Excluir selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{selectedIds.size === 1 ? "Excluir 1 empresa" : `Excluir ${selectedIds.size} empresas`}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita.
                      {selecionadosForaDaPagina > 0 && (
                        <strong className="block mt-2 font-medium text-foreground">
                          {selecionadosForaDaPagina === 1 ? "1 delas não está nesta página." : `${selecionadosForaDaPagina} delas não estão nesta página.`}
                        </strong>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={bulkDeleting}
                      onClick={handleBulkDelete}
                    >
                      {bulkDeleting ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-interno bg-poco p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-11">
                  <Checkbox
                    aria-label="Selecionar todos"
                    checked={estadoSelecaoCabecalho}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader label="Nome" field="nome" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="CNPJ" field="cnpj" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="RH" field="responsavelRh" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <SortableHeader label="Contato" field="emailRh" currentField={table.sortField as string} currentDir={table.sortDir} onSort={(f) => table.toggleSort(f as keyof EmpresaListItem)} />
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead>Vinculadas</TableHead>
                <SortableHeader label="" field="_" currentDir="asc" onSort={() => {}} className="w-20 cursor-default hover:bg-transparent" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState variant="folder" size="sm" title="Nenhuma empresa encontrada" description={table.search ? "Tente outro termo de busca." : "Cadastre a primeira empresa acima."} />
                  </TableCell>
                </TableRow>
              ) : (
                (table.paginatedData as unknown as EmpresaListItem[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${e.nome}`}
                        checked={selectedIds.has(e.id)}
                        onCheckedChange={(checked) => handleSelectOne(e.id, checked)}
                      />
                    </TableCell>
                    <TableCell peso="medio">{e.nome}</TableCell>
                    <TableCell tom="muted" tamanho="xs" mono>{e.cnpj || "—"}</TableCell>
                    <TableCell>{e.responsavelRh || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {!e.telefoneRh && !e.emailRh && !e.emailCopia && <span className="text-muted-foreground">—</span>}
                      {e.telefoneRh && <div>{e.telefoneRh}</div>}
                      {e.emailRh && <div className="text-xs text-muted-foreground">{e.emailRh}</div>}
                      {e.emailCopia && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">Cc</span> {e.emailCopia}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", (e._count?.clientes ?? 0) > 0 ? "bg-info-bg text-info-text" : "text-muted-foreground")}>
                        {e._count?.clientes ?? 0}
                      </span>
                    </TableCell>
                    <TableCell tamanho="xs">
                      {(e.vinculos || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(e.vinculos || []).map((v) => (
                            <span key={v.vinculada.id} className="inline-block rounded bg-info-bg px-1.5 py-0.5 text-xs text-info-text border border-info/20">
                              {v.vinculada.nome}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onVincularAction && (
                          <Button size="xs"
                            type="button"
                            variant="discreto"
                            onClick={() => openVinculos(e)}

                            title="Gerenciar vínculos"
                            aria-label={`Vínculos de ${e.nome}`}
                          >
                            Vincular
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="discreto"
                          size="iconSm"
                          onClick={() => setEditingEmpresa(e)}

                          title="Editar"
                          aria-label={`Editar ${e.nome}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          <TablePagination page={table.page} totalPages={table.totalPages} totalFiltered={table.totalFiltered} totalItems={empresas.length} onPageChange={table.setPage} />
        </CardContent>
      </Card>

      <Sheet open={!!editingEmpresa} onOpenChange={(open) => !open && setEditingEmpresa(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Editar empresa</SheetTitle>
            <SheetDescription>{editingEmpresa?.nome}</SheetDescription>
          </SheetHeader>
          {editingEmpresa && (
            <form action={handleUpdate} className="grid gap-4 mt-4">
              {/* Exceção legítima: <input hidden> leva o valor do estado ao FormData; não tem pegada visual. */}
              <input type="hidden" name="id" value={editingEmpresa.id} />
              <div className="space-y-1">
                <Label htmlFor="edit-empresa-nome">Empresa <span className="text-destructive">*</span></Label>
                <Input id="edit-empresa-nome" name="nome" defaultValue={editingEmpresa.nome} placeholder="Empresa" aria-required="true" className="uppercase" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-cnpj">CNPJ</Label>
                  <Input id="edit-empresa-cnpj" name="cnpj" defaultValue={editingEmpresa.cnpj || ""} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-empresa-dia-relatorio">Dia do relatório mensal</Label>
                  <Input
                    id="edit-empresa-dia-relatorio"
                    name="diaRelatorioMensal"
                    type="number"
                    min={1}
                    max={31}
                    step={1}
                    defaultValue={diaEfetivoRelatorioMensal(editingEmpresa.diaRelatorioMensal)}
                  />
                </div>
              </div>
              <CamposRhEmails prefixo="edit" empresa={editingEmpresa} />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingEmpresa(null)}>Cancelar</Button>
                <Button type="submit" loading={submittingUpdate}>Salvar alterações</Button>
              </div>
            </form>
          )}
          {editingEmpresa && (
            <>
              <Separator className="my-6" />
              <RegrasEmpresaSection empresaParceiraId={editingEmpresa.id} regras={regrasPorEmpresa[editingEmpresa.id] ?? []} />
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={vinculandoId !== null && !!onVincularAction} onOpenChange={(open) => !open && setVinculandoId(null)}>
        <SheetContent className="flex flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Vínculos</SheetTitle>
            <SheetDescription>
              {empresas.find((e) => e.id === vinculandoId)?.nome}: marque as empresas do mesmo grupo. O relatório mensal
              do grupo vai num e-mail só.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-2">
            {empresas
              .filter((e) => e.id !== vinculandoId)
              .map((e) => (
                // Estado React enviado por fetch/JSON — nao passa por
                // FormData, entao aqui e o `<Checkbox>` direto: um campo
                // oculto seria um campo sem dono. Nao ha selecao em massa
                // neste bloco (cada vinculo e independente), logo nao existe
                // estado indeterminado a tratar — o `toggleVinculo` ignora o
                // valor recebido e alterna a partir do Set.
                <Label variant="cartao" key={e.id} htmlFor={`vinculo-${e.id}`}>
                  <Checkbox
                    id={`vinculo-${e.id}`}
                    checked={vinculacaoIds.has(e.id)}
                    onCheckedChange={() => toggleVinculo(e.id)}
                    aria-label={`Vincular ${e.nome}`}
                  />
                  {e.nome}
                </Label>
              ))}
          </div>
          <div className="mt-auto flex items-center justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => setVinculandoId(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveVinculos} loading={savingVinculo}>
              Salvar vínculos
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
