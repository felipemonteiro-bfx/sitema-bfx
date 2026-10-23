import { beforeEach, expect, it, vi } from 'vitest';
const findFirst = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { config: { findFirst } } }));
import { resolveWhatsAppProviders } from '@/lib/whatsapp-provider';
beforeEach(() => { vi.unstubAllEnvs(); findFirst.mockResolvedValue({whatsappAutoEnabled:1,whatsappProvider:'meta_cloud',metaWhatsappToken:'test',metaWhatsappPhoneNumberId:'123'}); });
it('mantém modo gratuito por padrão', async () => { expect((await resolveWhatsAppProviders()).primary?.freeServiceOnly).toBe(true); });
it('permite templates tarifados somente com autorização explícita no ambiente', async () => { vi.stubEnv('META_WHATSAPP_ALLOW_PAID_TEMPLATES','1'); expect((await resolveWhatsAppProviders()).primary?.freeServiceOnly).toBe(false); });
