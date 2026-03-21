"use client";

/**
 * GameThumbnail
 *
 * Lazily loads a game's cover art from the SD card's FileSystem dirHandle.
 * Uses IntersectionObserver so images only load when they scroll into view.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEDIA_TYPES } from "@/lib/constants";

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
  const ref = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  // Observe when this element enters the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load the image once visible
  useEffect(() => {
    if (!visible || !dirHandle || !imagePath?.trim()) return;
    let revoked = false;
    let url: string | null = null;

    resolveImageUrl(dirHandle, imagePath).then((resolved) => {
      if (revoked) {
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
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [visible, dirHandle, imagePath]);

  const hasPath = Boolean(imagePath?.trim());

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted/40",
        className
      )}
    >
      {/* No image path at all */}
      {!hasPath && (
        <ImageOffIcon className={cn("text-muted-foreground/40", iconSize)} />
      )}

      {/* Has path but loading or failed */}
      {hasPath && !blobUrl && !failed && (
        <div className={cn("animate-pulse rounded bg-muted/60", "absolute inset-0")} />
      )}

      {hasPath && failed && (
        <ImageOffIcon className={cn("text-muted-foreground/40", iconSize)} />
      )}

      {/* Loaded image */}
      {blobUrl && (
        <Image
          src={blobUrl}
          alt={alt}
          fill
          className={cn(
            "object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          unoptimized
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
