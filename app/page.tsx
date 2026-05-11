"use client";

/**
 * Home page — Retro Scraper
 *
 * Landing page with a retro arcade theme, hero section, features, and how-it-works.
 */

import Link from "next/link";
import {
  GamepadIcon,
  FolderOpenIcon,
  PencilIcon,
  ShieldCheckIcon,
  ZapIcon,
  LibraryIcon,
  MonitorIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/hooks/useLibrary";

const FEATURES = [
  {
    icon: FolderOpenIcon,
    title: "Auto-Detect",
    desc: "Point the app at your SD card. It instantly reads every console folder and parses all gamelist.xml files.",
    tag: "SCAN",
  },
  {
    icon: PencilIcon,
    title: "Edit Metadata",
    desc: "Fix game names, descriptions, ratings, developers, and more. Changes save directly to gamelist.xml.",
    tag: "EDIT",
  },
  {
    icon: ZapIcon,
    title: "Blazing Fast",
    desc: "Paginated tables handle thousands of ROMs without lag. Search and filter in real-time.",
    tag: "SPEED",
  },
  {
    icon: ShieldCheckIcon,
    title: "100% Offline",
    desc: "Everything runs in your browser. No server, no uploads, no accounts. Your files never leave your machine.",
    tag: "PRIVATE",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Connect",
    desc: 'Plug your SD card into your PC and click "Open SD Card". Select the root folder of your card.',
    icon: FolderOpenIcon,
  },
  {
    step: "02",
    title: "Scan",
    desc: "The app scans every console folder, finds your ROMs, reads gamelist.xml, and shows your full library.",
    icon: MonitorIcon,
  },
  {
    step: "03",
    title: "Manage",
    desc: "Click any game to edit its name, description, rating, and more. Hit Save — written instantly to the SD card.",
    icon: SparklesIcon,
  },
];

const CONSOIDES = [
  "NES",
  "SNES",
  "N64",
  "GBA",
  "PS1",
  "PS2",
  "PSP",
  "Genesis",
  "Dreamcast",
  "Switch",
  "Wii",
  "Arcade",
];

export default function HomePage() {
  const { state, openAndScan } = useLibrary();
  const isReady = state.status === "ready";

  return (
    <div className="flex flex-col gap-0 py-0">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="scanlines relative flex flex-col items-center gap-8 overflow-hidden py-20 text-center">
        {/* Decorative console tags */}
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {CONSOIDES.map((c) => (
            <span key={c} className="retro-tag">
              {c}
            </span>
          ))}
        </div>

        {/* Main title */}
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="retro-step">
              <GamepadIcon className="h-6 w-6" />
            </div>
          </div>
          <h1 className="font-pixel neon-glow text-5xl tracking-wider sm:text-6xl md:text-7xl">
            RETRO SCRAPER
          </h1>
          <p className="text-muted-foreground mx-auto max-w-lg text-lg leading-relaxed">
            Manage your retro handheld game library. Scan your SD card, see
            which games have artwork, and edit metadata — all offline.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {isReady ? (
            <Link href="/library">
              <Button
                size="lg"
                className="retro-btn-glow font-pixel gap-2 px-8 text-sm tracking-wider"
              >
                <LibraryIcon className="h-5 w-5" />
                VIEW LIBRARY
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="retro-btn-glow font-pixel gap-2 px-8 text-sm tracking-wider"
              onClick={openAndScan}
            >
              <FolderOpenIcon className="h-5 w-5" />
              OPEN SD CARD
            </Button>
          )}
          <Link href="/generator">
            <Button
              size="lg"
              variant="outline"
              className="font-pixel gap-2 px-8 text-sm tracking-wider"
            >
              <PencilIcon className="h-5 w-5" />
              GENERATE MEDIA
            </Button>
          </Link>
        </div>

        <p className="text-muted-foreground text-xs">
          Works with R36S · RG35XX · Anbernic · Miyoo Mini · and more
        </p>
      </section>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div className="retro-divider" />

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="space-y-10 py-16">
        <div className="space-y-2 text-center">
          <h2 className="font-pixel gradient-text text-2xl tracking-wider sm:text-3xl">
            FEATURES
          </h2>
          <p className="text-muted-foreground text-sm">
            Built for offline use — plug in your SD card and go.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc, tag }) => (
            <div key={title} className="retro-card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon className="gradient-icon h-5 w-5" />
                </div>
                <span className="retro-tag">{tag}</span>
              </div>
              <h3 className="font-pixel text-sm tracking-wider">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div className="retro-divider" />

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="space-y-10 py-16">
        <div className="space-y-2 text-center">
          <h2 className="font-pixel gradient-text text-2xl tracking-wider sm:text-3xl">
            HOW IT WORKS
          </h2>
          <p className="text-muted-foreground text-sm">
            Three simple steps to manage your collection.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map(({ step, title, desc, icon: Icon }) => (
            <div
              key={step}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="retro-step">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="font-pixel text-muted-foreground text-xs tracking-widest">
                  STEP {step}
                </div>
                <h3 className="font-pixel text-base tracking-wider">{title}</h3>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link href="/library">
            <Button
              size="lg"
              className="retro-btn-glow font-pixel gap-2 px-10 text-sm tracking-wider"
            >
              {isReady ? "GO TO LIBRARY" : "GET STARTED"}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer tagline ─────────────────────────────────────────── */}
      <div className="retro-divider" />
      <section className="py-12 text-center">
        <p className="font-pixel text-muted-foreground text-xs tracking-widest">
          100% CLIENT-SIDE · NO UPLOADS · NO ACCOUNTS · OPEN SOURCE
        </p>
      </section>
    </div>
  );
}
