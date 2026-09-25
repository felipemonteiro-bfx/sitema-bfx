/**
 * Histórico de e-mails enviados (`email_envios`): cada tentativa de `sendEmail`
 * com `registro` vira uma linha, com corpo e anexos como foram enviados.
 */
import { prisma } from "@/lib/db";
import type { EmailAttachment } from "@/lib/email-mime";
import type { OrigemEmail, TipoEmail } from "@/lib/email-tipos";

export type { OrigemEmail, TipoEmail };
export { linkHistoricoEmails } from "@/lib/email-tipos";

export type RegistroEnvio = {
  tipo: TipoEmail;
  empresaId?: number | null;
  vendaId?: number | null;
  origem?: OrigemEmail;
};

/** Grava a tentativa. Nunca lança: o histórico não pode derrubar o envio. */
export async function registrarEnvio(
  registro: RegistroEnvio,
  envio: {
    remetente: string;
    para: string[];
    cc: string[];
    assunto: string;
    html: string;
    anexos: EmailAttachment[];
    erro: string | null;
  }
): Promise<void> {
  try {
    await prisma.emailEnvio.create({
      data: {
        tipo: registro.tipo,
        origem: registro.origem ?? "automatico",
        empresaId: registro.empresaId ?? null,
        vendaId: registro.vendaId ?? null,
        remetente: envio.remetente,
        para: envio.para.join(", "),
        cc: envio.cc.length > 0 ? envio.cc.join(", ") : null,
        assunto: envio.assunto,
        corpoHtml: envio.html,
        status: envio.erro ? "falhou" : "enviado",
        erro: envio.erro,
        anexos: {
          create: envio.anexos.map((a) => ({
            nome: a.filename,
            contentType: a.contentType,
            tamanho: a.content.byteLength,
            conteudo: new Uint8Array(a.content),
          })),
        },
      },
    });
  } catch (e) {
    console.error("[email-historico] não foi possível gravar o envio:", e);
  }
}
