import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/theme-provider";
import { Navigation } from "@/components/Navigation";
import { Toaster } from "@/components/ui/sonner";
import { LibraryProvider } from "@/hooks/useLibrary";
import { GamepadIcon } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  icons: {
    icon: "/icon-source.svg",
  },
  title: {
    template: "%s | Retro Scraper",
    default: "Retro Scraper — The Modern Game Media Manager",
  },
  description:
    "The ultimate browser-based media manager for retro handhelds. Scan SD cards, fetch high-quality artwork from ScreenScraper, and edit XML metadata for ArkOS, ROCKNIX, and ES-DE.",
  keywords: [
    "retro handheld",
    "game scraper",
    "metadata editor",
    "gamelist.xml",
    "screenscraper",
    "r36s",
    "rg35xx",
    "miyoo mini",
    "arkos manager",
    "rocknix",
  ],
  openGraph: {
    title: "Retro Scraper — Modern Game Media Manager",
    description: "Manage your retro handheld library directly in your browser. No installation, no data collection, just pure retro gaming management.",
    url: "https://retro-scraper.vercel.app", // Adjust if needed
    siteName: "Retro Scraper",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Retro Scraper UI Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Retro Scraper — Game Media Manager",
    description: "Manage your retro handheld library directly in your browser. Fetch artwork and edit metadata with ease.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* LibraryProvider is a client component — wraps the whole app
              so the scanned SD card state persists across page navigations */}
          <LibraryProvider>
            <Navigation />
            <main className="mx-auto min-h-screen max-w-7xl px-6 py-4">
              {children}
            </main>
            <footer className="border-t py-6">
              <div className="text-muted-foreground mx-auto flex items-center justify-center px-4 text-sm">
                <GamepadIcon className="gradient-icon mr-2 h-4 w-4" />
                <p className="font-pixel text-xs tracking-wider">
                  RETRO SCRAPER © {new Date().getFullYear()} — MADE WITH ❤️ FOR
                  THE RETRO GAMING COMMUNITY
                </p>
              </div>
            </footer>
          </LibraryProvider>
          <Toaster
            position="bottom-center"
            expand={true}
            richColors
            closeButton
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
