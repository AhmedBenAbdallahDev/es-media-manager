/**
 * ScreenScraper.fr API client types
 *
 * These types cover the main data structures returned by the
 * ScreenScraper REST API v1.
 *
 * API docs: https://www.screenscraper.fr/api/documentation
 */

/**
 * A single media asset (screenshot, boxart, etc.) from ScreenScraper.
 */
export interface ScreenScraperMedia {
  /** Unique ID for this media item */
  id: string;
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
}

/**
 * Game information returned from the ssInfos endpoint.
 */
export interface ScreenScraperGameInfo {
  /** ScreenScraper internal game ID */
  id: string;
  /** Game name */
  name: string;
  /** Alternate names */
  names?: Record<string, string>;
  /** Synopsis / description keyed by language */
  synopsis?: Record<string, string>;
  /** Release date */
  releasedate?: string;
  /** Developer */
  developer?: string;
  /** Publisher */
  publisher?: string;
  /** Genre */
  genre?: string;
  /** Number of players */
  players?: string;
  /** Rating (0-5) */
  rating?: string;
  /** Media assets grouped by type */
  medias?: ScreenScraperMedia[];
}

/**
 * Full API response wrapper from ScreenScraper.
 */
export interface ScreenScraperResponse {
  /** Status code (0 = success) */
  status: number;
  /** Status message */
  message?: string;
  /** Response data */
  data?: {
    game?: ScreenScraperGameInfo;
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
