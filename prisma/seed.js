const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.findUnique({ where: { username: "admin" } });
  if (!admin) {
    await prisma.usuario.create({
      data: {
        username: "admin",
        password: "admin",
        role: "admin",
        nomeExibicao: "Administrador",
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
