import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/lib/app";

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

const noFlash = `(function(){try{var t=localStorage.getItem('ph:theme')||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('ph:lang')||'fa';document.documentElement.lang=l;document.documentElement.dir=l==='fa'?'rtl':'ltr';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <div className="aurora" aria-hidden><span /><span /><span /></div>
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html:
              `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
