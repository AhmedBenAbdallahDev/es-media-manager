"use client";

/**
 * /library/[console] — Console detail page
 *
 * Shows all games for a specific console with search, filter, pagination,
 * and inline metadata editing via GameEditSheet.
 */

import { useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeftIcon,
  GamepadIcon,
  RefreshCwIcon,
  FileCodeIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameTable } from "@/components/scraper/GameTable";
import { useLibrary } from "@/hooks/useLibrary";

interface ConsolePageProps {
  params: Promise<{ console: string }>;
}

export default function ConsolePage({ params }: ConsolePageProps) {
  const { console: encodedName } = use(params);
  const folderName = decodeURIComponent(encodedName);
  const [isCreating, setIsCreating] = useState(false);

  const { state, getConsole, createGamelist } = useLibrary();

  // ── Library not ready ────────────────────────────────────────────
  if (state.status === "idle" || state.status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="retro-step">
          <GamepadIcon className="gradient-icon h-6 w-6" />
        </div>
        <h2 className="font-pixel text-lg tracking-wider">NO LIBRARY LOADED</h2>
        <p className="text-muted-foreground text-sm">
          Please open your SD card or ROM folder first.
        </p>
        <Link href="/">
          <Button
            variant="outline"
            className="font-pixel gap-2 text-xs tracking-wider"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            GO TO LIBRARY
          </Button>
        </Link>
      </div>
    );
  }

  if (state.status === "scanning") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="retro-step animate-pulse">
          <GamepadIcon className="gradient-icon h-6 w-6" />
        </div>
        <p className="font-pixel text-muted-foreground text-sm tracking-wider">
          SCANNING...
        </p>
      </div>
    );
  }

  // ── Console not found ────────────────────────────────────────────
  const consoleLib = getConsole(folderName);
  if (!consoleLib) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="retro-step">
          <GamepadIcon className="gradient-icon h-6 w-6" />
        </div>
        <h2 className="font-pixel text-lg tracking-wider">CONSOLE NOT FOUND</h2>
        <p className="text-muted-foreground text-sm">
          “{folderName}” was not detected in your library.
        </p>
        <Link href="/">
          <Button
            variant="outline"
            className="font-pixel gap-2 text-xs tracking-wider"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            BACK TO LIBRARY
          </Button>
        </Link>
      </div>
    );
  }

  // ── No gamelist ──────────────────────────────────────────────────
  if (!consoleLib.hasGamelist) {
    const handleCreateGamelist = async () => {
      setIsCreating(true);
      try {
        await createGamelist(folderName);
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-pixel text-xl tracking-wider">
            {consoleLib.label}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="retro-step mb-4">
            <FileCodeIcon className="gradient-icon h-10 w-10" />
          </div>
          <p className="font-pixel text-sm tracking-wider">
            NO GAMELIST.XML FOUND
          </p>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            This console has {consoleLib.totalRoms} ROM
            {consoleLib.totalRoms !== 1 ? "s" : ""} but no gamelist.xml file.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button
              onClick={handleCreateGamelist}
              disabled={isCreating}
              className="retro-btn-glow font-pixel gap-2 text-xs tracking-wider"
            >
              {isCreating ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <FileCodeIcon className="h-4 w-4" />
              )}
              {isCreating ? "CREATING..." : "CREATE GAMELIST.XML NOW"}
            </Button>
            <p className="text-muted-foreground max-w-xs text-[11px] leading-relaxed">
              This will scan your ROM files and create a basic compatible XML
              file directly on your SD card so you can start managing media.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 py-2 sm:space-y-6 sm:py-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
          </Link>

          {/* Logo */}
          {consoleLib.logoSrc && (
            <div className="relative h-8 w-12 shrink-0 sm:h-10 sm:w-16">
              <Image
                src={consoleLib.logoSrc}
                alt={consoleLib.label}
                fill
                className="object-contain"
                unoptimized
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-pixel line-clamp-1 text-base tracking-wider sm:text-xl">
              {consoleLib.label}
            </h1>
            <p className="text-muted-foreground font-mono text-[10px] sm:text-xs">
              {consoleLib.folderName}
            </p>
          </div>
        </div>

        <div className="flex gap-2 self-end sm:self-auto">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[11px] sm:h-9 sm:text-sm"
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
              All Consoles
            </Button>
          </Link>
        </div>
      </div>

      {/* Game table */}
      <GameTable
        games={consoleLib.games}
        consoleFolderName={consoleLib.folderName}
      />
    </div>
  );
}
