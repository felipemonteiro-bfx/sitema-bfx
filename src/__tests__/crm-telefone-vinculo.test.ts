import { expect,it } from 'vitest';
import { identificarContato } from '@/lib/crm-whatsapp-identidade';
it('normaliza DDI, formatação e nono dígito sem escolher homônimo',()=>{const base=[{id:1,nome:'Cliente A',telefone:'(92) 98765-4321'}];expect(identificarContato('5592987654321',base)?.id).toBe(1);expect(identificarContato('559287654321',base)?.id).toBe(1);expect(identificarContato('5592987654321',[...base,{id:2,nome:'Cliente B',telefone:'92987654321'}])).toBeNull();expect(identificarContato('5592987654000',base)).toBeNull();});
