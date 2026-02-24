import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");

/**
 * Rotas de API que não exigem autenticação
 */
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/cron"];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger rotas /api/* (exceto login/logout)
  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }

    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
