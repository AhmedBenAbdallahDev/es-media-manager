"use client";

import { useState, useCallback, useRef } from "react";
import { Game, MediaType as MediaTypeConfig } from "@/types";
import { MEDIA_TYPES } from "@/lib/constants";
import {
  saveMediaFile,
  getOrCreateConsoleDirectory,
} from "@/lib/mediaFileOperations";
import {
  updateGameWithMediaFile,
} from "@/lib/gameMediaHelpers";
import { toast } from "sonner";
import Image from "next/image";
import { ImageOff, Loader2, AlertCircle, Upload, X, ExternalLink, Check } from "lucide-react";
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
import { useDropzone } from "react-dropzone";
import { fromBlob } from "image-resize-compress";

interface GameMediaFormProps {
  game: Game;
  mainDirHandle: any;
  currentMediaUrls: Record<string, string>;
  isLoadingUrls: boolean;
  onGameUpdate: (updatedGame: Game) => void;
}

export function GameMediaForm({
  game,
  mainDirHandle,
  currentMediaUrls,
  isLoadingUrls,
  onGameUpdate,
}: GameMediaFormProps) {
  const [editableMediaFiles, setEditableMediaFiles] = useState<
    Record<string, File | null>
  >({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

        const updatedGame = updateGameWithMediaFile({ ...game }, mediaKey, fileHandle, mediaType.folder);

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
        let file = new File([blob], `image.${mediaType.extension.replace(".", "")}`, { type: mediaType.accept });

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
      : game.mediaStatus?.[mediaType.key as keyof typeof game.mediaStatus] ?? false;

    const fileExistsOnDisk = !!currentUrl;
    const hasContent = !!currentUrl || !!newFile || (isReferencedInGamelist && !fileExistsOnDisk);
    const hasDisplayableContent = !!currentUrl || !!newFile;

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: async (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          await handleMediaFileChange(mediaType.key, acceptedFiles[0]);
        }
      },
      accept: isVideo ? { "video/mp4": [".mp4"] } : { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
      maxFiles: 1,
      noClick: true,
    });

    return (
      <div
        key={mediaType.key}
        {...getRootProps()}
        className={`
          group relative overflow-hidden rounded-xl border-2 transition-all duration-300 flex flex-col h-full
          ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
          ${hasDisplayableContent ? "bg-card" : "bg-muted/30"}
        `}
      >
        <input {...getInputProps()} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-pixel text-xs tracking-wider">{mediaType.label.toUpperCase()}</h3>
            {hasDisplayableContent && (
              <Check className="h-3.5 w-3.5 text-green-600" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isReferencedInGamelist && !fileExistsOnDisk && !newFile && (
              <Badge variant="outline" className="border-orange-500/50 text-orange-600 text-xs">
                Missing
              </Badge>
            )}
            {hasDisplayableContent && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
              <TooltipContent>{isExpanded ? "Collapse" : "Expand"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Preview Area - Larger */}
        <div
          className={`
            relative overflow-hidden transition-all duration-300
            ${isExpanded ? "h-64" : "h-52"}
          `}
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
            <div className="relative h-full w-full bg-muted">
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
          ) : isReferencedInGamelist && !fileExistsOnDisk && !newFile ? (
            <div className="bg-destructive/5 border-destructive/30 flex h-full w-full flex-col items-center justify-center border border-dashed">
              <AlertCircle className="text-destructive mb-2 h-8 w-8" />
              <p className="text-destructive text-sm font-medium">File missing</p>
              <p className="text-muted-foreground text-xs mt-1">Referenced in gamelist</p>
            </div>
          ) : (
            <div className="bg-muted/50 border-border flex h-full w-full flex-col items-center justify-center border border-dashed">
              <ImageOff className="text-muted-foreground/40 mb-2 h-10 w-10" />
              <p className="text-muted-foreground text-sm">No {mediaType.label}</p>
            </div>
          )}
        </div>

        {/* Upload Actions - Always visible with proper spacing */}
        <div className="border-t border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex gap-3 flex-wrap">
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
              className="flex-1 gap-2 h-10 min-w-[90px]"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRefs.current[mediaType.key]?.click();
              }}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4" />
              {hasContent ? "Replace" : "Upload"}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="gap-2 h-10 min-w-[90px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCard(mediaType.key);
                  }}
                  disabled={isUploading}
                >
                  <ExternalLink className="h-4 w-4" />
                  URL
                </Button>
              </TooltipTrigger>
              <TooltipContent>Paste image URL</TooltipContent>
            </Tooltip>
          </div>

          {/* URL Input - Expandable */}
          {isExpanded && (
            <div className="mt-4 animate-in slide-in-from-top-2">
              <div className="relative">
                <Input
                  type="url"
                  placeholder="Paste image URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInputs((prev) => ({ ...prev, [mediaType.key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlInput.trim()) {
                      handleUrlUpload(mediaType.key, urlInput);
                    }
                  }}
                  disabled={isUploading}
                  className="pr-24 h-10"
                />
                <Button
                  size="sm"
                  variant="default"
                  className="absolute right-1.5 top-1.5 h-7 px-3"
                  onClick={() => urlInput.trim() && handleUrlUpload(mediaType.key, urlInput)}
                  disabled={isUploading || !urlInput.trim()}
                >
                  Go
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Supports JPG, PNG, WebP (auto-converts to {mediaType.extension.replace(".", "").toUpperCase()})
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CORE_MEDIA_KEYS = ["covers", "marquees", "videos", "screenshots"];
  const coreMedia = MEDIA_TYPES.filter((m) => CORE_MEDIA_KEYS.includes(m.key));
  const optionalMedia = MEDIA_TYPES.filter((m) =>
    !CORE_MEDIA_KEYS.includes(m.key)
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
          <div className="mb-4 flex items-center justify-between">
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
          <div className="mb-4 flex items-center justify-between">
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
    </TooltipProvider>
  );
}