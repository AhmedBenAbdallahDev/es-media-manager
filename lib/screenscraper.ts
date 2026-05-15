/**
 * ScreenScraper.fr API Client
 *
 * Server-side client for the ScreenScraper REST API v2 (beta).
 * Handles authentication, game searching, and media fetching.
 *
 * IMPORTANT: This module must ONLY be imported from server-side code
 * (API routes, server components). Never import this in client components
 * as it contains API credentials.
 *
 * API docs: https://www.screenscraper.fr/ (WebAPI section)
 *
 * Key endpoints:
 *   - jeuRecherche.php: Search games by name (returns up to 30 results)
 *   - jeuInfos.php: Get detailed game info + media URLs
 *   - mediaJeu.php: Download game media images
 *   - mediaVideoJeu.php: Download game media videos
 */

import type {
  ScreenScraperResponse,
  ScreenScraperGameInfo,
  ScrapedArtwork,
} from "@/types/screenscraper";

// ─── Configuration ──────────────────────────────────────────────────────────

/** API v2 base URL — NOT www.screenscraper.fr/api */
const BASE_URL = "https://api.screenscraper.fr/api2";

/** Software name sent with every request (required by API) */
const SOFT_NAME = "ES-Cover-Manager";

function getDevId(): string {
  const id = process.env.SCREENSCRAPER_DEVID;
  if (!id) {
    throw new Error("SCREENSCRAPER_DEVID is not set in environment variables.");
  }
  return id;
}

function getDevPassword(): string {
  const password = process.env.SCREENSCRAPER_DEVPASSWORD;
  if (!password) {
    throw new Error(
      "SCREENSCRAPER_DEVPASSWORD is not set in environment variables."
    );
  }
  return password;
}

// ─── Console Mapping: Our folder names → ScreenScraper system IDs ───────────

/**
 * Maps ES-DE console folder names to ScreenScraper system database IDs.
 * This is critical — ScreenScraper uses numeric system IDs, not folder names.
 *
 * Reference: https://api.screenscraper.fr/api2/systemesListe.php
 */
export const CONSOLE_TO_SS_SYSTEM_ID: Record<string, number> = {
  // Nintendo
  nes: 3,
  snes: 4,
  n64: 5,
  gc: 6,
  wii: 7,
  wiiu: 8,
  switch: 9,
  gb: 10,
  gbc: 11,
  gba: 12,
  nds: 13,
  n3ds: 14,
  famicom: 15,
  sfc: 16,
  fds: 17,
  gameandwatch: 21,
  pokemini: 154,
  satellaview: 22,
  sufami: 23,

  // Sega
  mastersystem: 25,
  genesis: 26,
  segacd: 27,
  sega32x: 28,
  saturn: 29,
  dreamcast: 30,
  gamegear: 31,
  sg1000: 32,

  // Sony
  psx: 33,
  ps2: 34,
  ps3: 35,
  psp: 36,
  psvita: 37,

  // Microsoft
  xbox: 40,
  xbox360: 41,

  // NEC
  pcengine: 38,
  pcenginecd: 39,
  "tg-cd": 39,
  turbografx: 38,
  pcfx: 42,

  // SNK
  neogeo: 43,
  neogeocd: 44,
  ngp: 45,
  ngpc: 46,

  // Atari
  atari2600: 47,
  atari5200: 48,
  atari7800: 49,
  atarilynx: 50,
  atarijaguar: 51,
  atarijaguarcd: 52,
  atarist: 53,

  // Commodore
  amiga: 54,
  amigacd32: 55,
  cdtv: 56,
  c64: 57,

  // Arcade
  mame: 58,
  fbneo: 59,
  fba: 59,
  cps1: 60,
  cps2: 61,
  cps3: 62,
  naomi: 63,
  atomiswave: 64,

  // Other handhelds
  wonderswan: 65,
  wonderswancolor: 66,
  virtualboy: 67,
  vectrex: 68,
  coleco: 69,
  colecovision: 69,
  intellivision: 70,

  // Modern / other
  dos: 71,
  scummvm: 72,
  tic80: 73,
  pico8: 74,
  j2me: 75,
  msx: 76,
  arcadia: 77,
  arcadia2001: 77,
};

/**
 * Fallback system ID to use when the console is not in our mapping.
 * 0 tells ScreenScraper to search across all systems.
 */
const FALLBACK_SYSTEM_ID = 0;

// ─── Core API Functions ─────────────────────────────────────────────────────

/**
 * Builds the common query parameters for every ScreenScraper API request.
 * All requests require: devid, devpassword, softname
 */
function buildAuthParams(): URLSearchParams {
  const params = new URLSearchParams();
  params.set("devid", getDevId());
  params.set("devpassword", getDevPassword());
  params.set("softname", SOFT_NAME);
  params.set("output", "json");
  return params;
}

