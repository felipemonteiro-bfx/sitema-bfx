import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { callMcpTool, listMcpTools } from "@/lib/mcp";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tools = listMcpTools(
    {
      role: session.role as "admin" | "vendedor",
      username: session.username,
      displayName: session.nomeExibicao || session.username,
    },
    "plan"
  );
  return NextResponse.json({ tools });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const name = String((body as any).name || "");
  const params = ((body as any).params || {}) as Record<string, unknown>;
  if (!name) return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
  const result = await callMcpTool(name, params, {
    role: session.role as "admin" | "vendedor",
    username: session.username,
    displayName: session.nomeExibicao || session.username,
  });
  return NextResponse.json({ result });
}
