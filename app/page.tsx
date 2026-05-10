"use client";

/**
 * Home page — Retro Scraper
 *
 * Landing page with a big hero section and CTA to open the library.
 */

import Link from "next/link";
import {
  GamepadIcon,
  FolderOpenIcon,
  PencilIcon,
  ShieldCheckIcon,
  ZapIcon,
  LibraryIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLibrary } from "@/hooks/useLibrary";

const FEATURES = [
  {
    icon: FolderOpenIcon,
    title: "Auto-Detect Consoles",
    desc: "Point the app at your SD card root. It instantly reads every console folder and parses all gamelist.xml files — no setup needed.",
  },
  {
    icon: PencilIcon,
    title: "Edit Metadata",
    desc: "Fix game names, descriptions, ratings, developers, release dates and more. Changes are saved directly back to gamelist.xml.",
  },
  {
    icon: ZapIcon,
    title: "Blazing Fast",
    desc: "Paginated tables handle thousands of ROMs without lag. Search and filter in real-time across your entire collection.",
  },
  {
    icon: ShieldCheckIcon,
    title: "100% Offline & Private",
    desc: "Everything runs in your browser. No server, no uploads, no accounts. Your files never leave your machine.",
  },
];

export default function HomePage() {
  const { state, openAndScan } = useLibrary();
  const isReady = state.status === "ready";

  return (
    <div className="flex flex-col gap-20 py-12">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center gap-6 text-center">
        <div className="rounded-full bg-muted p-6 shadow-sm">
          <GamepadIcon className="gradient-icon h-14 w-14" />
        </div>

        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Retro{" "}
            <span className="gradient-text">Scraper</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Manage your retro handheld game library. Scan your SD card, see
            which games have artwork, and edit metadata — all offline, no
            installation required.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {isReady ? (
            <Link href="/library">
              <Button size="lg" className="gap-2 px-8">
                <LibraryIcon className="h-5 w-5" />
                View My Library
              </Button>
            </Link>
          ) : (
            <Button size="lg" className="gap-2 px-8" onClick={openAndScan}>
              <FolderOpenIcon className="h-5 w-5" />
              Open SD Card
            </Button>
          )}
          <Link href="/generator">
            <Button size="lg" variant="outline" className="gap-2 px-8">
              <PencilIcon className="h-5 w-5" />
              Generate Media
            </Button>
          </Link>
        </div>

        <p className="text-muted-foreground text-xs">
          Works with any EmulationStation-based device: R36S, RG35XX, Anbernic, Miyoo Mini and more.
        </p>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Everything you need</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Built for offline use — plug in your SD card and go.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border/60 hover:border-primary/30 transition-colors">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="gradient-icon h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">How it works</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Connect & Open",
              desc: 'Plug your SD card into your PC and click "Open SD Card". Select the root folder of your card.',
            },
            {
              step: "2",
              title: "Auto-Scan",
              desc: "The app scans every console folder, finds your ROMs, reads gamelist.xml, and shows your full library.",
            },
            {
              step: "3",
              title: "Edit & Save",
              desc: "Click any game to edit its name, description, rating, and more. Hit Save — written instantly to the SD card.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col items-center gap-3 text-center">
              <div className="gradient-text flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-bold" style={{ borderColor: "var(--gradient-1)" }}>
                {step}
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link href="/library">
            <Button size="lg" className="gap-2 px-10">
              <LibraryIcon className="h-5 w-5" />
              {isReady ? "Go to Library" : "Get Started"}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
