/**
 * Atualiza a config do WhatsApp (Evolution API) no banco.
 * Uso: node scripts/config-whatsapp.js
 *      ou: node --env-file=.env.local scripts/config-whatsapp.js
 */
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const url = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const key = process.env.EVOLUTION_API_KEY || 'bfx-evolution-key-change-me';
  const instance = process.env.EVOLUTION_INSTANCE || 'bfx';

  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({
      where: { id: cfg.id },
      data: {
        evolutionApiUrl: url,
        evolutionApiKey: key,
        evolutionInstance: instance,
        whatsappAutoEnabled: 1,
      },
    });
    console.log('Config WhatsApp atualizada:', { url, instance });
  } else {
    await prisma.config.create({
      data: {
        evolutionApiUrl: url,
        evolutionApiKey: key,
        evolutionInstance: instance,
        whatsappAutoEnabled: 1,
      },
    });
    console.log('Config WhatsApp criada:', { url, instance });
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
