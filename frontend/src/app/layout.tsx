import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import GlobalNavWrapper from "@/components/GlobalNavWrapper";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "மெய்பொருள் | Meiporul",
  description: "Tracking Tamil Nadu political promises — TVK, DMK, AIADMK accountability",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "மெய்பொருள்" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geist.className} bg-slate-950 text-slate-100 min-h-screen relative overflow-x-hidden selection:bg-red-500/30 selection:text-white`}>
        <GlobalNavWrapper />
        {children}
      </body>
    </html>
  );
}
