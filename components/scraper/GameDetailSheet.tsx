"use client";

/**
 * GameDetailSheet
 *
 * Full-screen modal that combines:
 * - Media management (upload/view covers, videos, etc.)
 * - Metadata editing (gamelist.xml)
 *
 * Provides a "dashboard" view for a single game.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SaveIcon,
  CheckCircle2Icon,
  XCircleIcon,
  VideoIcon,
  ImageIcon,
  MonitorIcon,
  XIcon,
  ArrowLeftIcon,
  Loader2,
} from "lucide-react";
import type { GamelistGame } from "@/types/scraper";
import { useLibrary } from "@/hooks/useLibrary";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GameMediaForm } from "@/components/browser/GameMediaForm";
import { Game } from "@/types";
import { MEDIA_TYPES } from "@/lib/constants";
import { sanitizeBasenameForSave, MEDIA_KEY_TO_GAME_HANDLE } from "@/lib/gameMediaHelpers";
import {
  loadFileAsUrl,
  resolveMediaFileHandle,
} from "@/lib/mediaFileOperations";

interface GameDetailSheetProps {
  game: GamelistGame | null;
  consoleFolderName: string;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esDateToInput(v?: string) {
  if (!v || v.length < 8) return "";
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}
function inputToEsDate(v: string) {
  if (!v) return "";
  return v.replace(/-/g, "") + "T000000";
}
function ratingToEs(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  return Math.min(1, Math.max(0, n / 10)).toFixed(1);
}
function esRatingDisplay(v?: string) {
  if (!v) return "";
  const n = parseFloat(v);
  return isNaN(n) ? "" : (n * 10).toFixed(1);
}

// A small field row that shows ✓/✗ badge + label + input
function FieldRow({
  label,
  children,
  present,
}: {
  label: string;
  children: React.ReactNode;
  present: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <Label className="text-xs">{label}</Label>
        {present ? (
          <CheckCircle2Icon className="h-3 w-3 shrink-0 text-green-500" />
        ) : (
          <Badge
            variant="outline"
            className="border-red-400/40 bg-red-400/10 px-1.5 py-0 text-[10px] text-red-500"
          >
            Missing
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function GameDetailSheet({
  game,
  consoleFolderName,
  onClose,
}: GameDetailSheetProps) {
  const { saveGame, getConsole, rootHandle } = useLibrary();
  const [draft, setDraft] = useState<GamelistGame | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Media Form State
  const [currentMediaUrls, setCurrentMediaUrls] = useState<
    Record<string, string>
  >({});
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  // Initialize draft when game opens
  useEffect(() => {
    setDraft(game ? { ...game } : null);
  }, [game]);

  const consoleLib = getConsole(consoleFolderName);
  const dirHandle = consoleLib?.dirHandle;

  // Debug logging
  useEffect(() => {
    console.log(`[GameDetailSheet] State check:`, {
      hasDraft: !!draft,
      draftName: draft?.name,
      draftImage: draft?.image,
      draftThumbnail: draft?.thumbnail,
      consoleFolderName,
      hasConsoleLib: !!consoleLib,
      hasDirHandle: !!dirHandle,
    });
  }, [draft, consoleFolderName, consoleLib, dirHandle]);

  // Load Media URLs - using the same proven logic as GameThumbnail
  useEffect(() => {
    console.log(`[Media] Effect triggered:`, {
      hasDraft: !!draft,
      hasDirHandle: !!dirHandle,
      draftName: draft?.name,
    });

    if (!draft || !dirHandle) {
      console.warn(`[Media] Early return - missing draft or dirHandle`);
      return;
    }

    let isMounted = true;
    const loadUrls = async () => {
      setIsLoadingUrls(true);
      const urls: Record<string, string> = {};

      // This is the same resolve function used by GameThumbnail (which works!)
      const resolveImageUrl = async (
        relativePath: string
      ): Promise<string | null> => {
        // First try the direct resolution + traversal
        try {
          const clean = relativePath.replace(/^\.\//, "").replace(/\\/g, "/");
          const parts = clean.split("/").filter(Boolean);
          if (parts.length === 0) return null;

          let current: FileSystemDirectoryHandle = dirHandle;
          for (let i = 0; i < parts.length - 1; i++) {
            current = await current.getDirectoryHandle(parts[i]);
          }
          const fileHandle = await current.getFileHandle(
            parts[parts.length - 1]
          );
          const file = await fileHandle.getFile();
          return URL.createObjectURL(file);
        } catch (e) {
          // Direct resolution failed — try tolerant lookup across known media folders
          console.log(
            `[Media] Direct resolution failed for ${relativePath}, trying fallback...`,
            e
          );
        }

        // Fallback: tolerant lookup
        try {
          const fh = await resolveMediaFileHandle(dirHandle, relativePath);
          if (!fh) return null;
          const file = await fh.getFile();
          return URL.createObjectURL(file);
        } catch (err) {
          console.warn(`[Media] Fallback also failed for ${relativePath}`, err);
          return null;
        }
      };

      const loadPath = async (key: string, path?: string) => {
        if (!path || !path.trim()) return;

        console.log(`[Media] Loading ${key} for "${draft.name}": ${path}`);
        const url = await resolveImageUrl(path);

        if (url && isMounted) {
          urls[key] = url;
          console.log(`[Media] SUCCESS: Found ${key} for "${draft.name}"`);
        } else {
          console.warn(
            `[Media] FAILED: Could not find ${key} for "${draft.name}": ${path}`
          );
        }
      };

      // Load covers - try both image and thumbnail fields
      if (draft.image?.trim()) {
        await loadPath("covers", draft.image);
      } else if (draft.thumbnail?.trim()) {
        await loadPath("covers", draft.thumbnail);
      }

      await Promise.all([
        loadPath("marquees", draft.marquee),
        loadPath("videos", draft.video),
        loadPath("fanart", draft.fanart),
      ]);

      if (isMounted) {
        setCurrentMediaUrls(urls);
        setIsLoadingUrls(false);
        console.log(
          `[Media] Final URLs for "${draft.name}":`,
          Object.keys(urls),
          urls
        );
      }
    };

    loadUrls();

    return () => {
      isMounted = false;
      // Cleanup URLs - ONLY on unmount, not on every re-run
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft?.name,
    draft?.path,
    draft?.image,
    draft?.video,
    draft?.marquee,
    draft?.fanart,
    dirHandle,
  ]); // Re-run when paths change to refresh previews immediately

  // Adapter to convert GamelistGame to Game (for GameMediaForm)
  const gameAdapter: Game = useMemo(() => {
    if (!draft) return {} as Game;

    // Determine media status based on draft fields
    const status = {
      // Consider `thumbnail` as a valid fallback for covers so UI shows it where appropriate
      covers: !!(
        (draft.image && draft.image.trim()) ||
        (draft.thumbnail && draft.thumbnail.trim())
      ),
      marquees: !!(draft.marquee && draft.marquee.trim()),
      videos: !!(draft.video && draft.video.trim()),
      fanart: !!(draft.fanart && draft.fanart.trim()),
      screenshots: false, // Not standard in gamelist.xml usually
      titlescreens: false,
      "3dboxes": false,
      backcovers: false,
      physicalmedia: false,
    };

    return {
      id: draft.id || "temp-id",
      name: draft.name,
      console: consoleFolderName,
      hasCover: status.covers,
      hasLogo: status.marquees,
      hasVideo: status.videos,
      mediaTypes: [], // Populated by what? Not strictly needed for the form's display
      mediaStatus: status,
      // We don't have file handles from gamelist, so we leave them undefined.
      // GameMediaForm will use currentMediaUrls for display.
    };
  }, [draft, consoleFolderName]);

  const set = useCallback(
    <K extends keyof GamelistGame>(k: K, v: GamelistGame[K]) => {
      setDraft((p) => (p ? { ...p, [k]: v } : p));
    },
    []
  );

  async function handleSave() {
    if (!draft || !game) return;
    setIsSaving(true);
    try {
      await saveGame(consoleFolderName, draft, game.path);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  // Callback when media is updated/uploaded via GameMediaForm
  const handleMediaUpdate = async (updatedGame: Game) => {
    // Calculate new draft first
    let newDraft = { ...draft } as GamelistGame;
    if (!newDraft) return;

    const safeName = sanitizeBasenameForSave(updatedGame.name);

    // Update paths for core supported types
    // We assume the standard ES-DE folder structure: ./media/covers/Game Name.png
    // NOTE: We trust GameMediaForm saved it to the standard location.

    if (updatedGame.mediaStatus.covers) {
      const mt = MEDIA_TYPES.find((m) => m.key === "covers");
      if (mt) {
        newDraft.image = `./${mt.folder}/${safeName}${mt.suffix || ""}${mt.extension}`;
      }
    }
    if (updatedGame.mediaStatus.marquees) {
      const mt = MEDIA_TYPES.find((m) => m.key === "marquees");
      if (mt) {
        newDraft.marquee = `./${mt.folder}/${safeName}${mt.suffix || ""}${mt.extension}`;
      }
    }
    if (updatedGame.mediaStatus.videos) {
      const mt = MEDIA_TYPES.find((m) => m.key === "videos");
      if (mt) {
        newDraft.video = `./${mt.folder}/${safeName}${mt.suffix || ""}${mt.extension}`;
      }
    }
    if (updatedGame.mediaStatus.screenshots) {
      const mt = MEDIA_TYPES.find((m) => m.key === "screenshots");
      if (mt) {
        // Gamelist.xml doesn't have a standard 'screenshots' tag for all ES versions,
        // but often use 'thumbnail' or 'fanart' as fallbacks.
        // We'll set 'thumbnail' as it matches the intent of a smaller/different preview.
        newDraft.thumbnail = `./${mt.folder}/${safeName}${mt.suffix || ""}${mt.extension}`;
      }
    }

    setDraft(newDraft);

    // Auto-save metadata to persist the new file path immediately
    if (game?.path) {
      try {
        await saveGame(consoleFolderName, newDraft, game.path);
        // Toast is handled in UI flow now to avoid doubles
      } catch (e) {
        console.error("Auto-save failed", e);
        toast.error("Media saved but gamelist update failed.");
      }
    }

    // Refresh current media previews immediately so videos/images render
    // without requiring a close/reopen cycle.
    const nextUrls = { ...currentMediaUrls };
    const refreshUrl = async (mediaKey: string) => {
      const handleKey = MEDIA_KEY_TO_GAME_HANDLE[mediaKey];
      const handle = handleKey ? updatedGame[handleKey] : undefined;

      if (!handle) return;

      const previousUrl = nextUrls[mediaKey];
      if (previousUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      nextUrls[mediaKey] = await loadFileAsUrl(handle);
    };

    for (const [mediaKey, enabled] of Object.entries(updatedGame.mediaStatus)) {
      if (!enabled) continue;
      await refreshUrl(mediaKey);
    }

    setCurrentMediaUrls(nextUrls);
  };

  if (!draft) return null;

  const hasImg = Boolean(
    (draft.image && draft.image.trim()) ||
    (draft.thumbnail && draft.thumbnail.trim())
  );
  const hasVideo = Boolean(draft.video?.trim());
  const hasMarquee = Boolean(draft.marquee?.trim());
  const hasFanart = Boolean(draft.fanart?.trim());

  const missingCount = [
    hasImg,
    hasVideo,
    hasMarquee,
    Boolean(draft.desc?.trim()),
    Boolean(draft.developer?.trim()),
    Boolean(draft.publisher?.trim()),
    Boolean(draft.genre?.trim()),
    Boolean(draft.rating?.trim()),
    Boolean(draft.releasedate?.trim()),
  ].filter((x) => !x).length;

  return (
    <Sheet open={Boolean(game)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="flex h-[100dvh] w-screen flex-col !gap-0 overflow-hidden border-none p-0 sm:max-w-none"
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <SheetHeader className="bg-background border-border/40 z-10 flex-shrink-0 border-b px-4 py-4 shadow-sm sm:px-6">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="font-pixel truncate text-lg tracking-wider sm:text-xl">
                  {draft.name.toUpperCase()}
                </SheetTitle>
                <span className="retro-tag">{consoleFolderName}</span>
              </div>
              <SheetDescription className="text-muted-foreground flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:text-sm">
                <span className="max-w-full truncate font-mono">{draft.path}</span>
                {missingCount === 0 ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle2Icon className="h-3.5 w-3.5" />
                    Fully scraped
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                    <XCircleIcon className="h-3.5 w-3.5" />
                    {missingCount} field{missingCount !== 1 ? "s" : ""} missing
                  </span>
                )}
              </SheetDescription>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="w-full gap-2 sm:w-auto"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Close
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "w-full gap-2 sm:w-auto",
                  missingCount > 0 ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600" : ""
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SaveIcon className={cn("h-4 w-4", missingCount > 0 && "animate-pulse")} />
                )}
                {isSaving ? "Saving..." : missingCount > 0 ? "Save (Unfinished)" : "Save"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* ── Content: Tabbed View ──────────────────────────────── */}
        <div className="flex-1 min-h-0 bg-muted/5">
          <Tabs defaultValue="metadata" className="h-full flex flex-col">
            <div className="bg-background border-b px-4 sm:px-6">
              <div className="mx-auto max-w-[1600px]">
                <TabsList className="h-12 w-full justify-start gap-4 bg-transparent p-0">
                  <TabsTrigger
                    value="metadata"
                    className="data-[state=active]:border-primary h-full rounded-none border-b-2 border-transparent bg-transparent px-2 font-pixel text-xs tracking-wider transition-none data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4 sm:text-sm"
                  >
                    METADATA
                  </TabsTrigger>
                  <TabsTrigger
                    value="media"
                    className="data-[state=active]:border-primary h-full rounded-none border-b-2 border-transparent bg-transparent px-2 font-pixel text-xs tracking-wider transition-none data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4 sm:text-sm"
                  >
                    MEDIA
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="mx-auto max-w-[1600px] h-full">
                <TabsContent value="metadata" className="m-0 p-0 h-full">
                  <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
                    <div className="grid gap-8 md:grid-cols-[1fr,350px]">
                      {/* Left: Main Metadata */}
                      <div className="space-y-6">
                        <FieldRow
                          label="Game Name"
                          present={Boolean(draft.name?.trim())}
                        >
                          <Input
                            value={draft.name}
                            onChange={(e) => set("name", e.target.value)}
                            className="font-medium"
                          />
                        </FieldRow>

                        <FieldRow
                          label="Description"
                          present={Boolean(draft.desc?.trim())}
                        >
                          <Textarea
                            value={draft.desc ?? ""}
                            onChange={(e) => set("desc", e.target.value)}
                            placeholder="No description scraped…"
                            rows={12}
                            className="resize-none text-sm leading-relaxed"
                          />
                        </FieldRow>
                      </div>

                      {/* Right: Technical Details */}
                      <div className="space-y-6">
                        <div className="rounded-lg border bg-card p-4 space-y-4">
                          <h4 className="font-pixel text-[10px] tracking-widest text-muted-foreground uppercase">
                            Technical Details
                          </h4>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <FieldRow
                              label="Developer"
                              present={Boolean(draft.developer?.trim())}
                            >
                              <Input
                                value={draft.developer ?? ""}
                                onChange={(e) => set("developer", e.target.value)}
                                placeholder="—"
                                size={1} // Fix for grid layout
                                className="h-8 text-xs"
                              />
                            </FieldRow>
                            <FieldRow
                              label="Publisher"
                              present={Boolean(draft.publisher?.trim())}
                            >
                              <Input
                                value={draft.publisher ?? ""}
                                onChange={(e) => set("publisher", e.target.value)}
                                placeholder="—"
                                className="h-8 text-xs"
                              />
                            </FieldRow>
                            <FieldRow
                              label="Genre"
                              present={Boolean(draft.genre?.trim())}
                            >
                              <Input
                                value={draft.genre ?? ""}
                                onChange={(e) => set("genre", e.target.value)}
                                placeholder="—"
                                className="h-8 text-xs"
                              />
                            </FieldRow>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <FieldRow
                              label="Release Date"
                              present={Boolean(draft.releasedate?.trim())}
                            >
                              <Input
                                type="date"
                                value={esDateToInput(draft.releasedate)}
                                onChange={(e) =>
                                  set("releasedate", inputToEsDate(e.target.value))
                                }
                                className="h-8 text-xs"
                              />
                            </FieldRow>
                            <FieldRow
                              label="Players"
                              present={Boolean(draft.players?.trim())}
                            >
                              <Input
                                value={draft.players ?? ""}
                                onChange={(e) => set("players", e.target.value)}
                                placeholder="—"
                                className="h-8 text-xs"
                              />
                            </FieldRow>
                          </div>

                          <FieldRow
                            label="Rating (0.0 - 10.0)"
                            present={Boolean(draft.rating?.trim())}
                          >
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={esRatingDisplay(draft.rating)}
                                onChange={(e) =>
                                  set("rating", ratingToEs(e.target.value))
                                }
                                className="h-8 w-20 text-xs"
                              />
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500" 
                                  style={{ width: `${(parseFloat(esRatingDisplay(draft.rating)) || 0) * 10}%` }}
                                />
                              </div>
                            </div>
                          </FieldRow>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="media" className="m-0 p-0 h-full">
                  <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
                    <GameMediaForm
                      game={gameAdapter}
                      mainDirHandle={rootHandle}
                      currentMediaUrls={currentMediaUrls}
                      isLoadingUrls={isLoadingUrls}
                      onGameUpdate={handleMediaUpdate}
                      onClearBrokenAsset={(mediaKey) => {
                        // Clear the broken asset reference from the draft
                        if (!draft) return;
                        const newDraft = { ...draft };
                        switch (mediaKey) {
                          case "covers":
                            newDraft.image = undefined;
                            newDraft.thumbnail = undefined;
                            break;
                          case "marquees":
                            newDraft.marquee = undefined;
                            break;
                          case "videos":
                            newDraft.video = undefined;
                            break;
                          case "fanart":
                            newDraft.fanart = undefined;
                            break;
                          case "screenshots":
                            newDraft.thumbnail = undefined;
                            break;
                          default:
                            break;
                        }
                        setDraft(newDraft);
                        // Auto-save the cleared reference
                        if (game?.path) {
                          saveGame(consoleFolderName, newDraft, game.path)
                            .then(() => toast.success("Cleared broken reference"))
                            .catch(() => toast.error("Failed to save changes"));
                        }
                      }}
                    />
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
