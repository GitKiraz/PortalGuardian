import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as respostas (páginas, API e arquivos estáticos).
// O Content-Security-Policy das páginas é gerado por requisição em src/proxy.ts (nonce).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microfone, câmera e tela só para o próprio portal (chamadas LiveKit).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), browsing-topics=()" },
  // Navegadores só respeitam HSTS em HTTPS; em http://localhost é ignorado.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Capas dos vídeos das aulas (a aula só carrega o player do YouTube ao clicar).
    remotePatterns: [new URL("https://i.ytimg.com/vi/**")],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
