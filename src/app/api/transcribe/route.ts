import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const audio = formData.get("audio");
  if (!audio || typeof audio === "string") {
    return NextResponse.json({ error: "Arquivo de áudio não enviado" }, { status: 400 });
  }

  const cfg = await prisma.config.findFirst();
  const baseURL = (cfg?.litellmUrl ?? "https://ai.softlive.dev").replace(/\/$/, "");
  const apiKey = cfg?.litellmKey ?? "";

  const fd = new FormData();
  fd.append("file", audio as File, (audio as File).name || "audio.webm");
  fd.append("model", "whisper-1");
  fd.append("language", "pt");

  try {
    const resp = await fetch(`${baseURL}/v1/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ error: `Whisper error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await resp.json();
    return NextResponse.json({ text: data.text ?? "" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
