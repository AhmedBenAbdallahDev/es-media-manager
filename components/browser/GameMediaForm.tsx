"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Game, MediaType as MediaTypeConfig } from "@/types";
import { MEDIA_TYPES } from "@/lib/constants";
import {
  saveMediaFile,
  getOrCreateConsoleDirectory,
} from "@/lib/mediaFileOperations";
import { updateGameWithMediaFile } from "@/lib/gameMediaHelpers";
import { toast } from "sonner";
import Image from "next/image";
import {
  ImageOff,
  Loader2,
  AlertCircle,
  Upload,
  X,
  ExternalLink,
  Check,
  Search,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";
import { fromBlob } from "image-resize-compress";
import { ScreenScraperArtDialog } from "@/components/scraper/ScreenScraperArtDialog";

interface GameMediaFormProps {
  game: Game;
  mainDirHandle: any;
  currentMediaUrls: Record<string, string>;
  isLoadingUrls: boolean;
  onGameUpdate: (updatedGame: Game) => void;
  /** Callback to clear a broken asset reference from the gamelist */
  onClearBrokenAsset?: (mediaKey: string) => void;
}

export function GameMediaForm({
  game,
  mainDirHandle,
  currentMediaUrls,
  isLoadingUrls,
  onGameUpdate,
  onClearBrokenAsset,
}: GameMediaFormProps) {
  const [editableMediaFiles, setEditableMediaFiles] = useState<
    Record<string, File | null>
  >({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Broken asset dialog state
  const [brokenAssetDialog, setBrokenAssetDialog] = useState<{
    open: boolean;
    mediaKey: string;
    mediaLabel: string;
  }>({ open: false, mediaKey: "", mediaLabel: "" });

  // ScreenScraper dialog state
  const [scraperDialog, setScraperDialog] = useState<{
    open: boolean;
    mediaKey: string;
    mediaType: string;
  }>({ open: false, mediaKey: "", mediaType: "covers" });

  // Image viewer state
  const [imageViewer, setImageViewer] = useState<{
    open: boolean;
    url: string;
    alt: string;
    mediaKey: string;
    mediaLabel: string;
  }>({ open: false, url: "", alt: "", mediaKey: "", mediaLabel: "" });

  const viewerErrorHandledRef = useRef(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!imageViewer.open) {
      viewerErrorHandledRef.current = false;
    }
  }, [imageViewer.open, imageViewer.url]);

  const handleMediaFileChange = useCallback(
    async (mediaKey: string, file: File | null) => {
      setSaveError(null);

      if (!file) {
        setEditableMediaFiles((prev) => ({ ...prev, [mediaKey]: null }));
        return;
      }

      setUploadingKeys((prev) => new Set(prev).add(mediaKey));
      try {
        const consoleDirHandle = await getOrCreateConsoleDirectory(
          mainDirHandle,
          game.console
        );

        const mediaType = MEDIA_TYPES.find((m) => m.key === mediaKey);
        if (!mediaType) throw new Error("Unknown media type: " + mediaKey);

        const fileHandle = await saveMediaFile(
          consoleDirHandle,
          mediaType,
          game.name,
          file
        );

        const updatedGame = updateGameWithMediaFile(
          { ...game },
          mediaKey,
          fileHandle,
          mediaType.folder
        );

        setEditableMediaFiles((prev) => ({ ...prev, [mediaKey]: null }));
        setUrlInputs((prev) => ({ ...prev, [mediaKey]: "" }));
        onGameUpdate(updatedGame);

        toast.success(`${mediaType.label} saved for ${game.name}`);
      } catch (err) {
        console.error("Error autosaving media:", err);
        setSaveError(err instanceof Error ? err.message : String(err));
        toast.error("Failed to save media");
      } finally {
        setUploadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(mediaKey);
          return next;
        });
      }
    },
    [game, mainDirHandle, onGameUpdate]
  );

  const handleUrlUpload = useCallback(
    async (mediaKey: string, url: string) => {
      if (!url.trim()) return;

      setUploadingKeys((prev) => new Set(prev).add(mediaKey));
      try {
        const mediaType = MEDIA_TYPES.find((m) => m.key === mediaKey);
        if (!mediaType) throw new Error("Unknown media type: " + mediaKey);

        const response = await fetch("/api/fetch-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url }),
        });

        if (!response.ok) throw new Error("Failed to fetch image");

        let blob = await response.blob();
        let file = new File(
          [blob],
          `image.${mediaType.extension.replace(".", "")}`,
          { type: mediaType.accept }
        );

        // Convert WebP to JPG if needed
        if (blob.type === "image/webp" && mediaType.accept === "image/jpeg") {
          const converted = await fromBlob(file, 100, "auto", "auto", "jpeg");
          file = new File([converted], `image.jpg`, { type: "image/jpeg" });
        }

        await handleMediaFileChange(mediaKey, file);
      } catch (err) {
        console.error("Error fetching from URL:", err);
        toast.error("Failed to fetch image from URL");
        setUploadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(mediaKey);
          return next;
        });
      }
    },
    [handleMediaFileChange]
  );

  const toggleCard = useCallback((mediaKey: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(mediaKey)) {
        next.delete(mediaKey);
      } else {
        next.add(mediaKey);
      }
      return next;
    });
  }, []);

  const renderMediaCard = (mediaType: MediaTypeConfig) => {
    const currentUrl = currentMediaUrls[mediaType.key];
    const newFile = editableMediaFiles[mediaType.key];
    const isVideo = mediaType.key === "videos";
    const isUploading = uploadingKeys.has(mediaType.key);
    const isExpanded = expandedCards.has(mediaType.key);
    const urlInput = urlInputs[mediaType.key] || "";

    const isReferencedInGamelist = isVideo
      ? game.hasVideo
      : (game.mediaStatus?.[mediaType.key as keyof typeof game.mediaStatus] ??
        false);

    const fileExistsOnDisk = !!currentUrl;
    const hasContent =
      !!currentUrl ||
      !!newFile ||
      (isReferencedInGamelist && !fileExistsOnDisk);
    const hasDisplayableContent = !!currentUrl || !!newFile;
    const isBroken = isReferencedInGamelist && !fileExistsOnDisk && !newFile;

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: async (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          await handleMediaFileChange(mediaType.key, acceptedFiles[0]);
        }
      },
      accept: isVideo
        ? { "video/mp4": [".mp4"] }
        : {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
          },
      maxFiles: 1,
      noClick: true,
    });

    return (
      <div
        key={mediaType.key}
        {...getRootProps()}
        className={`group relative flex h-full flex-col overflow-hidden rounded-xl border-2 transition-all duration-300 ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"} ${hasDisplayableContent ? "bg-card" : "bg-muted/30"} ${isBroken ? "border-orange-500/50" : ""} `}
      >
        <input {...getInputProps()} />

        {/* Header */}
        <div className="border-border/50 bg-muted/30 flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <h3 className="font-pixel text-xs tracking-wider">
              {mediaType.label.toUpperCase()}
            </h3>
            {hasDisplayableContent && (
              <Check className="h-3.5 w-3.5 text-green-600" />
            )}
            {isBroken && (
              <Badge
                variant="outline"
                className="border-orange-500/50 text-xs text-orange-600"
              >
                BROKEN
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isBroken && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-orange-500 hover:text-orange-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBrokenAssetDialog({
                        open: true,
                        mediaKey: mediaType.key,
                        mediaLabel: mediaType.label,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear broken asset</TooltipContent>
              </Tooltip>
            )}
            {hasDisplayableContent && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Delete for ${mediaType.label} to be implemented.`);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete media</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCard(mediaType.key);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExpanded ? "Collapse" : "Expand"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Preview Area - Larger */}
        <div
          className={`relative overflow-hidden transition-all duration-300 ${isExpanded ? "h-56 sm:h-64" : "h-44 sm:h-52"} `}
        >
          {isLoadingUrls && !newFile ? (
            <div className="bg-muted flex h-full w-full animate-pulse items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : isUploading ? (
            <div className="bg-primary/5 flex h-full w-full flex-col items-center justify-center">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">Uploading...</p>
            </div>
          ) : hasDisplayableContent && !newFile ? (
            <div
              className="bg-muted relative h-full w-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (currentUrl) {
                  setImageViewer({
                    open: true,
                    url: currentUrl,
                    alt: `${mediaType.label} for ${game.name}`,
                    mediaKey: mediaType.key,
                    mediaLabel: mediaType.label,
                  });
                }
              }}
            >
              {isVideo ? (
                <video
                  src={currentUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                  onError={(e) => console.error("Video player error:", e)}
                />
              ) : (
                <Image
                  src={currentUrl}
                  alt={`Current ${mediaType.label}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: "contain" }}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/20 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageViewer({
                        open: true,
                        url: currentUrl,
                        alt: `${mediaType.label} for ${game.name}`,
                        mediaKey: mediaType.key,
                        mediaLabel: mediaType.label,
                      });
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRefs.current[mediaType.key]?.click();
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Replace
                  </Button>
                </div>
              </div>
            </div>
          ) : isBroken ? (
            <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-orange-500/30 bg-orange-500/5">
              <AlertCircle className="mb-2 h-8 w-8 text-orange-500" />
              <p className="text-sm font-medium text-orange-600">
                Asset link broken
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Referenced in gamelist but file not found
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setBrokenAssetDialog({
                    open: true,
                    mediaKey: mediaType.key,
                    mediaLabel: mediaType.label,
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Reference
              </Button>
            </div>
          ) : (
            <div className="bg-muted/50 border-border flex h-full w-full flex-col items-center justify-center border border-dashed">
              <ImageOff className="text-muted-foreground/40 mb-2 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                No {mediaType.label}
              </p>
            </div>
          )}
        </div>

        {/* Upload Actions - Always visible with proper spacing */}
        <div className="border-border/50 bg-muted/20 border-t px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              ref={(el) => {
                fileInputRefs.current[mediaType.key] = el;
              }}
              type="file"
              accept={mediaType.accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file) handleMediaFileChange(mediaType.key, file);
              }}
            />
            <Button
              variant={hasContent ? "outline" : "default"}
              size="default"
              className="h-9 w-full gap-2 px-3 text-xs sm:h-10 sm:text-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRefs.current[mediaType.key]?.click();
              }}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4" />
              <span>{hasContent ? "Replace" : "Upload"}</span>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="h-9 w-full gap-2 px-3 text-xs sm:h-10 sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCard(mediaType.key);
                  }}
                  disabled={isUploading}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>URL</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Paste image URL</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="border-primary/50 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/70 h-9 w-full gap-2 px-3 text-xs font-medium sm:h-10 sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScraperDialog({
                      open: true,
                      mediaKey: mediaType.key,
                      mediaType: mediaType.key,
                    });
                  }}
                  disabled={isUploading}
                >
                  <Search className="h-4 w-4" />
                  <span>Fetch</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Search ScreenScraper for {mediaType.label}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* URL Input - Expandable */}
          {isExpanded && (
            <div className="animate-in slide-in-from-top-2 mt-4">
              <div className="relative">
                <Input
                  type="url"
                  placeholder="Paste image URL..."
                  value={urlInput}
                  onChange={(e) =>
                    setUrlInputs((prev) => ({
                      ...prev,
                      [mediaType.key]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlInput.trim()) {
                      handleUrlUpload(mediaType.key, urlInput);
                    }
                  }}
                  disabled={isUploading}
                  className="h-9 pr-20 sm:h-10 sm:pr-24"
                />
                <Button
                  size="sm"
                  variant="default"
                  className="absolute top-1.5 right-1.5 h-7 px-2 text-xs sm:px-3"
                  onClick={() =>
                    urlInput.trim() && handleUrlUpload(mediaType.key, urlInput)
                  }
                  disabled={isUploading || !urlInput.trim()}
                >
                  Go
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Supports JPG, PNG, WebP (auto-converts to{" "}
                {mediaType.extension.replace(".", "").toUpperCase()})
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CORE_MEDIA_KEYS = ["covers", "marquees", "videos", "screenshots"];
  const coreMedia = MEDIA_TYPES.filter((m) => CORE_MEDIA_KEYS.includes(m.key));
  const optionalMedia = MEDIA_TYPES.filter(
    (m) => !CORE_MEDIA_KEYS.includes(m.key)
  );

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Save Error</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        <div>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Important Media</h2>
            <Badge variant="secondary" className="text-xs">
              {coreMedia.length} types
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {coreMedia.map(renderMediaCard)}
          </div>
        </div>

        <div className="border-border/40 border-t pt-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Optional Extras</h2>
            <Badge variant="secondary" className="text-xs">
              {optionalMedia.length} types
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {optionalMedia.map(renderMediaCard)}
          </div>
        </div>
      </div>

      {/* ── Broken Asset Dialog ──────────────────────────────────── */}
      <Dialog
        open={brokenAssetDialog.open}
        onOpenChange={(open) =>
          setBrokenAssetDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Broken Asset Detected
            </DialogTitle>
            <DialogDescription>
              The{" "}
              <span className="font-semibold">
                {brokenAssetDialog.mediaLabel}
              </span>{" "}
              reference exists in your gamelist.xml but the actual file was not
              found on disk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-sm">
              This can happen if the image was deleted, moved, or the path in
              the gamelist is incorrect.
            </p>
            <p className="text-sm font-medium">
              Do you want to clear this broken reference from the index?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() =>
                setBrokenAssetDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Ignore
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (onClearBrokenAsset) {
                  onClearBrokenAsset(brokenAssetDialog.mediaKey);
                }
                setBrokenAssetDialog((prev) => ({ ...prev, open: false }));
                toast.success(
                  `Cleared broken ${brokenAssetDialog.mediaLabel} reference`
                );
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Reference
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ScreenScraper Dialog ─────────────────────────────────── */}
      <ScreenScraperArtDialog
        open={scraperDialog.open}
        onOpenChange={(open) => setScraperDialog((prev) => ({ ...prev, open }))}
        gameName={game.name}
        console={game.console}
        mediaType={scraperDialog.mediaType}
        mainDirHandle={mainDirHandle}
        onArtworkSaved={(updatedGame) => {
          onGameUpdate(updatedGame);
          setScraperDialog((prev) => ({ ...prev, open: false }));
        }}
      />

      {/* ── Image Viewer Dialog ──────────────────────────────────── */}
      <Dialog
        open={imageViewer.open}
        onOpenChange={(open) => setImageViewer((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="!m-0 !h-[90dvh] !w-[90dvw] !max-w-none border-none bg-black/95 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{imageViewer.alt}</DialogTitle>
          </DialogHeader>
          <div className="relative flex h-full w-full items-center justify-center p-4">
            {imageViewer.url && (
              <Image
                src={imageViewer.url}
                alt={imageViewer.alt}
                fill
                className="object-contain"
                unoptimized
                onError={() => {
                  if (viewerErrorHandledRef.current) return;
                  viewerErrorHandledRef.current = true;

                  setBrokenAssetDialog({
                    open: true,
                    mediaKey: imageViewer.mediaKey,
                    mediaLabel: imageViewer.mediaLabel,
                  });

                  setImageViewer((prev) => ({ ...prev, open: false }));
                }}
              />
            )}
          </div>
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() =>
                setImageViewer((prev) => ({ ...prev, open: false }))
              }
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
