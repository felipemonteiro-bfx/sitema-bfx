import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/${filename}`;

    const cfg = await prisma.config.findFirst();
    if (cfg) {
      await prisma.config.update({ where: { id: cfg.id }, data: { logoPath: publicPath } });
    } else {
      await prisma.config.create({ data: { logoPath: publicPath } });
    }

    return NextResponse.json({ success: true, filePath: publicPath });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Erro ao enviar arquivo." }, { status: 500 });
  }
}