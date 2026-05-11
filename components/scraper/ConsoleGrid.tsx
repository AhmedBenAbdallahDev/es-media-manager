"use client";

/**
 * ConsoleGrid
 *
 * Displays all detected console folders as a responsive card grid.
 * Each card shows the logo, name, ROM count, and image coverage stats.
 */

import Image from "next/image";
import Link from "next/link";
import { GamepadIcon, ImageIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ConsoleLibrary } from "@/types/scraper";

interface ConsoleGridProps {
  consoles: ConsoleLibrary[];
}

export function ConsoleGrid({ consoles }: ConsoleGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {consoles.map((c) => (
        <ConsoleCard key={c.folderName} console={c} />
      ))}
    </div>
  );
}

function ConsoleCard({ console: c }: { console: ConsoleLibrary }) {
  const total = c.games.length;
  const pct = total > 0 ? Math.round((c.gamesWithImages / total) * 100) : 0;
  const allGood = pct === 100 && total > 0;
  const missing = c.gamesWithoutImages;

  return (
    <Link href={`/library/${encodeURIComponent(c.folderName)}`}>
      <Card className="group retro-card relative h-full cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardContent className="flex flex-col items-center gap-2 p-3">
          {/* Logo / fallback icon */}
          <div className="bg-muted/40 relative flex h-14 w-full items-center justify-center rounded-md">
            {c.logoSrc ? (
              <Image
                src={c.logoSrc}
                alt={c.label}
                width={80}
                height={48}
                className="max-h-12 w-auto object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                unoptimized
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <GamepadIcon className="text-muted-foreground h-8 w-8" />
            )}
          </div>

          {/* Console name */}
          <p className="font-pixel line-clamp-2 w-full text-center text-xs leading-tight tracking-wider">
            {c.label.toUpperCase()}
          </p>

          {/* Folder name badge */}
          <span className="retro-tag">{c.folderName}</span>

          {/* Stats */}
          {c.hasGamelist && total > 0 ? (
            <div className="w-full space-y-1">
              <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-0.5">
                  <ImageIcon className="h-2.5 w-2.5" />
                  {pct}%
                </span>
                <span>{total} games</span>
              </div>
              <Progress value={pct} className="h-1" />
              {missing > 0 && (
                <p className="flex items-center gap-0.5 text-[10px] text-orange-500">
                  <AlertCircleIcon className="h-2.5 w-2.5 shrink-0" />
                  {missing} missing
                </p>
              )}
              {allGood && (
                <p className="text-[10px] text-green-500">✓ Complete</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-[10px]">
              {c.totalRoms} ROM{c.totalRoms !== 1 ? "s" : ""}
              {!c.hasGamelist && " · no gamelist"}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
