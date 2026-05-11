/**
 * ScreenScraper.fr API Client
 *
 * Server-side client for the ScreenScraper REST API v1.
 * Handles authentication, game searching, and media fetching.
 *
 * IMPORTANT: This module must ONLY be imported from server-side code
 * (API routes, server components). Never import this in client components
 * as it contains API credentials.
 *
 * API docs: https://www.screenscraper.fr/api/documentation
 */

import type {
  ScreenScraperResponse,
  ScreenScraperGameInfo,
  ScrapedArtwork,
} from "@/types/screenscraper";

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = "https://www.screenscraper.fr/api";

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
 * Reference: https://www.screenscraper.fr/api/systemes_liste.php
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
 */
function buildAuthParams(): URLSearchParams {
  const params = new URLSearchParams();
  params.set("devid", getDevId());
  params.set("devpassword", getDevPassword());
  params.set("output", "json");
  // No user auth needed for search (dev credentials suffice)
  return params;
}

/**
 * Searches for a game on ScreenScraper by name and system ID.
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
  params.set("romname", gameName);

  const url = `${BASE_URL}/ssInfos.php?${params.toString()}`;

  console.log(`[ScreenScraper] Searching: "${gameName}" (system ${systemId})`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ES-DE Media Manager",
    },
    // ScreenScraper API has rate limits — default timeout
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

  const data: ScreenScraperResponse = await response.json();

  if (data.status !== 0) {
    console.error(
      `[ScreenScraper] API returned error status ${data.status}: ${data.message}`
    );
    throw new Error(
      `ScreenScraper error (${data.status}): ${data.message || "Unknown error"}`
    );
  }

  if (!data.data?.game) {
    console.log(`[ScreenScraper] No results found for "${gameName}"`);
    return null;
  }

  console.log(
    `[ScreenScraper] Found: ${data.data.game.name} (${data.data.game.medias?.length || 0} media items)`
  );

  return data.data.game;
}

/**
 * Extracts artwork options from a ScreenScraper game info response.
 * Filters and sorts by vote score, returning the best options for cover art.
 *
 * @param gameInfo The game info from ScreenScraper
 * @param preferredMediaType The type of media to extract (default: "box-2D" for covers)
 * @returns Array of scraped artwork options sorted by vote score
 */
export function extractArtwork(
  gameInfo: ScreenScraperGameInfo,
  preferredMediaType: string = "box-2D"
): ScrapedArtwork[] {
  if (!gameInfo.medias || gameInfo.medias.length === 0) {
    return [];
  }

  // Filter to the preferred media type and alternates
  const typeKeys =
    preferredMediaType === "covers"
      ? ["box-2D", "box-2D-alt", "mixrbv1", "mixrbv2"]
      : preferredMediaType === "marquees"
        ? ["wheel", "wheel-hd", "wheel-st"]
        : preferredMediaType === "screenshots"
          ? ["ss"]
          : preferredMediaType === "3dboxes"
            ? ["box-3D"]
            : preferredMediaType === "fanart"
              ? ["fanart"]
              : preferredMediaType === "videos"
                ? ["video"]
                : preferredMediaType === "titlescreens"
                  ? ["ss-title"]
                  : preferredMediaType === "backcovers"
                    ? ["box-2D-back"]
                    : preferredMediaType === "physicalmedia"
                      ? ["support-2D", "support-3D"]
                      : [preferredMediaType];

  const filtered = gameInfo.medias.filter((m) => typeKeys.includes(m.type));

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
    id: m.id,
    imageUrl: m.url,
    mediaType: m.type,
    resolution: m.resolution,
    vote: m.vote,
    region: m.region,
  }));
}
