import { expect,it } from 'vitest';
import { inicioDaPausa } from '@/lib/whatsapp-pausa';
it('retomada só ignora intervenções anteriores; pausa explícita permanece',()=>{const now=new Date('2026-10-16T12:30:00Z');expect(inicioDaPausa(now,60,null)?.toISOString()).toBe('2026-10-16T11:30:00.000Z');expect(inicioDaPausa(now,60,{origem:'controle_retomada',criadoEm:new Date('2026-10-16T12:25:00Z')})?.toISOString()).toBe('2026-10-16T12:25:00.000Z');expect(inicioDaPausa(now,60,{origem:'controle_pausa',criadoEm:now})).toBeNull();});
