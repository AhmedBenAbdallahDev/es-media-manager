/**
 * Types for the Retro Scraper — Phase 1
 * Covers SD card scanning, gamelist.xml parsing, and metadata editing.
 */

/**
 * A single game entry as parsed from a gamelist.xml file.
 * All fields are optional except path, to handle partial gamelists gracefully.
 */
export interface GamelistGame {
  /** Internal ES id attribute (preserved as-is) */
  id?: string;
  /** Source attribute (preserved as-is) */
  source?: string;
  /** Relative path to the ROM file, e.g. ./000001.chd */
  path: string;
  /** Display name of the game */
  name: string;
  /** Long description / synopsis */
  desc?: string;
  /** Rating 0.0–1.0 as string, e.g. "0.8" */
  rating?: string;
  /** Release date in ES format YYYYMMDDTHHMMSS */
  releasedate?: string;
  /** Developer studio */
  developer?: string;
  /** Publisher */
  publisher?: string;
  /** Genre string */
  genre?: string;
  /** Number of players, e.g. "1" or "1-4" */
  players?: string;
  /** Relative or absolute path to the cover/box image */
  image?: string;
  /** Relative path to the thumbnail image */
  thumbnail?: string;
  /** Relative path to the marquee/wheel image */
  marquee?: string;
  /** Relative path to the video preview */
  video?: string;
  /** Relative path to fan art / screenshot image */
  fanart?: string;
  /** Comma-separated genre IDs from screenscraper */
  genreids?: string;
  /** Region, e.g. "usa", "eu", "japan" */
  region?: string;
  /** Favorite flag */
  favorite?: string;
  /** Play count as string */
  playcount?: string;
  /** Last played timestamp */
  lastplayed?: string;
  /** Kid-game flag */
  kidgame?: string;
  /** Language */
  lang?: string;
  /** Arcade system name */
  arcadesystemname?: string;
}

/**
 * A scanned console folder with all its parsed games and statistics.
 */
export interface ConsoleLibrary {
  /** Folder name on disk, e.g. "psx", "gba" */
  folderName: string;
  /** Human-readable label, e.g. "Sony PlayStation" */
  label: string;
  /** Path to logo image in /public/logos/ if available */
  logoSrc?: string;
  /** All games parsed from gamelist.xml */
  games: GamelistGame[];
  /** Total ROM file count in the folder (not just in gamelist) */
  totalRoms: number;
  /** Number of games that have an image field set */
  gamesWithImages: number;
  /** Number of games without an image field */
  gamesWithoutImages: number;
  /** Whether a gamelist.xml was found in this folder */
  hasGamelist: boolean;
  /** The FileSystemDirectoryHandle for this console folder */
  dirHandle: FileSystemDirectoryHandle;
}

/**
 * Overall scan result after scanning the SD card root.
 */
export interface ScanResult {
  consoles: ConsoleLibrary[];
  totalGames: number;
  totalGamesWithImages: number;
  scannedAt: Date;
}

/**
 * Progress state during a scan.
 */
export interface ScanProgress {
  /** Folders processed so far */
  current: number;
  /** Total folders found */
  total: number;
  /** Name of the folder currently being scanned */
  currentFolder: string;
}

/**
 * Filter/sort options for the game table.
 */
export type GameFilter = "all" | "has-image" | "missing-image";
export type GameSort = "name-asc" | "name-desc" | "path-asc";
