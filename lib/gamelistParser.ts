/**
 * Gamelist XML Parser & Serializer
 *
 * Parses EmulationStation gamelist.xml files and serializes them back.
 * Uses the browser's built-in DOMParser / XMLSerializer — no dependencies.
 */

import type { GamelistGame } from "@/types/scraper";

/** Fields that are stored as direct child text nodes of <game> */
const TEXT_FIELDS: (keyof GamelistGame)[] = [
  "path",
  "name",
  "desc",
  "rating",
  "releasedate",
  "developer",
  "publisher",
  "genre",
  "players",
  "image",
  "thumbnail",
  "marquee",
  "video",
  "fanart",
  "genreids",
  "region",
  "favorite",
  "playcount",
  "lastplayed",
  "kidgame",
  "lang",
  "arcadesystemname",
];

/**
 * Reads a text node from a <game> element by tag name.
 */
function getText(game: Element, tag: string): string | undefined {
  const el = game.querySelector(tag);
  return el?.textContent?.trim() || undefined;
}

/**
 * Parses the raw XML string of a gamelist.xml file into an array of GamelistGame objects.
 * Unknown / extra tags are silently ignored but preserved during serialization.
 *
 * @param xmlString Raw XML content of gamelist.xml
 * @returns Parsed array of games
 */
export function parseGamelist(xmlString: string): GamelistGame[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`);
  }

  const gameElements = Array.from(doc.querySelectorAll("gameList > game"));

  return gameElements.map((el) => {
    const game: GamelistGame = {
      path: getText(el, "path") ?? "",
      name: getText(el, "name") ?? getText(el, "path") ?? "Unknown",
    };

    // Preserve id and source attributes
    const idAttr = el.getAttribute("id");
    const sourceAttr = el.getAttribute("source");
    if (idAttr) game.id = idAttr;
    if (sourceAttr) game.source = sourceAttr;

    // Parse all remaining text fields
    for (const field of TEXT_FIELDS) {
      if (field === "path" || field === "name") continue; // already done
      const value = getText(el, field as string);
      if (value !== undefined) {
        (game as unknown as Record<string, string>)[field as string] = value;
      }
    }

    return game;
  });
}

/**
 * Reads a FileSystemFileHandle and returns the gamelist.xml content as a string.
 *
 * @param fileHandle A FileSystemFileHandle pointing to gamelist.xml
 * @returns Raw XML string
 */
export async function readGamelistFile(
  fileHandle: FileSystemFileHandle
): Promise<string> {
  const file = await fileHandle.getFile();
  return file.text();
}

/**
 * Serializes an array of GamelistGame objects back into a well-formed gamelist.xml string.
 * Produces clean, indented XML that EmulationStation can read.
 *
 * @param games Array of games to serialize
 * @returns XML string ready to write to disk
 */
export function serializeGamelist(games: GamelistGame[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0"?>');
  lines.push("<gameList>");

  for (const game of games) {
    const idAttr = game.id ? ` id="${escapeAttr(game.id)}"` : "";
    const sourceAttr = game.source
      ? ` source="${escapeAttr(game.source)}"`
      : "";
    lines.push(`\t<game${idAttr}${sourceAttr}>`);

    // Always write path and name first
    lines.push(`\t\t<path>${escapeXml(game.path)}</path>`);
    lines.push(`\t\t<name>${escapeXml(game.name)}</name>`);

    // Write all other fields that have values
    for (const field of TEXT_FIELDS) {
      if (field === "path" || field === "name") continue;
      const value = (game as unknown as Record<string, string | undefined>)[
        field as string
      ];
      if (value !== undefined && value !== "") {
        lines.push(`\t\t<${field}>${escapeXml(value)}</${field}>`);
      }
    }

    lines.push("\t</game>");
  }

  lines.push("</gameList>");
  return lines.join("\n");
}

/**
 * Writes the updated gamelist.xml back to disk via the File System Access API.
 *
 * @param consoleDirHandle The directory handle of the console folder
 * @param games Updated games array
 */
export async function writeGamelist(
  consoleDirHandle: FileSystemDirectoryHandle,
  games: GamelistGame[]
): Promise<void> {
  const xmlContent = serializeGamelist(games);
  const fileHandle = await consoleDirHandle.getFileHandle("gamelist.xml", {
    create: true,
  });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(xmlContent);
  await writable.close();
}

/** Escapes special XML characters in text content */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Escapes special characters in XML attribute values */
function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
