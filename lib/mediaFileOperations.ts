/**
 * Media File Operations
 *
 * Core file system operations for managing game media files.
 * These functions handle the low-level file operations and are reusable across components.
 */

import { MEDIA_TYPES } from "@/lib/constants";
import { sanitizeBasenameForSave } from "@/lib/gameMediaHelpers";

/**
 * Helper function to clean up old media files with different extensions
 * before saving a new file to avoid orphaned files.
 * Uses case-insensitive matching to handle files with different capitalizations.
 *
 * @param mediaFolderHandle The directory handle for the media type folder
 * @param gameName The name of the game (without extension)
 * @param targetFileName The exact filename that will be saved (to skip during cleanup)
 * @param isVideo Whether this is a video file (affects which extensions to check)
 */
export async function cleanupOldMediaFiles(
  mediaFolderHandle: any,
  gameName: string,
  targetFileName: string,
  isVideo: boolean
): Promise<void> {
  try {
    // Iterate through all files in the media folder
    for await (const [fileName] of mediaFolderHandle.entries()) {
      // Extract the file name without extension
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

      // Check if this file belongs to the same game (case-insensitive)
      if (fileNameWithoutExt.toLowerCase() === gameName.toLowerCase()) {
        // Skip if this is the exact file we're about to save
        if (fileName === targetFileName) {
          continue;
        }

        // Check if it's a media file we should clean up
        const fileExtension = fileName.substring(fileName.lastIndexOf("."));
        const extensionsToCheck = isVideo
          ? [".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv"]
          : [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".svg"];

        if (extensionsToCheck.includes(fileExtension.toLowerCase())) {
          try {
            await mediaFolderHandle.removeEntry(fileName);
            console.log(`Cleaned up old media file: ${fileName}`);
          } catch (removeError: any) {
            console.warn(
              `Failed to remove old file ${fileName}:`,
              removeError.message
            );
          }
        }
      }
    }
  } catch (error: any) {
    console.warn(
      `Error during cleanup of old media files for game "${gameName}":`,
      error.message
    );
  }
}

/**
 * Saves a media file to the appropriate directory with proper cleanup
 *
 * @param consoleDirHandle The directory handle for the console
 * @param mediaType The media type configuration object
 * @param gameName The name of the game
 * @param file The file to save
 * @returns Promise that resolves to the created file handle
 */
export async function saveMediaFile(
  consoleDirHandle: any,
  mediaType: any,
  gameName: string,
  file: File
): Promise<any> {
  // Get or create the media type directory
  const mediaFolderHandle = await consoleDirHandle.getDirectoryHandle(
    mediaType.folder,
    { create: true }
  );

  const safeBase = sanitizeBasenameForSave(gameName);
  const fileName = safeBase + (mediaType.suffix || "") + mediaType.extension;

  // Clean up old files with different extensions
  await cleanupOldMediaFiles(
    mediaFolderHandle,
    gameName,
    fileName,
    mediaType.key === "videos"
  );

  // Create and write the new file
  const fileHandle = await mediaFolderHandle.getFileHandle(fileName, {
    create: true,
  });

  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();

  return fileHandle;
}

/**
 * Creates a console directory if it doesn't exist
 *
 * @param mainDirHandle The root directory handle
 * @param consoleName The name of the console
 * @returns Promise that resolves to the console directory handle
 */
export async function getOrCreateConsoleDirectory(
  mainDirHandle: any,
  consoleName: string
): Promise<any> {
  return await mainDirHandle.getDirectoryHandle(consoleName, { create: true });
}

/**
 * Loads a file from a FileSystemFileHandle and returns an object URL
 * This is a utility function that can be used across components
 *
 * @param fileHandle The file handle to load
 * @returns Promise that resolves to an object URL string
 */
export async function loadFileAsUrl(fileHandle: any): Promise<string> {
  if (!fileHandle || typeof fileHandle.getFile !== "function") {
    if (fileHandle instanceof File) {
      return URL.createObjectURL(fileHandle);
    }
    console.warn(
      "Invalid or missing file handle for loadFileAsUrl:",
      fileHandle
    );
    return "";
  }
  try {
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch (error) {
    console.error("Error loading file from handle:", error);
    return "";
  }
}

/**
 * Loads media URLs for a game by attempting to access files via the directory handle
 * This is useful when file handles are not stored in the game object
 *
 * @param mainDirHandle The root directory handle
 * @param game The game object
 * @returns Promise that resolves to a record of media URLs
 */
/**
 * Resolve a media file handle from a gamelist path or basename.
 *
 * Strategy:
 * 1. If `pathOrBasename` looks like a path (contains '/'), attempt to resolve it
 *    relative to the console directory by traversing directory handles.
 * 2. If that fails (or the input is just a basename), search common media
 *    folders (MEDIA_TYPES folders + `images`, `media`, and the console root)
 *    for a filename match (case-insensitive, basename-without-extension match).
 *
 * This helper centralizes the tolerant lookup logic used by the UI and scanner.
 */
export async function resolveMediaFileHandle(
  consoleDirHandle: FileSystemDirectoryHandle,
  pathOrBasename?: string | null
): Promise<FileSystemFileHandle | null> {
  if (!pathOrBasename || !pathOrBasename.trim()) return null;

  const clean = pathOrBasename
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");
  const parts = clean.split("/").filter(Boolean);

  // Try direct path traversal first when a path-like value is provided
  if (parts.length > 0) {
    try {
      let current: FileSystemDirectoryHandle = consoleDirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i]);
      }
      const fh = await current.getFileHandle(parts[parts.length - 1]);
      return fh;
    } catch {
      /* fall through to fallback search */
    }
  }

  // Fallback search: try known media folders, `images`, `media`, then root.
  const searchFolders = [
    ...MEDIA_TYPES.map((m) => m.folder),
    "images",
    "media",
    "",
  ];

  const targetBase = (
    parts.length > 0 ? parts[parts.length - 1] : clean
  ).toLowerCase();
  const targetNoExt = targetBase.replace(/\.[^/.]+$/, "");

  for (const folder of searchFolders) {
    try {
      let folderHandle: FileSystemDirectoryHandle = consoleDirHandle;
      if (folder)
        folderHandle = await consoleDirHandle.getDirectoryHandle(folder);

      for await (const [name, handle] of (folderHandle as any).entries()) {
        if (handle.kind !== "file") continue;
        const nameLower = name.toLowerCase();
        const nameNoExt = nameLower.replace(/\.[^/.]+$/, "");
        if (nameLower === targetBase || nameNoExt === targetNoExt) {
          return await folderHandle.getFileHandle(name);
        }
      }
    } catch {
      // folder doesn't exist or permission denied — continue searching other folders
      continue;
    }
  }

  return null;
}

export async function loadGameMediaUrls(
  mainDirHandle: any,
  game: any
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};

  try {
    const consoleDirHandle = await mainDirHandle.getDirectoryHandle(
      game.console
    );

    for (const mediaType of MEDIA_TYPES) {
      try {
        const mediaDirHandle = await consoleDirHandle.getDirectoryHandle(
          mediaType.folder
        );
        const fileName = game.name + mediaType.extension;
        const fileHandle = await mediaDirHandle.getFileHandle(fileName);
        urls[mediaType.key] = await loadFileAsUrl(fileHandle);
      } catch {
        // File doesn't exist, set empty URL
        urls[mediaType.key] = "";
      }
    }
  } catch (error) {
    console.error("Error loading game media URLs:", error);
    // Return empty URLs for all media types
    MEDIA_TYPES.forEach((mediaType) => {
      urls[mediaType.key] = "";
    });
  }

  return urls;
}
