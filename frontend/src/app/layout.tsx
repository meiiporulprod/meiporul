import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

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
      <body className={`${geist.className} bg-slate-950 text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
