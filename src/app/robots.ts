import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Lê SITE_URL em runtime (estático, ficaria com o valor do momento do build).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    // As páginas internas exigem login (redirecionam para /login) e têm noindex.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/aguardando"] },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
