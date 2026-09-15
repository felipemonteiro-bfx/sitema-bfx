import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/page-header";
import ImportacaoConsignadoClient from "@/components/importacao-consignado-client";
import {
  analisarImportacaoConsignado,
  confirmarImportacaoConsignado,
} from "./actions";

export default async function Page() {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação e-Consignado"
        description="Suba o xlsx Dataprev (ou CSV com o mesmo cabeçalho). A análise mostra o que será gravado antes de confirmar. Reenviar o mês atualiza contrato a contrato e não apaga o que saiu da planilha."
        breadcrumbs={[{ label: "Importação", href: "/importacao" }, { label: "e-Consignado" }]}
      />
      <ImportacaoConsignadoClient
        analisarAction={analisarImportacaoConsignado}
        confirmarAction={confirmarImportacaoConsignado}
      />
    </div>
  );
}
