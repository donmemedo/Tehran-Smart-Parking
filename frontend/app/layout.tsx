import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/lib/app";

/*
 * Self-hosted variable fonts (SIL OFL, licenses sit next to the files). No third-party font
 * request at runtime, which keeps font-src/style-src 'self' and removes a tracking vector.
 *
 * Each subset is its own localFont() call so it can carry a `unicode-range`: the browser then
 * only downloads the subset a page actually needs. next/font needs literal option values, so the
 * ranges are spelled out inline. The subsets of one family are stitched together into a single
 * CSS variable on <html> (see `fontVars`), listed in priority order.
 */
const vazirArabic = localFont({
  src: "./fonts/vazirmatn-arabic-wght-normal.woff2",
  weight: "400 800",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC",
    },
  ],
});
const vazirLatin = localFont({
  src: "./fonts/vazirmatn-latin-wght-normal.woff2",
  weight: "400 800",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});
const interLatin = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "400 800",
  display: "swap",
  adjustFontFallback: false,
  preload: false, // Persian is the default language; Inter loads on demand in English mode
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});
const interLatinExt = localFont({
  src: "./fonts/inter-latin-ext-wght-normal.woff2",
  weight: "400 800",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
});

// Exposed to globals.css as var(--font-vazir) and var(--font-inter).
const fontVars = {
  "--font-vazir": `${vazirArabic.style.fontFamily}, ${vazirLatin.style.fontFamily}, Tahoma, system-ui, sans-serif`,
  "--font-inter": `${interLatin.style.fontFamily}, ${interLatinExt.style.fontFamily}, system-ui, sans-serif`,
} as CSSProperties;

export const metadata: Metadata = {
  title: "پارک هوشمند | ParkHooshmand — Smart curbside parking",
  description:
    "Real-time parking availability, demand-responsive pricing and open data for Iranian cities — built on the SFpark model.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ParkHooshmand" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Must run before first paint to avoid a theme/direction flash. Keep it tiny.
const noFlash = `(function(){try{var d=document.documentElement,s=localStorage,t=s.getItem('ph:theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'),l=s.getItem('ph:lang');if(t==='dark')d.classList.add('dark');if(l!=='en')l='fa';d.lang=l;d.dir=l==='fa'?'rtl':'ltr'}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" style={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <div className="aurora" aria-hidden><span /><span /><span /></div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
