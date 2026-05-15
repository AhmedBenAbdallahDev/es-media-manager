/**
 * ScreenScraper.fr API client types
 *
 * These types cover the main data structures returned by the
 * ScreenScraper REST API v2 (beta).
 *
 * API docs: https://www.screenscraper.fr/ (WebAPI section)
 *
 * The API returns media as an array of objects with type, url, region, etc.
 * Example media object:
 *   { type: "box-2D", url: "https://...", region: "us", parent: "jeu", ... }
 */

/**
 * A single media asset (screenshot, boxart, etc.) from ScreenScraper.
 * This is our internal representation after parsing the API response.
 *
 * The API returns media as an array of objects with these fields:
 *   type: "box-2D", "ss", "wheel-hd", "fanart", "video", etc.
 *   url: direct URL to the media file
 *   region: "us", "eu", "fr", "wor", etc.
 *   parent: "jeu", "editeur", "developpeur", "genre", etc.
 *   crc, md5, sha1: checksums for the media file
 *   size: file size in bytes
 *   format: "png", "jpg", "mp4", etc.
 */
export interface ScreenScraperMedia {
  /** Unique ID for this media item */
  id?: string;
  /** Direct URL to the image */
  url: string;
  /** Thumbnail URL (when available) */
  thumb?: string;
  /** Media type identifier (e.g., "box-2D", "box-3D", "ss", "wheel") */
  type: string;
  /** Screen resolution, e.g., "1280x720" */
  resolution?: string;
  /** Vote score for this media */
  vote?: number;
  /** The user who uploaded it */
  uploader?: string;
  /** Whether this media is for the World region */
  isWorld?: boolean;
  /** Region code */
  region?: string;
  /** Parent entity type: "jeu", "editeur", "developpeur", "genre", etc. */
  parent?: string;
  /** CRC32 checksum */
  crc?: string;
  /** MD5 checksum */
  md5?: string;
  /** SHA1 checksum */
  sha1?: string;
  /** File size in bytes */
  size?: string;
  /** File format: "png", "jpg", "mp4", etc. */
  format?: string;
}

/**
 * Game information returned from the jeuRecherche.php or jeuInfos.php endpoint.
 *
 * The API returns a complex nested structure. Key fields:
 *   - id: numeric game ID
 *   - noms: array of { region, text } objects
 *   - medias: array of media objects with type, url, region, parent, etc.
 *   - synopsis: array of { langue, text } objects
 *   - genres, modes, familles, etc.
 */
export interface ScreenScraperGameInfo {
  /** ScreenScraper internal game ID */
  id: string;
  /** Game name (internal ScreenScraper name) */
  nom?: string;
  /** Game name (alias for compatibility) */
  name?: string;
  /** Alternate names — array of { region, text } objects */
  noms?: Array<{ region: string; text: string }>;
  /** Synopsis / description — array of { langue, text } objects */
  synopsis?: Array<{ langue: string; text: string }>;
  /** Release date */
  releasedate?: string;
  /** Developer — object with { id, text } */
  developpeur?: { id: string; text: string } | string;
  /** Publisher — object with { id, text } */
  editeur?: { id: string; text: string } | string;
  /** Genre */
  genre?: string;
  /** Number of players — object with { text } */
  joueurs?: { text: string } | string;
  /** Rating (0-20) */
  note?: string;
  /** Media assets — array of media objects */
  medias?: ScreenScraperMedia[];
  /** System info */
  systeme?: { id: string; text: string };
}

/**
 * Full API response wrapper from ScreenScraper.
 *
 * The API v2 returns: { header: {...}, response: { serveurs: {...}, jeux: [...] } }
 */
export interface ScreenScraperResponse {
  /** Header info */
  header?: Record<string, unknown>;
  /** Response data */
  response?: {
    serveurs?: Record<string, unknown>;
    jeux?: ScreenScraperGameInfo[];
  };
}

/**
 * Simplified result for the UI — a single scraped artwork option.
 */
export interface ScrapedArtwork {
  /** Unique key for this artwork */
  id: string;
  /** Image URL (will be proxied through our API) */
  imageUrl: string;
  /** Media type label for display */
  mediaType: string;
  /** Resolution string */
  resolution?: string;
  /** Vote score */
  vote?: number;
  /** Region */
  region?: string;
}

/**
 * ScreenScraper media type mapping — maps their type names to our internal keys.
 *
 * The API uses keys like:
 *   media_boitiers_2d.media_boitier_2d_fr → covers (2D box art)
 *   media_boitiers_3d.media_boitier_3d_fr → 3dboxes
 *   media_wheels.media_wheel_fr → marquees
 *   media_screenshot → screenshots
 *   media_video → videos
 *   media_fanart → fanart
 */
export const SCREENSCRAPER_MEDIA_TYPE_MAP: Record<string, string> = {
  "box-2D": "covers",
  "box-2D-alt": "covers",
  "box-2D-back": "backcovers",
  "box-3D": "3dboxes",
  mixrbv1: "covers",
  mixrbv2: "covers",
  ss: "screenshots",
  "ss-title": "titlescreens",
  wheel: "marquees",
  "wheel-hd": "marquees",
  "wheel-st": "marquees",
  "support-2D": "physicalmedia",
  "support-3D": "physicalmedia",
  fanart: "fanart",
  video: "videos",
};
