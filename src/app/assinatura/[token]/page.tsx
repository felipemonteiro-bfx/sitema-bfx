import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { AssinaturaFormClient } from "@/components/assinatura-form-client";

export default async function AssinaturaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const venda = await prisma.venda.findUnique({
    where: { assinaturaToken: token },
    include: { cliente: true },
  });

  if (!venda) notFound();

  if (venda.assinaturaStatus === "assinado") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-foreground">Documento já assinado</h1>
          <p className="mt-3 text-muted-foreground">
            Este link de assinatura já foi utilizado. O documento foi registrado com sucesso.
          </p>
          {venda.comprovantePdf && (
            <a
              href={`/api/assinatura/${token}/comprovante`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-primary underline"
            >
              Visualizar comprovante
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Assinatura de Autorização
          </h1>
          <p className="mt-2 text-muted-foreground">
            Revise o documento abaixo e assine para confirmar a autorização de desconto em folha.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <AssinaturaFormClient
            token={token}
            clienteNome={venda.cliente?.nome || "Cliente"}
          />
        </div>
      </div>
    </div>
  );
}
