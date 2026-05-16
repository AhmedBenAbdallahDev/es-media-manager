"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
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

type LogoAsset = {
  label: string;
  src: string;
};

const ORBIT_LOGOS: LogoAsset[] = [
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
  { label: "Game Gear", src: "/logos/gamegear.png" },
  { label: "Saturn", src: "/logos/saturn.png" },
];

const ORBIT_RINGS = [
  {
    logos: ORBIT_LOGOS.slice(0, 8),
    radius: "clamp(6rem, 20vw, 9rem)",
    duration: "58s",
    reverse: false,
    tileClassName: "h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16",
    ringClassName: "opacity-75",
  },
  {
    logos: ORBIT_LOGOS.slice(8, 14),
    radius: "clamp(4.5rem, 15vw, 6.75rem)",
    duration: "44s",
    reverse: true,
    tileClassName: "h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14",
    ringClassName: "opacity-60",
  },
  {
    logos: ORBIT_LOGOS.slice(14),
    radius: "clamp(2.75rem, 10vw, 4.5rem)",
    duration: "32s",
    reverse: false,
    tileClassName: "h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12",
    ringClassName: "opacity-50",
  },
] as const;

const QUICK_STEPS = [
  {
    icon: FolderOpenIcon,
    title: "Connect",
    desc: "Open the root of your SD card or ROM folder.",
  },
  {
    icon: SearchIcon,
    title: "Scan",
    desc: "Read your folders and gamelist.xml locally.",
  },
  {
    icon: LibraryIcon,
    title: "Browse",
    desc: "Jump into the library and manage media cleanly.",
  },
] as const;

export function WaitlistHero() {
  const { state, openAndScan } = useLibrary();

  const isReady = state.status === "ready";
  const isScanning = state.status === "scanning";

  const totalConsoles = isReady ? state.consoles.length : 0;
  const totalGames = isReady
    ? state.consoles.reduce(
        (sum, consoleItem) => sum + consoleItem.games.length,
        0
      )
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

  const primaryLabel = isScanning
    ? "SCANNING..."
    : isReady
      ? "RESCAN SD CARD"
      : "OPEN SD CARD";

  const PrimaryIcon = isScanning
    ? Loader2
    : isReady
      ? RefreshCwIcon
      : FolderOpenIcon;

  const statusLabel = isReady
    ? "READY"
    : isScanning
      ? "SCANNING"
      : "WAITING";

  const statusTitle = isReady
    ? "Your library is ready"
    : isScanning
      ? "Scanning your folders"
      : "Connect your SD card to begin";

  const statusDescription = isReady
    ? `Loaded ${totalGames} games across ${totalConsoles} consoles.`
    : isScanning
      ? `Reading ${state.progress.currentFolder || "your library"}...`
      : "Choose the root of your SD card or ROM folder and we’ll scan it locally.";

  return (
    <section className="scanlines relative isolate overflow-hidden rounded-[2rem] border bg-card/95 p-4 shadow-2xl sm:p-6 lg:p-8">
      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .orbit-spin {
          animation: orbit-spin 58s linear infinite;
        }
        .orbit-spin-reverse {
          animation: orbit-spin-reverse 44s linear infinite;
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,75,43,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,65,108,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-12rem)] max-w-6xl flex-col items-center justify-center gap-8 text-center">
        <div className="flex flex-wrap justify-center gap-2">
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
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <div className="retro-step h-8 w-8 shrink-0">
              <GamepadIcon className="gradient-icon h-4 w-4" />
            </div>
            <span className="font-pixel text-xs tracking-[0.28em] text-muted-foreground">
              SCAN LAUNCHER
            </span>
          </div>

          <h1 className="font-pixel neon-glow max-w-3xl text-5xl leading-[0.9] tracking-wider sm:text-6xl lg:text-7xl">
            CONNECT.
            <br />
            SCAN.
            <br />
            BROWSE.
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-relaxed sm:text-base lg:text-lg">
            Open the root of your SD card or ROM folder, let Retro Scraper read
            the library locally, then browse games with cleaner controls and
            real console logos.
          </p>
        </div>

        <div className="relative w-full max-w-[44rem] aspect-square">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,75,43,0.18),transparent_62%)] blur-3xl" />

          {ORBIT_RINGS.map((ring) => (
            <OrbitRing key={ring.duration} {...ring} />
          ))}

          <div className="absolute inset-0 z-20 flex items-center justify-center px-2">
            <Card className="w-[min(92%,26rem)] border border-white/10 bg-background/92 shadow-2xl backdrop-blur-md">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <SearchIcon className="gradient-icon h-6 w-6" />
                </div>

                <div className="space-y-1">
                  <p className="font-pixel text-[11px] tracking-[0.28em] text-muted-foreground">
                    {statusLabel}
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {statusTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {statusDescription}
                  </p>
                </div>

                {isScanning ? (
                  <div className="space-y-2">
                    <Progress value={progressValue} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{state.progress.currentFolder || "Scanning..."}</span>
                      <span>{progressValue}%</span>
                    </div>
                  </div>
                ) : isReady ? (
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile label="Consoles" value={String(totalConsoles)} />
                    <StatTile label="Games" value={String(totalGames)} />
                    <StatTile label="Art" value={String(gamesWithImages)} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Tap the center button to connect your library, or browse a
                    console first.
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="lg"
                    className="retro-btn-glow font-pixel w-full gap-2 px-5 text-xs tracking-[0.22em] sm:w-auto"
                    onClick={openAndScan}
                    disabled={isScanning}
                  >
                    <PrimaryIcon
                      className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
                    />
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
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="retro-tag">NO UPLOADS</span>
          <span className="retro-tag">NO ACCOUNTS</span>
          <span className="retro-tag">ONE FOLDER TO SCAN</span>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          {QUICK_STEPS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="retro-card bg-background/80 p-3 text-left shadow-sm"
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
    </section>
  );
}

function OrbitRing({
  logos,
  radius,
  duration,
  reverse,
  tileClassName,
  ringClassName,
}: {
  logos: LogoAsset[];
  radius: string;
  duration: string;
  reverse: boolean;
  tileClassName: string;
  ringClassName: string;
}) {
  const ringStyle = { animationDuration: duration } as CSSProperties;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${
        reverse ? "orbit-spin-reverse" : "orbit-spin"
      } ${ringClassName}`}
      style={ringStyle}
    >
      {logos.map((logo, index) => {
        const angle = (360 / logos.length) * index;

        return (
          <div
            key={logo.label}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(-1 * ${radius})) rotate(${-angle}deg)`,
            }}
          >
            <div
              className={`relative overflow-hidden rounded-2xl border bg-background/85 p-2 shadow-lg shadow-black/20 backdrop-blur-sm ${tileClassName}`}
            >
              <Image
                src={logo.src}
                alt={logo.label}
                fill
                className="object-contain p-2.5"
                unoptimized
              />
            </div>
          </div>
        );
      })}
    </div>
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
