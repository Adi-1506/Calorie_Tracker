import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { connection } from "next/server";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { CookieConsent } from "@/components/site/cookie-consent";
import { SITE, siteUrl } from "@/lib/site/config";
import "./globals.css";

// Self-hosted by next/font at build time, so the CSP can keep font-src 'self'.
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700", "800"] });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Kalo: calorie and nutrition tracker",
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { siteName: SITE.name, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#211d19" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request so Next.js can attach the CSP nonce to its scripts.
  await connection();

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ground text-ink">
        {children}
        {/* Off in development so hot reload isn't served stale files; NEXT_PUBLIC_ENABLE_SW=1 turns it on for testing. */}
        <RegisterServiceWorker enabled={process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "1"} />
        <CookieConsent gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined} />
      </body>
    </html>
  );
}
