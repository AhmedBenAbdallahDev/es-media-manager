import { NextRequest, NextResponse } from "next/server";
import {
  extractArtwork,
  getScreenScraperDisplayName,
  parseScreenScraperSearchHints,
  searchGame,
} from "@/lib/screenscraper";
import type { ScrapedArtwork } from "@/types/screenscraper";

/**
 * POST /api/screenscraper/fetch-art
 *
 * Server-side endpoint that queries ScreenScraper.fr for game artwork.
 * The credentials are stored securely in .env.local and NEVER exposed to the client.
 *
 * Request body:
 *   {
 *     gameName: string,       // Display name of the game
 *     console: string,        // ES-DE console folder name (e.g., "gba", "psx")
 *     mediaType?: string      // Optional: "covers", "marquees", "screenshots", etc.
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     gameName: string,           // Matched game name from ScreenScraper
 *     artworks: ScrapedArtwork[]  // Sorted array of artwork options
 *   }
 *
 *   OR on error:
 *   {
 *     success: false,
 *     error: string
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameName,
      console: consoleFolder,
      mediaType,
    } = body as {
      gameName?: string;
      console?: string;
      mediaType?: string;
    };

    // Validate required fields
    if (!gameName || !gameName.trim()) {
      return NextResponse.json(
        { success: false, error: "gameName is required" },
        { status: 400 }
      );
    }

    if (!consoleFolder || !consoleFolder.trim()) {
      return NextResponse.json(
        { success: false, error: "console is required" },
        { status: 400 }
      );
    }

    const targetType = mediaType || "covers";
    const queryHints = parseScreenScraperSearchHints(gameName.trim());

    // Query ScreenScraper (credentials from env, not exposed to client)
    const gameInfo = await searchGame(
      queryHints.searchTerm,
      consoleFolder.trim(),
      queryHints.preferredRegion
    );

    if (!gameInfo) {
      return NextResponse.json(
        {
          success: true,
          gameName: null,
          artworks: [],
          message: "No results found on ScreenScraper.",
        },
        { status: 200 }
      );
    }

    // Extract and sort artwork options
    const artworks: ScrapedArtwork[] = extractArtwork(
      gameInfo,
      targetType,
      queryHints.preferredRegion
    );

    const matchedName = getScreenScraperDisplayName(
      gameInfo,
      queryHints.preferredRegion
    );

    return NextResponse.json({
      success: true,
      gameName: matchedName,
      artworks,
    });
  } catch (error) {
    console.error("[API /screenscraper/fetch-art] Error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          error: "Request timed out. ScreenScraper may be slow.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
