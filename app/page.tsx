"use client";

/**
 * / — Home page (Library)
 *
 * The library IS the home page. No separate navigation needed.
 * Shows all detected consoles as a grid. If no SD card is selected,
 * prompts the user to open one. If scanning is in progress, shows a
 * progress indicator.
 */

import { useLibrary } from "@/hooks/useLibrary";
import { ConsoleGrid } from "@/components/scraper/ConsoleGrid";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FolderOpenIcon,
  RefreshCwIcon,
  GamepadIcon,
  AlertCircleIcon,
} from "lucide-react";

export default function HomePage() {
  const { state, openAndScan, rescan } = useLibrary();

  // ── Idle: prompt to open folder ──────────────────────────────────
  if (state.status === "idle") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="retro-step">
          <GamepadIcon className="gradient-icon h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-pixel text-2xl tracking-wider">YOUR LIBRARY</h1>
          <p className="text-muted-foreground max-w-md text-sm">
            Select your SD card or ROM folder to scan your game collection. The
            app will automatically detect all consoles and parse your gamelists.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={openAndScan}
            className="retro-btn-glow font-pixel gap-2 text-sm tracking-wider"
          >
            <FolderOpenIcon className="h-5 w-5" />
            OPEN SD CARD
          </Button>
          <p className="text-muted-foreground text-xs">
            Requires Chrome or Edge 86+. Read-write access is needed to save
            changes.
          </p>
        </div>
        <div className="mt-4 grid max-w-lg grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Select Folder",
              desc: "Click the button above and choose your SD card root or ROM folder.",
            },
            {
              step: "02",
              title: "Auto-Scan",
              desc: "The app scans every console folder and reads your gamelists.",
            },
            {
              step: "03",
              title: "Manage",
              desc: "Browse, edit metadata, and manage artwork for all your games.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col gap-1.5">
              <div className="font-pixel gradient-text text-xs tracking-widest">
                STEP {step}
              </div>
              <h3 className="font-pixel text-sm tracking-wider">{title}</h3>
              <p className="text-muted-foreground text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Scanning: progress bar ───────────────────────────────────────
  if (state.status === "scanning") {
    const { current, total, currentFolder } = state.progress;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="retro-step animate-pulse">
          <GamepadIcon className="gradient-icon h-6 w-6" />
        </div>
        <div className="w-full max-w-sm space-y-3 text-center">
          <h2 className="font-pixel text-lg tracking-wider">SCANNING...</h2>
          <Progress value={pct} className="h-2" />
          <p className="text-muted-foreground text-sm">
            {current} / {total} folders scanned
          </p>
          {currentFolder && (
            <p className="text-muted-foreground truncate font-mono text-xs">
              /{currentFolder}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircleIcon className="text-destructive h-12 w-12" />
        <h2 className="font-pixel text-lg tracking-wider">SCAN FAILED</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {state.message}
        </p>
        <Button
          onClick={openAndScan}
          className="retro-btn-glow font-pixel gap-2 text-sm tracking-wider"
        >
          <FolderOpenIcon className="h-4 w-4" />
          TRY AGAIN
        </Button>
      </div>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────
  const { consoles, rootName } = state;
  const totalGames = consoles.reduce((s, c) => s + c.games.length, 0);
  const totalWithImages = consoles.reduce((s, c) => s + c.gamesWithImages, 0);
  const totalMissing = totalGames - totalWithImages;

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-pixel text-2xl tracking-wider">YOUR LIBRARY</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            <span className="font-mono">{rootName}</span> ·{" "}
            <span className="font-medium">{consoles.length}</span> consoles ·{" "}
            <span className="font-medium">{totalGames}</span> games
            {totalMissing > 0 && (
              <span className="text-orange-500">
                {" "}
                · {totalMissing} missing images
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={rescan}
            className="font-pixel gap-1.5 text-xs tracking-wider"
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
            RESCAN
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openAndScan}
            className="font-pixel gap-1.5 text-xs tracking-wider"
          >
            <FolderOpenIcon className="h-3.5 w-3.5" />
            CHANGE FOLDER
          </Button>
        </div>
      </div>

      {/* Console grid */}
      {consoles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <GamepadIcon className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No console folders were detected in this directory.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Make sure you selected the root of your SD card or ROM folder.
          </p>
        </div>
      ) : (
        <ConsoleGrid consoles={consoles} />
      )}
    </div>
  );
}
