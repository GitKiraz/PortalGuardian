import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Mantém o preload: o Brand usa mono em toda página, e sem preload a fonte é descoberta tarde e atrasa o FCP.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonte das peças da identidade visual (wordmark e títulos). Só o peso usado; o subset latin já cobre os acentos do português.
const poppins = Poppins({
  variable: "--font-poppins",
  weight: "600",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: "Portal Guardian Mauá",
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#191717",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
