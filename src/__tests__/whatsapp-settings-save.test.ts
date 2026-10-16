import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ts from 'typescript';

// Exercise the real page action without importing unrelated page integrations.
const page=readFileSync('src/app/(app)/configuracoes/page.tsx','utf8');
const action=page.slice(page.indexOf('async function saveWhatsApp('),page.indexOf('async function saveUber('));
const js=ts.transpile(action,{target:ts.ScriptTarget.ES2022});
const db={findFirst:vi.fn(),update:vi.fn(),create:vi.fn()};
const admin=vi.fn(),revalidate=vi.fn(),redirect=vi.fn((url:string)=>{throw new Error('REDIRECT:'+url)});
const save=new Function('prisma','requireAdminOrThrow','checkboxComoNumero','revalidarConfig','redirect',js+';return saveWhatsApp;')({config:db},admin,(v:unknown)=>v==='on'||v==='1'?1:0,revalidate,redirect);
const form=()=>{const f=new FormData();f.set('whatsappProvider','meta_cloud');f.set('metaWhatsappPhoneNumberId','1354895454379397');return f};
beforeEach(()=>{vi.clearAllMocks();db.findFirst.mockResolvedValue({id:1});db.update.mockResolvedValue({id:1});admin.mockResolvedValue(undefined)});
describe('confirmação de gravação WhatsApp',()=>{
 it('confirma sucesso somente após persistir e mantém segredos em branco',async()=>{
  await expect(save(form())).rejects.toThrow('REDIRECT:/configuracoes?tab=whatsapp&saved=whatsapp');
  expect(db.update).toHaveBeenCalled();expect(revalidate).toHaveBeenCalled();
  const data=db.update.mock.calls[0][0].data;expect(data).not.toHaveProperty('metaAppSecret');expect(data).not.toHaveProperty('metaWhatsappToken');expect(data.whatsappAutoEnabled).toBe(0);
 });
 it('mostra falha sem confirmar sucesso quando a gravação falha',async()=>{
  db.update.mockRejectedValueOnce(new Error('database unavailable'));
  await expect(save(form())).rejects.toThrow('REDIRECT:/configuracoes?tab=whatsapp&error=whatsapp_save_failed');
  expect(redirect).not.toHaveBeenCalledWith(expect.stringContaining('saved='));
 });
 it('rejeita IDs inválidos sem gravar nem perder a aba',async()=>{
  const f=form();f.set('metaWhatsappPhoneNumberId','not-a-number');
  await expect(save(f)).rejects.toThrow('REDIRECT:/configuracoes?tab=whatsapp&error=whatsapp_invalid_ids');expect(db.update).not.toHaveBeenCalled();
 });
});

it('preserva modo gratuito por regras ao salvar, sem converter para IA',async()=>{const f=form();f.set('whatsappPreAtendimento','2');await expect(save(f)).rejects.toThrow('REDIRECT:/configuracoes?tab=whatsapp&saved=whatsapp');expect(db.update.mock.calls[0][0].data.whatsappPreAtendimento).toBe(2);});
