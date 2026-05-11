"use client";

/**
 * Library Context
 *
 * Global React context that holds the scanned SD card state.
 * Wrap the app with <LibraryProvider> to make this available everywhere.
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import type { ConsoleLibrary, ScanProgress } from "@/types/scraper";
import type { GamelistGame } from "@/types/scraper";
import { pickSdCardRoot, scanSdCard } from "@/lib/sdScanner";
import { writeGamelist } from "@/lib/gamelistParser";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LibraryState =
  | { status: "idle" }
  | { status: "scanning"; progress: ScanProgress }
  | { status: "ready"; consoles: ConsoleLibrary[]; rootName: string }
  | { status: "error"; message: string };

interface LibraryContextValue {
  /** Current state of the library */
  state: LibraryState;
  /** The root directory handle (null if not yet selected) */
  rootHandle: FileSystemDirectoryHandle | null;
  /** Opens a directory picker and scans the SD card */
  openAndScan: () => Promise<void>;
  /** Re-scans the already-selected root handle */
  rescan: () => Promise<void>;
  /** Updates a single game's metadata in memory and on disk */
  saveGame: (
    consoleFolderName: string,
    updatedGame: GamelistGame,
    originalPath: string
  ) => Promise<void>;
  /** Returns a single ConsoleLibrary by folder name, or undefined */
  getConsole: (folderName: string) => ConsoleLibrary | undefined;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const LibraryContext = createContext<LibraryContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Wrap the root layout with this provider to give the whole app access
 * to the SD card library state.
 */
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>({ status: "idle" });
  const [rootHandle, setRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

  /** Internal scan runner — used by both openAndScan and rescan */
  const runScan = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setState({
      status: "scanning",
      progress: { current: 0, total: 0, currentFolder: "" },
    });

    try {
      const consoles = await scanSdCard(handle, (progress) => {
        setState({ status: "scanning", progress });
      });

      setState({
        status: "ready",
        consoles,
        rootName: handle.name,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message: msg });
      toast.error(`Scan failed: ${msg}`);
    }
  }, []);

  /** Opens a directory picker, stores the handle, and runs the scan */
  const openAndScan = useCallback(async () => {
    try {
      const handle = await pickSdCardRoot();
      setRootHandle(handle);
      await runScan(handle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // AbortError = user cancelled, no need to show error
      if (!msg.includes("cancelled")) {
        setState({ status: "error", message: msg });
        toast.error(msg);
      }
    }
  }, [runScan]);

  /** Re-scans the current root handle */
  const rescan = useCallback(async () => {
    if (!rootHandle) {
      toast.error("No folder selected. Please open a folder first.");
      return;
    }
    await runScan(rootHandle);
  }, [rootHandle, runScan]);

  /**
   * Updates a single game in memory and writes the updated gamelist.xml to disk.
   * Matches by original path (unique per console).
   */
  const saveGame = useCallback(
    async (
      consoleFolderName: string,
      updatedGame: GamelistGame,
      originalPath: string
    ) => {
      if (state.status !== "ready") return;

      const consoleIndex = state.consoles.findIndex(
        (c) => c.folderName === consoleFolderName
      );
      if (consoleIndex === -1) {
        toast.error(`Console "${consoleFolderName}" not found.`);
        return;
      }

      const consoleEntry = state.consoles[consoleIndex];
      const gameIndex = consoleEntry.games.findIndex(
        (g) => g.path === originalPath
      );
      if (gameIndex === -1) {
        toast.error(`Game not found in ${consoleFolderName}.`);
        return;
      }

      // Build updated games array
      const updatedGames = [...consoleEntry.games];
      updatedGames[gameIndex] = updatedGame;

      // Recalculate stats
      const gamesWithImages = updatedGames.filter(
        (g) =>
          (g.image && g.image.trim() !== "") ||
          (g.thumbnail && g.thumbnail.trim() !== "")
      ).length;

      // Build updated consoles array
      const updatedConsoles = [...state.consoles];
      updatedConsoles[consoleIndex] = {
        ...consoleEntry,
        games: updatedGames,
        gamesWithImages,
        gamesWithoutImages: updatedGames.length - gamesWithImages,
      };

      // Optimistically update UI
      setState({
        status: "ready",
        consoles: updatedConsoles,
        rootName: state.rootName,
      });

      // Write to disk
      try {
        await writeGamelist(consoleEntry.dirHandle, updatedGames);
        toast.success(`Saved "${updatedGame.name}"`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to save: ${msg}`);
        // Revert on error
        const revertedConsoles = [...updatedConsoles];
        revertedConsoles[consoleIndex] = consoleEntry;
        setState({
          status: "ready",
          consoles: revertedConsoles,
          rootName: state.rootName,
        });
      }
    },
    [state]
  );

  /** Convenience getter for a single console */
  const getConsole = useCallback(
    (folderName: string): ConsoleLibrary | undefined => {
      if (state.status !== "ready") return undefined;
      return state.consoles.find((c) => c.folderName === folderName);
    },
    [state]
  );

  return (
    <LibraryContext.Provider
      value={{ state, rootHandle, openAndScan, rescan, saveGame, getConsole }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access the library context from any client component.
 * Must be used inside <LibraryProvider>.
 */
export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error("useLibrary must be used within a <LibraryProvider>");
  }
  return ctx;
}
