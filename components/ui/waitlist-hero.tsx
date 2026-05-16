"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FolderOpenIcon,
  GamepadIcon,
  LibraryIcon,
  Loader2,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { useLibrary } from "@/hooks/useLibrary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const FEATURED_CONSOLES = [
  { label: "NES", src: "/logos/nes.png" },
  { label: "SNES", src: "/logos/snes.png" },
  { label: "GBA", src: "/logos/gba.png" },
  { label: "PSX", src: "/logos/psx.png" },
  { label: "PS2", src: "/logos/ps2.png" },
  { label: "PSP", src: "/logos/psp.png" },
  { label: "N64", src: "/logos/n64.png" },
  { label: "GameCube", src: "/logos/gc.png" },
  { label: "Wii", src: "/logos/wii.png" },
  { label: "Genesis", src: "/logos/genesis.png" },
  { label: "Dreamcast", src: "/logos/dreamcast.png" },
  { label: "Arcade", src: "/logos/mame.png" },
  { label: "Neo Geo", src: "/logos/neogeo.png" },
  { label: "PC Engine", src: "/logos/pcengine.png" },
  { label: "Switch", src: "/logos/switch.png" },
  { label: "DS", src: "/logos/nds.png" },
] as const;

const QUICK_STEPS = [
  {
    icon: FolderOpenIcon,
    title: "Connect",
    desc: "Open your SD card or ROM folder root.",
  },
  {
    icon: SearchIcon,
    title: "Scan",
    desc: "Read folders and gamelist.xml locally.",
  },
  {
    icon: LibraryIcon,
    title: "Browse",
    desc: "Open a console and edit media fast.",
  },
] as const;

export function WaitlistHero() {
  const { state, openAndScan } = useLibrary();

  const isReady = state.status === "ready";
  const isScanning = state.status === "scanning";

  const totalConsoles = isReady ? state.consoles.length : 0;
  const totalGames = isReady
    ? state.consoles.reduce((sum, consoleItem) => sum + consoleItem.games.length, 0)
    : 0;
  const gamesWithImages = isReady
    ? state.consoles.reduce(
        (sum, consoleItem) => sum + consoleItem.gamesWithImages,
        0
      )
    : 0;
  const progressValue =
    isScanning && state.progress.total > 0
      ? Math.round((state.progress.current / state.progress.total) * 100)
      : 0;

  const primaryLabel = isReady
    ? "RESCAN SD CARD"
    : isScanning
      ? "SCANNING..."
      : "OPEN SD CARD";

  const statusLabel = isReady
    ? "READY"
    : isScanning
      ? "SCANNING"
      : "WAITING";

  const statusDescription = isReady
    ? `Loaded ${totalGames} games across ${totalConsoles} consoles.`
    : isScanning
      ? `Scanning ${state.progress.currentFolder || "your library"}...`
      : "Connect your SD card or ROM folder root to load the library.";

  return (
    <section className="scanlines relative overflow-hidden rounded-[2rem] border bg-card/85 p-4 shadow-2xl sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,75,43,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,65,108,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        {/* Left: hero copy */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-pixel tracking-widest">
              OFFLINE
            </Badge>
            <Badge variant="secondary" className="font-pixel tracking-widest">
              PIXEL UI
            </Badge>
            <Badge variant="secondary" className="font-pixel tracking-widest">
              MOBILE READY
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <div className="retro-step h-8 w-8 shrink-0">
                <GamepadIcon className="gradient-icon h-4 w-4" />
              </div>
              <span className="font-pixel text-xs tracking-[0.28em] text-muted-foreground">
                RETRO SCRAPER
              </span>
            </div>

            <h1 className="font-pixel neon-glow max-w-2xl text-5xl leading-[0.88] tracking-wider sm:text-6xl lg:text-7xl">
              CLEAN LIBRARY.
              <br />
              PIXEL CONTROL.
            </h1>

            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base lg:text-lg">
              Connect your SD card, scan the folder, and manage covers, logos,
              videos, and metadata without the clutter.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="retro-btn-glow font-pixel w-full gap-2 px-5 text-xs tracking-[0.22em] sm:w-auto"
              onClick={openAndScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isReady ? (
                <RefreshCwIcon className="h-4 w-4" />
              ) : (
                <FolderOpenIcon className="h-4 w-4" />
              )}
              {primaryLabel}
            </Button>

            <Link href="/library" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="font-pixel w-full gap-2 px-5 text-xs tracking-[0.22em] sm:w-auto"
              >
                <LibraryIcon className="h-4 w-4" />
                BROWSE LIBRARY
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="retro-tag">NO UPLOADS</span>
            <span className="retro-tag">NO ACCOUNTS</span>
            <span className="retro-tag">ONE FOLDER TO SCAN</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {QUICK_STEPS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="retro-card bg-background/80 p-3 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <Icon className="gradient-icon h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-pixel text-xs tracking-[0.22em]">
                      {title}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: status and logo wall */}
        <div className="space-y-4">
          <Card className="retro-card border-border/80 bg-background/80 shadow-lg">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-pixel text-xs tracking-[0.28em] text-muted-foreground">
                    LIBRARY STATUS
                  </p>
                  <p className="text-sm font-semibold sm:text-base">
                    {isReady
                      ? "Connected and ready to browse"
                      : isScanning
                        ? "Scanning your folders now"
                        : "Waiting for your SD card"}
                  </p>
                </div>
                <Badge variant={isReady ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
              </div>

              {isScanning ? (
                <div className="space-y-3">
                  <Progress value={progressValue} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{state.progress.currentFolder || "Scanning..."}</span>
                    <span>{progressValue}%</span>
                  </div>
                </div>
              ) : isReady ? (
                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="Consoles" value={String(totalConsoles)} />
                  <StatTile label="Games" value={String(totalGames)} />
                  <StatTile
                    label="With art"
                    value={String(gamesWithImages)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  {statusDescription}
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                {isReady
                  ? statusDescription
                  : "Tip: open the root of your SD card or ROM folder."}
              </p>
            </CardContent>
          </Card>

          <Card className="retro-card border-border/80 bg-background/80 shadow-lg">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-pixel text-xs tracking-[0.28em] text-muted-foreground">
                    POPULAR SYSTEMS
                  </p>
                  <p className="text-sm font-semibold">Local console logos</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  16 SYSTEMS
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {FEATURED_CONSOLES.map((console) => (
                  <div
                    key={console.label}
                    className="flex flex-col items-center gap-1 rounded-xl border bg-background/70 p-2 text-center transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex h-12 w-full items-center justify-center">
                      <Image
                        src={console.src}
                        alt={console.label}
                        width={48}
                        height={48}
                        className="h-10 w-10 object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                      {console.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Supports ES-DE style media folders.</span>
                <span className="hidden sm:inline">Pixel perfect-ish.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/80 p-3 text-center shadow-sm">
      <p className="font-pixel text-[11px] tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
