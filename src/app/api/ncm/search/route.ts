import { NextResponse } from "next/server";
import { searchNcm } from "@/lib/ncm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 3) {
    return NextResponse.json({ items: [] });
  }
  try {
    const items = await searchNcm(q, 12);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ items: [], error: "Falha ao buscar NCM" }, { status: 200 });
  }
}
