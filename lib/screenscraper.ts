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
  ScreenScraperMedia,
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

type PreferredRegion = "us" | "eu" | "jp" | "fr" | "wor";

interface SearchQueryHints {
  searchTerm: string;
  preferredRegion?: PreferredRegion;
}

const REGION_TOKEN_MAP: Array<{
  region: PreferredRegion;
  patterns: RegExp[];
}> = [
  { region: "us", patterns: [/\busa\b/i, /\bus\b/i, /\bnorth america\b/i] },
  { region: "eu", patterns: [/\beur\b/i, /\beu\b/i, /\beurope\b/i] },
  { region: "jp", patterns: [/\bjpn\b/i, /\bjp\b/i, /\bjapan\b/i] },
  { region: "fr", patterns: [/\bfra\b/i, /\bfr\b/i, /\bfrance\b/i] },
];

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function parseSearchQuery(query: string): SearchQueryHints {
  let searchTerm = query.trim();
  let preferredRegion: PreferredRegion | undefined;

  for (const entry of REGION_TOKEN_MAP) {
    if (entry.patterns.some((pattern) => pattern.test(searchTerm))) {
      preferredRegion = entry.region;
      searchTerm = searchTerm
        .replace(
          /\s*[\(\[]\s*(?:USA|US|EUR|EU|Europe|JPN|JP|Japan|FRA|FR|France)\s*[\)\]]\s*$/i,
          ""
        )
        .replace(
          /\s+(?:USA|US|EUR|EU|Europe|JPN|JP|Japan|FRA|FR|France)\s*$/i,
          ""
        )
        .trim();
      break;
    }
  }

  return { searchTerm, preferredRegion };
}

function getDisplayNameForGame(
  game: ScreenScraperGameInfo,
  preferredRegion?: PreferredRegion
): string {
  const regionTitle =
    (preferredRegion &&
      game.noms?.find((entry) => entry.region.toLowerCase() === preferredRegion)
        ?.text) ||
    game.noms?.find((entry) => entry.region === "ss")?.text;

  return regionTitle || game.nom || game.name || "Unknown";
}

function getGameTitleCandidates(game: ScreenScraperGameInfo): string[] {
  const titles = new Set<string>();

  if (game.nom) titles.add(game.nom);
  if (game.name) titles.add(game.name);
  for (const entry of game.noms || []) {
    if (entry?.text) titles.add(entry.text);
  }

  return [...titles];
}

function scoreGameCandidate(
  game: ScreenScraperGameInfo,
  searchTerm: string,
  preferredRegion?: PreferredRegion
): number {
  const query = normalizeForMatch(searchTerm);
  if (!query) return 0;

  const queryTokens = query.split(" ").filter(Boolean);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const title of getGameTitleCandidates(game)) {
    const candidate = normalizeForMatch(title);
    if (!candidate) continue;

    let score = 0;

    if (candidate === query) {
      score += 10_000;
    } else if (candidate.startsWith(`${query} `)) {
      score += 8_000;
    } else if (candidate.startsWith(query)) {
      score += 7_000;
    } else if (candidate.includes(` ${query} `) || candidate.endsWith(` ${query}`)) {
      score += 6_000;
    }

    const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
    const overlap =
      queryTokens.length > 0
        ? queryTokens.filter((token) => candidateTokens.has(token)).length /
          queryTokens.length
        : 0;
    score += overlap * 2_000;

    const lengthPenalty = Math.max(0, candidate.length - query.length);
    score -= lengthPenalty * 4;

    if (!/\d/.test(query) && /\d/.test(candidate) && candidate.startsWith(query)) {
      score -= 800;
    }

    if (preferredRegion && game.noms?.some((entry) => entry.region === preferredRegion)) {
      score += 250;
    }

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore === Number.NEGATIVE_INFINITY ? 0 : bestScore;
}

function getRegionPriority(
  region?: string,
  preferredRegion?: PreferredRegion
): number {
  if (!region) return 4;

  const normalized = region.toLowerCase();

  if (preferredRegion && normalized === preferredRegion) return 0;
  if (normalized === "wor") return preferredRegion ? 1 : 0;
  if (!preferredRegion && (normalized === "us" || normalized === "eu")) return 1;
  if (!preferredRegion && (normalized === "jp" || normalized === "fr")) return 2;
  if (normalized === preferredRegion) return 1;

  return 3;
}

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
  consoleFolderName: string,
  preferredRegion?: PreferredRegion
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

  // Pick the most relevant match from the result set.
  const bestMatch = [...games].sort(
    (a, b) =>
      scoreGameCandidate(b, gameName, preferredRegion) -
      scoreGameCandidate(a, gameName, preferredRegion)
  )[0];

  const matchedName = getDisplayNameForGame(bestMatch, preferredRegion);

  console.log(
    `[ScreenScraper] Found: ${matchedName} (${bestMatch.medias?.length || 0} media items)`
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
  preferredMediaType: string = "covers",
  preferredRegion?: PreferredRegion
): ScrapedArtwork[] {
  if (!gameInfo.medias || !Array.isArray(gameInfo.medias)) {
    return [];
  }

  // Filter to the preferred media type and alternates.
  // For covers, prefer combo art first, then plain box art.
  const typeKeys =
    preferredMediaType === "covers"
      ? ["mixrbv1", "mixrbv2", "box-2D", "box-2D-alt"]
      : preferredMediaType === "marquees"
        ? ["wheel", "wheel-hd", "wheel-st", "wheel-carbon", "wheel-steel"]
        : preferredMediaType === "screenshots"
          ? ["ss"]
          : preferredMediaType === "3dboxes"
            ? ["box-3D"]
            : preferredMediaType === "fanart"
              ? ["fanart"]
              : preferredMediaType === "videos"
                ? ["video", "video-normalized"]
                : preferredMediaType === "titlescreens"
                  ? ["sstitle"]
                  : preferredMediaType === "backcovers"
                    ? ["box-2D-back"]
                    : preferredMediaType === "physicalmedia"
                      ? ["support-2D", "support-3D"]
                      : [preferredMediaType];

  const typePriority = new Map(typeKeys.map((type, index) => [type, index]));

  const filtered = (gameInfo.medias as ScreenScraperMedia[]).filter(
    (m) => typeKeys.includes(m.type) && m.parent === "jeu"
  );

  // Sort by type preference, region preference, vote score, then by resolution.
  const sorted = filtered.sort((a, b) => {
    const typeDiff =
      (typePriority.get(a.type) ?? Number.MAX_SAFE_INTEGER) -
      (typePriority.get(b.type) ?? Number.MAX_SAFE_INTEGER);
    if (typeDiff !== 0) return typeDiff;

    const regionDiff =
      getRegionPriority(a.region, preferredRegion) -
      getRegionPriority(b.region, preferredRegion);
    if (regionDiff !== 0) return regionDiff;

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
    format: m.format,
  }));
}

export function parseScreenScraperSearchHints(gameName: string): SearchQueryHints {
  return parseSearchQuery(gameName);
}

export function getScreenScraperDisplayName(
  game: ScreenScraperGameInfo,
  preferredRegion?: PreferredRegion
): string {
  return getDisplayNameForGame(game, preferredRegion);
}
