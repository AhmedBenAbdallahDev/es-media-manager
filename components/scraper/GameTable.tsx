"use client";

/**
 * GameTable
 *
 * Game browser for a single console. Supports:
 * - List view: rows with inline thumbnail + missing-indicator icons
 * - Card view: large art tiles with media coverage badges
 * - Real-time search + has/missing image filter
 * - Pagination (50 per page)
 * - Opens GameDetailSheet on click
 */

import { useState, useMemo, useCallback } from "react";
import {
  SearchIcon,
  LayoutListIcon,
  LayoutGridIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  VideoIcon,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GamelistGame, GameFilter } from "@/types/scraper";
import { GameDetailSheet } from "@/components/scraper/GameDetailSheet";
import { GameThumbnail } from "@/components/scraper/GameThumbnail";
import { ScreenScraperArtDialog } from "@/components/scraper/ScreenScraperArtDialog";
import { useLibrary } from "@/hooks/useLibrary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 50;
const CARD_PAGE_SIZE = 40;

type ViewMode = "list" | "cards";

interface GameTableProps {
  games: GamelistGame[];
  consoleFolderName: string;
}

export function GameTable({ games, consoleFolderName }: GameTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GameFilter>("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedGame, setSelectedGame] = useState<GamelistGame | null>(null);
  const [fetchArtGame, setFetchArtGame] = useState<GamelistGame | null>(null);
  const [fetchingArt, setFetchingArt] = useState<Set<string>>(new Set());

  const { getConsole, rootHandle } = useLibrary();
  const consoleLib = getConsole(consoleFolderName);
  const dirHandle = consoleLib?.dirHandle;

  const pageSize = view === "cards" ? CARD_PAGE_SIZE : PAGE_SIZE;

  // ── Filtered data ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games.filter((g) => {
      if (
        q &&
        !g.name.toLowerCase().includes(q) &&
        !g.path.toLowerCase().includes(q)
      )
        return false;
      const hasAnyImage = Boolean(g.image?.trim() || g.thumbnail?.trim());
      if (filter === "has-image") return hasAnyImage;
      if (filter === "missing-image") return !hasAnyImage;
      return true;
    });
  }, [games, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);
  const handleFilter = useCallback((val: GameFilter) => {
    setFilter(val);
    setPage(1);
  }, []);
  const handleView = useCallback((v: ViewMode) => {
    setView(v);
    setPage(1);
  }, []);

  // ── Fetch Art handlers ───────────────────────────────────────────
  const handleFetchArt = useCallback((game: GamelistGame) => {
    setFetchArtGame(game);
  }, []);

  const handleArtworkSaved = useCallback((updatedGame: any) => {
    // Trigger a re-render by updating the game in the library context
    // The parent library context will be updated, which will cause a re-render
    toast.success(`Cover art saved successfully!`);
  }, []);

  // ── Stats ────────────────────────────────────────────────────────
  const withImage = useMemo(
    () => games.filter((g) => g.image?.trim() || g.thumbnail?.trim()).length,
    [games]
  );
  const withVideo = useMemo(
    () => games.filter((g) => g.video?.trim()).length,
    [games]
  );
  const missingImage = games.length - withImage;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="retro-tag">TOTAL: {games.length}</span>
        <span
          className="retro-tag"
          style={{ borderColor: "green", color: "green" }}
        >
          ✓ {withImage} WITH IMAGE
        </span>
        {missingImage > 0 && (
          <span
            className="retro-tag"
            style={{ borderColor: "orange", color: "orange" }}
          >
            ✗ {missingImage} MISSING
          </span>
        )}
        {withVideo > 0 && (
          <span
            className="retro-tag"
            style={{ borderColor: "blue", color: "blue" }}
          >
            ▶ {withVideo} VIDEO
          </span>
        )}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or filename…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => handleFilter(v as GameFilter)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All games</SelectItem>
            <SelectItem value="has-image">Has image</SelectItem>
            <SelectItem value="missing-image">Missing image</SelectItem>
          </SelectContent>
        </Select>
        {/* View toggle */}
        <div className="flex gap-1 rounded-md border p-0.5">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleView("list")}
            title="List view"
          >
            <LayoutListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleView("cards")}
            title="Card view"
          >
            <LayoutGridIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Results count ─────────────────────────────────────────── */}
      <p className="text-muted-foreground text-sm">
        Showing{" "}
        <span className="text-foreground font-medium">{filtered.length}</span>{" "}
        result{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== games.length && (
          <> (filtered from {games.length})</>
        )}
      </p>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <SearchIcon className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            No games match your search.
          </p>
        </div>
      )}

      {/* ── List View ─────────────────────────────────────────────── */}
      {view === "list" && filtered.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-pixel w-14 text-xs tracking-wider">
                  ART
                </TableHead>
                <TableHead className="font-pixel text-xs tracking-wider">
                  NAME
                </TableHead>
                <TableHead className="font-pixel hidden w-36 text-center text-xs tracking-wider sm:table-cell">
                  MEDIA
                </TableHead>
                <TableHead className="font-pixel hidden w-20 text-xs tracking-wider md:table-cell">
                  YEAR
                </TableHead>
                <TableHead className="font-pixel hidden w-24 text-xs tracking-wider lg:table-cell">
                  RATING
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((game) => {
                const hasImg = Boolean(
                  game.image?.trim() || game.thumbnail?.trim()
                );
                const hasVideo = Boolean(game.video?.trim());
                const hasMarquee = Boolean(game.marquee?.trim());
                const hasFanart = Boolean(game.fanart?.trim());
                const hasDesc = Boolean(game.desc?.trim());
                const hasRating = Boolean(game.rating?.trim());

                return (
                  <TableRow
                    key={game.path}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedGame(game)}
                  >
                    {/* Thumbnail */}
                    <TableCell className="p-1.5">
                      <GameThumbnail
                        dirHandle={dirHandle}
                        imagePath={game.image || game.thumbnail}
                        alt={game.name}
                        className="h-12 w-10 rounded"
                        iconSize="h-4 w-4"
                      />
                    </TableCell>

                    {/* Name + genre + fetch art button */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">
                            {game.name}
                          </p>
                          {game.genre && (
                            <p className="text-muted-foreground text-[11px]">
                              {game.genre}
                            </p>
                          )}
                        </div>
                        {!hasImg && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 h-7 shrink-0 gap-1 px-2 text-[11px] font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFetchArt(game);
                                  }}
                                  title="Fetch cover art from ScreenScraper"
                                >
                                  <SearchIcon className="h-3.5 w-3.5" />
                                  Fetch
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Fetch cover art from ScreenScraper</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>

                    {/* Media status icons */}
                    <TableCell className="hidden sm:table-cell">
                      <TooltipProvider delayDuration={300}>
                        <div className="flex items-center justify-center gap-1.5">
                          <MediaDot label="Image" present={hasImg} />
                          <MediaDot
                            label="Video"
                            present={hasVideo}
                            icon="video"
                          />
                          <MediaDot
                            label="Marquee"
                            present={hasMarquee}
                            icon="marquee"
                          />
                          <MediaDot
                            label="Description"
                            present={hasDesc}
                            icon="text"
                          />
                          <MediaDot
                            label="Rating"
                            present={hasRating}
                            icon="star"
                          />
                        </div>
                      </TooltipProvider>
                    </TableCell>

                    {/* Year */}
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {game.releasedate?.slice(0, 4) ?? "—"}
                    </TableCell>

                    {/* Rating */}
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {game.rating
                        ? `★ ${(parseFloat(game.rating) * 10).toFixed(1)}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Card View ─────────────────────────────────────────────── */}
      {view === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {pageItems.map((game) => {
            const hasImg = Boolean(
              game.image?.trim() || game.thumbnail?.trim()
            );
            const hasVideo = Boolean(game.video?.trim());
            const hasMarquee = Boolean(game.marquee?.trim());

            return (
              <div
                key={game.path}
                className={cn(
                  "group hover:border-primary/40 relative cursor-pointer overflow-hidden rounded-lg border transition-all duration-200 hover:shadow-md",
                  !hasImg && "border-orange-500/30 bg-orange-500/5"
                )}
                onClick={() => setSelectedGame(game)}
              >
                {/* Cover art */}
                <GameThumbnail
                  dirHandle={dirHandle}
                  imagePath={game.image || game.thumbnail}
                  alt={game.name}
                  className="aspect-[3/4] w-full"
                  iconSize="h-10 w-10"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                {/* Bottom info */}
                <div className="absolute right-0 bottom-0 left-0 translate-y-full bg-gradient-to-t from-black/90 to-transparent p-2 transition-transform group-hover:translate-y-0">
                  <p className="line-clamp-2 text-[11px] font-medium text-white">
                    {game.name}
                  </p>
                </div>

                {/* Media badges (top-right) */}
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {hasVideo && (
                    <span className="rounded bg-blue-500/80 px-1 py-0.5 text-[9px] font-bold text-white">
                      VID
                    </span>
                  )}
                  {hasMarquee && (
                    <span className="rounded bg-purple-500/80 px-1 py-0.5 text-[9px] font-bold text-white">
                      MRQ
                    </span>
                  )}
                </div>

                {/* Missing image indicator / Fetch Art button */}
                {!hasImg && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="hover:bg-primary/80 absolute top-1.5 left-1.5 z-20 rounded-full bg-black/60 p-1.5 backdrop-blur-sm transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchArt(game);
                          }}
                        >
                          <SearchIcon className="h-3.5 w-3.5 text-white" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Fetch cover art</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - safePage) <= 2
              )
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span
                    key={`e-${i}`}
                    className="text-muted-foreground px-1 text-sm"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safePage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(item as number)}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Sheet ──────────────────────────────────────────── */}
      <GameDetailSheet
        game={selectedGame}
        consoleFolderName={consoleFolderName}
        onClose={() => setSelectedGame(null)}
      />

      {/* ── ScreenScraper Fetch Art Dialog ────────────────────────── */}
      <ScreenScraperArtDialog
        open={!!fetchArtGame}
        onOpenChange={(open) => {
          if (!open) setFetchArtGame(null);
        }}
        gameName={fetchArtGame?.name || ""}
        console={consoleFolderName}
        mediaType="covers"
        mainDirHandle={rootHandle}
        onArtworkSaved={handleArtworkSaved}
      />
    </div>
  );
}

// ── Helper: coloured dot for media presence ──────────────────────────────────

interface MediaDotProps {
  label: string;
  present: boolean;
  icon?: "video" | "marquee" | "text" | "star";
}

function MediaDot({ label, present }: MediaDotProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              present ? "bg-green-500" : "bg-orange-400/50"
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}: {present ? "✓ Present" : "✗ Missing"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
