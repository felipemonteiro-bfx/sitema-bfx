'use server';
import { createHash } from 'node:crypto';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { marcarEnviada, marcarFalha } from '@/lib/whatsapp-mensagem';
import { JANELA_DEDUPE_MS, MSG_ACESSO_RESTRITO, predicadoCitacao, telefoneValido, travarTelefone, verificarCanalManual } from '@/lib/whatsapp-atendimento-guardas';
import { classificarMidia, corpoPlaceholder, ehNotaDeVoz, LIMITE_ENVIO_BYTES, nomeSeguro, type TipoMidia } from '@/lib/whatsapp-midia-politica';
import { contarPaginasPdf } from '@/lib/whatsapp-midia-pdf';
import { chaveNova, gravar, remover } from '@/lib/whatsapp-midia-storage';
import { waIdDaCitada } from '@/lib/whatsapp-citacao';
import { enviarMidia, subirMidiaParaMeta } from '@/lib/whatsapp-midia-meta';

type Resultado = { ok: boolean; message: string };

const TIPOS: readonly TipoMidia[] = ['imagem', 'video', 'audio', 'figurinha', 'documento'];
const LEGENDA_MAX = 1024;
/** Só estes tipos aceitam legenda na Cloud API. */
const COM_LEGENDA: readonly TipoMidia[] = ['imagem', 'video', 'documento'];
const MB = 1024 * 1024;

/**
 * Envia uma mídia (imagem, vídeo, áudio, figurinha ou documento) numa conversa.
 * Campos: `telefone`, `tipo`, `arquivo` (File), `legenda?` e `respondeA?` (id interno da mensagem citada). As guardas são as de
 * `responderConversa`. O tipo vale pelos BYTES; nome e type do File são ignorados.
 */
