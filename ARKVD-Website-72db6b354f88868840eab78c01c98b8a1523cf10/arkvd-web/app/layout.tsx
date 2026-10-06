import type { Metadata, Viewport } from "next";
import { Anton, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-mono", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "ARKVD — Dance now. Archive later.",
  description: "A diary for every DJ set you saw. Join the list for early access.",
  openGraph: {
    title: "ARKVD — Dance now. Archive later.",
    description: "A diary for every DJ set you saw. Join the list for early access.",
    images: ["/sunburst.png"],
  },
};

export const viewport: Viewport = { themeColor: "#0E1A2E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${mono.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
