import { prisma } from "../src/lib/db";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url"; // To handle __dirname equivalent in ES Modules

// Helper function to simulate fillTemplate from recibo route
function fillTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

// Dummy PNG image (1x1 transparent PNG as base64)
const DUMMY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const DUMMY_PNG_BUFFER = Buffer.from(DUMMY_PNG_BASE64, "base64");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("== Testando funcionalidades de Recibo (Logo e Preview) ==");

  const created: {
    tempLogoPath?: string;
    configId?: number;
    vendaId?: number;
    clienteId?: number;
  } = {};

  try {
    // --- Test 1: fillTemplate function ---
    console.log("--- Teste 1: fillTemplate function ---");
    const template = "Olá {NOME}, seu pedido {PEDIDO} foi processado.";
    const data = { NOME: "João", PEDIDO: "XYZ123" };
    const filled = fillTemplate(template, data);
    if (filled === "Olá João, seu pedido XYZ123 foi processado.") {
      console.log("fillTemplate ok");
    } else {
      throw new Error(`fillTemplate falhou. Esperado: "Olá João, seu pedido XYZ123 foi processado.", Recebido: "${filled}"`);
    }

    // --- Test 2: /api/upload-logo endpoint ---
    console.log("--- Teste 2: /api/upload-logo endpoint ---");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const dummyLogoName = `test-logo-${Date.now()}.png`;
    const dummyLogoPath = path.join(uploadDir, dummyLogoName);
    await fs.writeFile(dummyLogoPath, DUMMY_PNG_BUFFER);
    created.tempLogoPath = dummyLogoPath;

    // Simulate file upload
    const formData = new FormData();
    formData.append(
      "file",
      new File([DUMMY_PNG_BUFFER], dummyLogoName, { type: "image/png" }),
      dummyLogoName
    );

    const uploadResponse = await fetch("http://localhost:3000/api/upload-logo", { // Assuming app runs on 3000
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload de logo falhou: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success || !uploadResult.filePath) {
      throw new Error(`Upload de logo falhou. Resultado: ${JSON.stringify(uploadResult)}`);
    }
    console.log("Upload de logo ok:", uploadResult.filePath);

    // Verify logoPath in DB
    const cfg = await prisma.config.findFirst();
    if (!cfg || cfg.logoPath !== uploadResult.filePath) {
      throw new Error(`logoPath no DB não corresponde após upload. Esperado: ${uploadResult.filePath}, Recebido: ${cfg?.logoPath}`);
    }
    created.configId = cfg.id;
    console.log("Verificação de logoPath no DB ok.");

    // --- Test 3: /api/recibo endpoint (PDF generation with logo) ---
    console.log("--- Teste 3: /api/recibo endpoint (PDF generation with logo) ---");
    // Create a dummy client and venda for PDF generation
    const cliente = await prisma.cliente.create({
      data: { nome: `Cliente Teste Recibo ${Date.now()}` },
    });
    created.clienteId = cliente.id;
    const venda = await prisma.venda.create({
      data: {
        dataVenda: new Date(),
        vendedor: "Testador",
        clienteId: cliente.id,
        produtoNome: "Produto Teste Recibo",
        valorVenda: 100,
        parcelas: 1,
      },
    });
    created.vendaId = venda.id;

    // Make request to PDF endpoint
    const pdfResponse = await fetch(`http://localhost:3000/api/recibo?id=${venda.id}`);

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`Geração de PDF falhou: ${pdfResponse.status} - ${errorText}`);
    }

    const contentType = pdfResponse.headers.get("content-type");
    if (contentType !== "application/pdf") {
      throw new Error(`Tipo de conteúdo esperado 'application/pdf', recebido '${contentType}'`);
    }
    console.log("Geração de PDF ok (content-type verificado).");

    const pdfBuffer = await pdfResponse.arrayBuffer();
    if (pdfBuffer.byteLength < 1000) { // Simple check: PDF should not be too small
      throw new Error("PDF gerado é muito pequeno, pode estar vazio ou corrompido.");
    }
    console.log("Geração de PDF ok (tamanho verificado).");


    console.log("== Todos os testes de Recibo passaram com sucesso! ==");
  } catch (err) {
    console.error("Falhou:", err);
    process.exitCode = 1;
  } finally {
    // --- Cleanup ---
    console.log("--- Limpeza ---");
    if (created.tempLogoPath) {
      await fs.unlink(created.tempLogoPath).catch(console.error);
      console.log("Arquivo temporário da logo removido.");
    }
    if (created.configId) {
      await prisma.config.update({ where: { id: created.configId }, data: { logoPath: null } }).catch(console.error);
      console.log("logoPath no DB limpo.");
    }
    if (created.vendaId) {
      await prisma.venda.delete({ where: { id: created.vendaId } }).catch(console.error);
      console.log("Venda de teste removida.");
    }
    if (created.clienteId) {
      await prisma.cliente.delete({ where: { id: created.clienteId } }).catch(console.error);
      console.log("Cliente de teste removido.");
    }
    await prisma.$disconnect();
    console.log("Conexão com Prisma desconectada.");
  }
}

run();
