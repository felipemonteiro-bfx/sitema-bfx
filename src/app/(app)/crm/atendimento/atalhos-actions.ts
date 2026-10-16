'use server';
import { requireAdmin } from '@/lib/guards';
import {
  boletos,
  estoque,
  parcelas,
  type BoletosDoContato,
  type ItemEstoque,
  type ParcelasDoContato,
} from '@/lib/atendimento-atalhos';

/**
 * Server actions dos atalhos do atendimento. Cada uma tem a PRÓPRIA guarda:
 * o Action ID fica no bundle e o guard do layout só roda no render, depois da
 * action. Só leitura; nada é enviado ao cliente.
 */

type Falha = { ok: false; message: string };

const TELEFONE = /^\d{10,15}$/;
const TERMO_MAX = 120;

export async function buscarEstoqueAtalho(
  termo: string,
): Promise<{ ok: true; itens: ItemEstoque[] } | Falha> {
  if (!(await requireAdmin())) return { ok: false, message: 'Acesso restrito ao atendimento autorizado.' };
  const t = typeof termo === 'string' ? termo.trim() : '';
  if (!t || t.length > TERMO_MAX) return { ok: false, message: 'Digite o produto (até 120 caracteres).' };
  try {
    return { ok: true, itens: await estoque(t) };
  } catch {
    return { ok: false, message: 'Não foi possível consultar o estoque agora.' };
  }
}

export async function parcelasDoContato(
  telefone: string,
): Promise<({ ok: true } & ParcelasDoContato) | Falha> {
  if (!(await requireAdmin())) return { ok: false, message: 'Acesso restrito ao atendimento autorizado.' };
  if (typeof telefone !== 'string' || !TELEFONE.test(telefone)) return { ok: false, message: 'Contato inválido.' };
  try {
    return { ok: true, ...(await parcelas(telefone)) };
  } catch {
    return { ok: false, message: 'Não foi possível consultar as parcelas agora.' };
  }
}

export async function boletosDoContato(
  telefone: string,
): Promise<({ ok: true } & BoletosDoContato) | Falha> {
  if (!(await requireAdmin())) return { ok: false, message: 'Acesso restrito ao atendimento autorizado.' };
  if (typeof telefone !== 'string' || !TELEFONE.test(telefone)) return { ok: false, message: 'Contato inválido.' };
  try {
    return { ok: true, ...(await boletos(telefone)) };
  } catch {
    return { ok: false, message: 'Não foi possível consultar os boletos agora.' };
  }
}
