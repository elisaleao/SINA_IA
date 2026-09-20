import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { AccessibilityBar } from "@/components/accessibility/AccessibilityBar";
import "./globals.css";

const VLibrasWidget = dynamic(
  () => import("@/components/accessibility/VLibrasWidget"),
  { ssr: false }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plataforma Inclusiva de Aprendizagem",
  description: "Estrutura inicial de uma plataforma educacional inclusiva.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex min-h-screen flex-col">
          <AccessibilityBar />
          <AppHeader />
          <div
            id="main-content"
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col outline-none"
          >
            {children}
          </div>
          <VLibrasWidget />
        </div>
      </body>
    </html>
  );
}

