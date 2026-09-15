import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/cadastro", "/processo-seletivo"];
// Arquivos de metadados que buscadores e redes sociais acessam sem login.
const PUBLIC_FILES = ["/robots.txt", "/sitemap.xml", "/opengraph-image", "/apple-icon"];

/** CSP com nonce por requisição: só scripts do próprio Next rodam (bloqueia XSS por script injetado). */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  // LiveKit: sem LIVEKIT_URL o navegador conecta em ws://<host>:7880 (e valida via http na mesma porta).
  const livekit = process.env.LIVEKIT_URL
    ? [process.env.LIVEKIT_URL, process.env.LIVEKIT_URL.replace(/^ws/, "http")]
    : ["ws://*:7880", "http://*:7880"];
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // React usa atributos style (ex.: LiveKit); nonce em style-src desativaria o 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    `connect-src 'self' ${livekit.join(" ")}`,
    "frame-src https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    PUBLIC_FILES.some((p) => pathname === p || pathname.startsWith(`${p}-`));

  // Checagem otimista: sem cookie de sessão → login. A autorização real é feita nas páginas e rotas.
  if (!isPublic && !request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // O Next lê o nonce do cabeçalho CSP da requisição e o aplica aos próprios scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // /api fica de fora: as rotas validam a sessão e o proxy não precisa bufferizar uploads.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)"],
};
