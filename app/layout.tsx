import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TabBar from "@/app/_components/TabBar";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Al Trote Marr!",
  description: "Your running training plan.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Al Trote" },
};

export const viewport: Viewport = {
  themeColor: "#23261a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh pb-20">
        {children}
        <TabBar />
      </body>
    </html>
  );
}