export async function enviarMidiaConversa(formData: FormData): Promise<Resultado> {
  if (!await requireAdmin()) return { ok: false, message: MSG_ACESSO_RESTRITO };
  const telefone = String(formData.get('telefone') ?? '');
  const tipoBruto = String(formData.get('tipo') ?? '');
  const arquivo = formData.get('arquivo');
  const legendaBruta = formData.get('legenda');
  const legenda = typeof legendaBruta === 'string' ? legendaBruta.trim() : '';
  if (!telefoneValido(telefone) || !TIPOS.includes(tipoBruto as TipoMidia) || !(arquivo instanceof File)) {
    return { ok: false, message: 'Confira o contato, o tipo e o arquivo antes de enviar.' };
  }
  const tipo = tipoBruto as TipoMidia;
  if (legenda.length > LEGENDA_MAX) return { ok: false, message: `A legenda pode ter até ${LEGENDA_MAX} caracteres.` };
  // Tamanho pelo metadado, ANTES de ler o conteúdo para a memória.
  if (arquivo.size === 0) return { ok: false, message: 'O arquivo está vazio.' };
  if (arquivo.size > LIMITE_ENVIO_BYTES) return { ok: false, message: `O arquivo passa do limite de ${LIMITE_ENVIO_BYTES / MB} MB para envio.` };

  const canal = await verificarCanalManual(telefone);
  if (!canal.ok) return { ok: false, message: canal.message };
  const respondeA = Number(formData.get('respondeA'));
  const citadaWaId = Number.isInteger(respondeA) && respondeA > 0 ? await waIdDaCitada(telefone, respondeA) : null;

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const classe = classificarMidia(tipo, bytes, undefined, { direcao: 'envio' });
  if (!classe.ok) return { ok: false, message: classe.erro };

  const voz = tipo === 'audio' && ehNotaDeVoz(classe.mime, bytes);
  const paginas = classe.mime === 'application/pdf' ? await contarPaginasPdf(bytes) : null;
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const nome = nomeSeguro(arquivo.name);
  const legendaFinal = COM_LEGENDA.includes(tipo) && legenda ? legenda : undefined;
  const chave = chaveNova();

  // Transação CURTA: só o lock por telefone, o dedupe por sha e o registro `pendente`.
  // Storage e upload à Meta ficam FORA, senão o lock ficaria preso durante a I/O lenta
  // e um texto enviado ao mesmo número estouraria o timeout.
  let registro: number | null;
  try {
    registro = await prisma.$transaction(async tx => {
      await travarTelefone(tx, telefone);
      const repetida = await tx.whatsAppMensagem.findFirst({
        where: {
          telefone, direcao: 'out', status: { not: 'falhou' }, ...predicadoCitacao(citadaWaId),
          criadoEm: { gte: new Date(Date.now() - JANELA_DEDUPE_MS) }, midia: { is: { sha256 } },
        },
        select: { id: true },
      });
      if (repetida) return null;
      const criada = await tx.whatsAppMensagem.create({
        data: {
          telefone, direcao: 'out', origem: 'manual', tipo, status: 'pendente',
          ...(citadaWaId ? { respondeAWaId: citadaWaId } : {}),
          corpo: corpoPlaceholder(tipo, legendaFinal, nome),
          midia: {
            create: {
              tipo, metaMediaId: '', mime: classe.mime, sha256,
              tamanho: classe.bytes, voz, ...(paginas !== null ? { paginas } : {}), nomeExibicao: nome, legenda: legendaFinal ?? null, chaveStorage: chave, status: 'pendente',
            },
          },
        },
        select: { id: true },
      });
      return criada.id;
    }, { timeout: 10_000, maxWait: 10_000 });
  } catch {
    return { ok: false, message: 'Não foi possível preparar a mídia. Nada foi enviado; tente novamente.' };
  }
  if (registro === null) return { ok: false, message: 'Esta mídia já foi registrada recentemente. Confira o histórico antes de repetir.' };

  // Fora do lock: grava no storage privado e sobe à Meta. Falha aqui marca falhou e remove o objeto.
  let uploadMediaId = '';
  let gravado = false;
  try {
    await gravar(chave, bytes, classe.mime);
    gravado = true;
    uploadMediaId = await subirMidiaParaMeta(bytes, classe.mime, nome);
    await prisma.whatsAppMidia.update({
      where: { mensagemId: registro },
      data: { status: 'salva', metaMediaId: uploadMediaId, uploadMediaId, uploadEm: new Date() },
    });
  } catch {
    if (gravado) await remover(chave).catch(() => undefined);
    await prisma.whatsAppMidia
      .update({ where: { mensagemId: registro }, data: { status: 'falhou', chaveStorage: null, erro: 'envio_preparo' } })
      .catch(() => undefined);
    try { await marcarFalha(registro, 'Não foi possível preparar a mídia para envio.'); } catch { /* melhor esforço */ }
    return { ok: false, message: 'Não foi possível preparar a mídia. Nada foi enviado; tente novamente.' };
  }

  try {
    const result = await enviarMidia({
      para: telefone, tipo, mediaId: uploadMediaId, legenda: legendaFinal, respondeAWaId: citadaWaId ?? undefined,
      nomeArquivo: tipo === 'documento' ? nome : undefined, voz,
    });
    if (!result.ok) {
      await marcarFalha(registro, result.error ?? 'Mídia não aceita pelo provedor; confira a conexão e a janela de atendimento.', result.codigo);
      return { ok: false, message: 'A mídia não foi aceita. Confira o histórico e a conexão antes de tentar novamente.' };
    }
    await marcarEnviada(registro, result.messageId);
    return { ok: true, message: 'Mídia aceita pela Meta. A entrega será atualizada quando houver confirmação.' };
  } catch {
    // Resultado incerto: fica pendente, sem nova tentativa automática.
    return { ok: false, message: 'Não foi possível confirmar o resultado. A mídia ficou pendente; confira o histórico antes de reenviar.' };
  }
}
