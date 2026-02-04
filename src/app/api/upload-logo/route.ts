import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || typeof file.name !== "string") {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase();
    const safeExt = ext && ext.length <= 8 ? ext : "";
    const filename = `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
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
    const details = error instanceof Error ? error.message : "Unknown error";
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file.", details }, { status: 500 });
  }
}
