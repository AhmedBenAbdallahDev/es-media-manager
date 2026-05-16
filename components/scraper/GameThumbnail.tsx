"use client";

/**
 * GameThumbnail
 *
 * Loads a game's cover art from the SD card's FileSystem dirHandle.
 * Uses a direct blob URL so thumbnails show reliably without relying on
 * observer timing or next/image blob handling.
 */

import { useEffect, useState } from "react";
import { ImageOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameThumbnailProps {
  dirHandle: FileSystemDirectoryHandle | undefined;
  imagePath: string | undefined;
  alt: string;
  className?: string;
  /** Tailwind size class for the fallback icon (default h-6 w-6) */
  iconSize?: string;
}

/**
 * Resolves a relative path like "./images/000001.png" to a blob URL.
 */
import { resolveMediaFileHandle } from "@/lib/mediaFileOperations";

async function resolveImageUrl(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<string | null> {
  // First try the direct resolution + traversal
  try {
    const clean = relativePath.replace(/^\.\//, "").replace(/\\/g, "/");
    const parts = clean.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    let current: FileSystemDirectoryHandle = dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch {
    // Direct resolution failed — try tolerant lookup across known media folders
  }

  try {
    const fh = await resolveMediaFileHandle(dirHandle, relativePath);
    if (!fh) return null;
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  } catch (err) {
    return null;
  }
}

export function GameThumbnail({
  dirHandle,
  imagePath,
  alt,
  className,
  iconSize = "h-6 w-6",
}: GameThumbnailProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Load the image as soon as the inputs are available.
  useEffect(() => {
    const trimmedPath = imagePath?.trim();
    if (!dirHandle || !trimmedPath) {
      setBlobUrl(null);
      setLoaded(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    let url: string | null = null;

    setBlobUrl(null);
    setLoaded(false);
    setFailed(false);

    resolveImageUrl(dirHandle, trimmedPath).then((resolved) => {
      if (cancelled) {
        if (resolved) URL.revokeObjectURL(resolved);
        return;
      }
      url = resolved;
      if (resolved) {
        setBlobUrl(resolved);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [dirHandle, imagePath]);

  const hasPath = Boolean(imagePath?.trim());

  return (
    <div
      className={cn(
        "bg-muted/40 relative flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {/* No image path at all */}
      {!hasPath && (
        <ImageOffIcon className={cn("text-muted-foreground/40", iconSize)} />
      )}

      {/* Has path but loading or failed */}
      {hasPath && !blobUrl && !failed && (
        <div
          className={cn(
            "bg-muted/60 animate-pulse rounded",
            "absolute inset-0"
          )}
        />
      )}

      {hasPath && failed && (
        <ImageOffIcon className={cn("text-muted-foreground/40", iconSize)} />
      )}

      {/* Loaded image */}
      {blobUrl && (
        <img
          src={blobUrl}
          alt={alt}
          loading="eager"
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
