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
import { pickSdCardRoot, scanSdCard, generateGamelistFromRoms, scanConsoleFolder } from "@/lib/sdScanner";
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
  /** Adds a single console folder to the library */
  addConsole: () => Promise<void>;
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
  /** Creates a gamelist.xml from scratch for a console that doesn't have one */
  createGamelist: (consoleFolderName: string) => Promise<void>;
  /** Automatically creates gamelist.xml for all consoles that are missing one */
  createAllMissingGamelists: () => Promise<void>;
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

  /** Opens a directory picker for a single console and adds it to the library */
  const addConsole = useCallback(async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        throw new Error("Your browser does not support the File System Access API.");
      }

      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });

      // Show scanning state if it's the first console being added
      if (state.status === "idle") {
        setState({
          status: "scanning",
          progress: { current: 0, total: 1, currentFolder: handle.name },
        });
      }

      const newConsole = await scanConsoleFolder(handle);

      setState((prev) => {
        const existingConsoles = prev.status === "ready" ? prev.consoles : [];
        const rootName = prev.status === "ready" ? prev.rootName : "Manual Selection";

        // Avoid duplicates
        const filteredConsoles = existingConsoles.filter(
          (c) => c.folderName !== newConsole.folderName
        );

        return {
          status: "ready",
          consoles: [...filteredConsoles, newConsole].sort((a, b) => 
            a.label.localeCompare(b.label)
          ),
          rootName,
        };
      });

      toast.success(`Added console: ${newConsole.label}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("cancelled")) {
        toast.error(`Failed to add console: ${msg}`);
      }
    }
  }, [state.status]);

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

  /**
   * Scans the console folder for ROMs, creates a GamelistGame array,
   * writes it to gamelist.xml, and updates the local state.
   */
  const createGamelist = useCallback(
    async (consoleFolderName: string) => {
      if (state.status !== "ready") return;

      const consoleIndex = state.consoles.findIndex(
        (c) => c.folderName === consoleFolderName
      );
      if (consoleIndex === -1) {
        toast.error(`Console "${consoleFolderName}" not found.`);
        return;
      }

      const consoleEntry = state.consoles[consoleIndex];
      if (consoleEntry.hasGamelist) {
        toast.info("This console already has a gamelist.xml.");
        return;
      }

      try {
        const loadingToast = toast.loading(`Generating games list for ${consoleFolderName}...`);
        
        // 1. Scan the folder for ROMs
        const generatedGames = await generateGamelistFromRoms(consoleEntry.dirHandle);
        
        if (generatedGames.length === 0) {
          toast.dismiss(loadingToast);
          toast.error("No ROM files detected in this folder.");
          return;
        }

        // 2. Write to disk
        await writeGamelist(consoleEntry.dirHandle, generatedGames);
        
        // 3. Update local state
        const updatedConsoles = [...state.consoles];
        updatedConsoles[consoleIndex] = {
          ...consoleEntry,
          games: generatedGames,
          hasGamelist: true,
          gamesWithImages: 0,
          gamesWithoutImages: generatedGames.length,
        };

        setState({
          status: "ready",
          consoles: updatedConsoles,
          rootName: state.rootName,
        });

        toast.dismiss(loadingToast);
        toast.success(`Created gamelist.xml with ${generatedGames.length} games!`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Auto-creation failed: ${msg}`);
      }
    },
    [state]
  );

  /**
   * Automatically creates gamelist.xml for all consoles that are missing one.
   */
  const createAllMissingGamelists = useCallback(async () => {
    if (state.status !== "ready") return;

    const missingConsoles = state.consoles.filter((c) => !c.hasGamelist);

    if (missingConsoles.length === 0) {
      toast.info("No consoles are missing a gamelist.xml.");
      return;
    }

    const loadingToast = toast.loading(
      `Generating gamelists for ${missingConsoles.length} consoles...`
    );

    let successCount = 0;
    const updatedConsoles = [...state.consoles];

    for (const consoleEntry of missingConsoles) {
      try {
        const generatedGames = await generateGamelistFromRoms(
          consoleEntry.dirHandle
        );

        if (generatedGames.length > 0) {
          await writeGamelist(consoleEntry.dirHandle, generatedGames);

          const idx = updatedConsoles.findIndex(
            (c) => c.folderName === consoleEntry.folderName
          );
          if (idx !== -1) {
            updatedConsoles[idx] = {
              ...consoleEntry,
              games: generatedGames,
              hasGamelist: true,
              gamesWithImages: 0,
              gamesWithoutImages: generatedGames.length,
            };
          }
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to auto-create for ${consoleEntry.folderName}`, err);
      }
    }

    setState({
      status: "ready",
      consoles: updatedConsoles,
      rootName: state.rootName,
    });

    toast.dismiss(loadingToast);
    if (successCount > 0) {
      toast.success(`Broadly generated ${successCount} gamelist.xml files!`);
    } else {
      toast.error("Failed to generate any gamelists. Ensure permissions are set.");
    }
  }, [state]);

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
      value={{
        state,
        rootHandle,
        openAndScan,
        addConsole,
        rescan,
        saveGame,
        getConsole,
        createGamelist,
        createAllMissingGamelists,
      }}
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
