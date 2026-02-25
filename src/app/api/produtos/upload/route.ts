import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import { uploadToMinIO, isMinIOConfigured } from "@/lib/minio";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const contentType = file.type || "image/jpeg";

    // Preferir MinIO quando configurado
    if (isMinIOConfigured()) {
      const url = await uploadToMinIO(buffer, filename, contentType);
      if (url) {
        return NextResponse.json({ success: true, filePath: url });
      }
    }

    // Fallback: salvar no disco local (public/uploads/produtos)
    const uploadDir = path.join(process.cwd(), "public/uploads/produtos");
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    const publicPath = `/uploads/produtos/${filename}`;

    return NextResponse.json({ success: true, filePath: publicPath });
  } catch (error) {
    console.error("Error uploading product image:", error);
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }
}