/**
 * Searches for a game on ScreenScraper by name and system ID.
 *
 * Uses jeuRecherche.php endpoint which returns up to 30 results
 * sorted by probability.
 *
 * @param gameName The display name of the game to search for
 * @param consoleFolderName The ES-DE console folder name (e.g., "gba", "psx")
 * @returns The best matching game info, or null if no results
 */
export async function searchGame(
  gameName: string,
  consoleFolderName: string
): Promise<ScreenScraperGameInfo | null> {
  const systemId =
    CONSOLE_TO_SS_SYSTEM_ID[consoleFolderName.toLowerCase()] ??
    FALLBACK_SYSTEM_ID;

  const params = buildAuthParams();
  params.set("systemeid", String(systemId));
  params.set("recherche", gameName); // "recherche" not "romname"

  const url = `${BASE_URL}/jeuRecherche.php?${params.toString()}`;

  console.log(`[ScreenScraper] Searching: "${gameName}" (system ${systemId})`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": `${SOFT_NAME}/1.0`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 404) {
    console.log(
      `[ScreenScraper] No results found for "${gameName}" (404 Not Found)`
    );
    return null;
  }

  if (!response.ok) {
    console.error(
      `[ScreenScraper] API error: ${response.status} ${response.statusText}`
    );
    throw new Error(
      `ScreenScraper API returned ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();

  // API v2 returns { header: {...}, response: { serveurs: {...}, jeux: [...] } }
  const games = data?.response?.jeux;
  if (!games || !Array.isArray(games) || games.length === 0) {
    console.log(`[ScreenScraper] No results found for "${gameName}"`);
    return null;
  }

  // Take the first (best match) game
  const bestMatch = games[0];

  // Extract game name from noms array
  const gameName =
    bestMatch.noms?.find((n: { region: string }) => n.region === "ss")?.text ||
    bestMatch.noms?.[0]?.text ||
    "Unknown";

  console.log(
    `[ScreenScraper] Found: ${gameName} (${bestMatch.medias?.length || 0} media items)`
  );

  return bestMatch as ScreenScraperGameInfo;
}

/**
 * Extracts artwork options from a ScreenScraper game info response.
 * Filters and sorts by vote score, returning the best options for cover art.
 *
 * The API returns media as an array of objects with type, url, region, etc.
 *
 * @param gameInfo The game info from ScreenScraper
 * @param preferredMediaType The type of media to extract (default: "covers")
 * @returns Array of scraped artwork options sorted by vote score
 */
export function extractArtwork(
  gameInfo: ScreenScraperGameInfo,
  preferredMediaType: string = "covers"
): ScrapedArtwork[] {
  if (!gameInfo.medias || !Array.isArray(gameInfo.medias)) {
    return [];
  }

  // Filter to the preferred media type and alternates
  const typeKeys =
    preferredMediaType === "covers"
      ? ["box-2D", "box-2D-alt", "mixrbv1", "mixrbv2"]
      : preferredMediaType === "marquees"
        ? ["wheel", "wheel-hd", "wheel-st", "wheel-carbon", "wheel-steel"]
        : preferredMediaType === "screenshots"
          ? ["ss"]
          : preferredMediaType === "3dboxes"
            ? ["box-3D"]
            : preferredMediaType === "fanart"
              ? ["fanart"]
              : preferredMediaType === "videos"
                ? ["video"]
                : preferredMediaType === "titlescreens"
                  ? ["sstitle"]
                  : preferredMediaType === "backcovers"
                    ? ["box-2D-back"]
                    : preferredMediaType === "physicalmedia"
                      ? ["support-2D", "support-3D"]
                      : [preferredMediaType];

  const filtered = (gameInfo.medias as ScreenScraperMedia[]).filter(
    (m) => typeKeys.includes(m.type) && m.parent === "jeu"
  );

  // Sort by vote score (highest first), then by resolution
  const sorted = filtered.sort((a, b) => {
    const voteDiff = (b.vote || 0) - (a.vote || 0);
    if (voteDiff !== 0) return voteDiff;
    // Prefer higher resolution
    const resA = a.resolution || "0x0";
    const resB = b.resolution || "0x0";
    const pxA = parseInt(resA.split("x")[0]) * parseInt(resA.split("x")[1]);
    const pxB = parseInt(resB.split("x")[0]) * parseInt(resB.split("x")[1]);
    return pxB - pxA;
  });

  return sorted.map((m) => ({
    id: m.id || `${m.type}-${m.region || "unknown"}`,
    imageUrl: m.url,
    mediaType: m.type,
    resolution: m.resolution,
    vote: m.vote,
    region: m.region,
  }));
}
