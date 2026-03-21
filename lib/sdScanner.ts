/**
 * SD Card Scanner
 *
 * Scans the root of a retro handheld SD card (or any EmulationStation root dir),
 * detects console folders by their folder name, parses gamelist.xml,
 * and counts ROM files vs. scraped images.
 *
 * Works entirely with the browser File System Access API — no server, no uploads.
 */

import type { ConsoleLibrary, ScanProgress } from "@/types/scraper";
import { parseGamelist } from "@/lib/gamelistParser";
import { resolveMediaFileHandle } from "@/lib/mediaFileOperations";

/**
 * Comprehensive console folder-name → label mapping.
 * Covers ES-DE standard names AND common ArkOS / ROCKNIX / RetroArch variants.
 */
export const CONSOLE_NAME_MAP: Record<string, { label: string; logo?: string }> =
  {
    // --- PlayStation family ---
    psx: { label: "Sony PlayStation", logo: "/logos/psx.png" },
    ps1: { label: "Sony PlayStation", logo: "/logos/psx.png" },
    ps2: { label: "Sony PlayStation 2", logo: "/logos/ps2.png" },
    ps3: { label: "Sony PlayStation 3", logo: "/logos/ps3.png" },
    ps4: { label: "Sony PlayStation 4" },
    psp: { label: "Sony PlayStation Portable", logo: "/logos/psp.png" },
    pspminis: { label: "PSP Minis", logo: "/logos/psp.png" },
    psvita: { label: "Sony PlayStation Vita", logo: "/logos/psvita.png" },

    // --- Nintendo handhelds ---
    gb: { label: "Nintendo Game Boy", logo: "/logos/gb.png" },
    gbc: { label: "Nintendo Game Boy Color", logo: "/logos/gbc.png" },
    gba: { label: "Nintendo Game Boy Advance", logo: "/logos/gba.png" },
    gbah: { label: "GBA Hacks" },
    gbh: { label: "Game Boy Hacks" },
    gbch: { label: "Game Boy Color Hacks" },
    sgb: { label: "Super Game Boy", logo: "/logos/sgb.png" },
    nds: { label: "Nintendo DS", logo: "/logos/nds.png" },
    n3ds: { label: "Nintendo 3DS", logo: "/logos/n3ds.png" },
    pokemini: { label: "Nintendo Pokémon Mini", logo: "/logos/pokemini.png" },
    pokemonmini: { label: "Nintendo Pokémon Mini", logo: "/logos/pokemini.png" },
    gameandwatch: { label: "Game & Watch", logo: "/logos/gameandwatch.png" },
    gw: { label: "Game & Watch", logo: "/logos/gameandwatch.png" },

    // --- Nintendo home consoles ---
    nes: { label: "Nintendo NES", logo: "/logos/nes.png" },
    nesh: { label: "NES Hacks" },
    famicom: { label: "Nintendo Famicom", logo: "/logos/famicom.png" },
    fds: { label: "Famicom Disk System", logo: "/logos/fds.png" },
    snes: { label: "Super Nintendo", logo: "/logos/snes.png" },
    snesh: { label: "SNES Hacks" },
    "snes-hacks": { label: "SNES Hacks" },
    sfc: { label: "Super Famicom", logo: "/logos/sfc.png" },
    snesmsu1: { label: "SNES MSU-1" },
    msumd: { label: "MSU-MD" },
    satellaview: { label: "Satellaview", logo: "/logos/satellaview.png" },
    sufami: { label: "SuFami Turbo" },
    n64: { label: "Nintendo 64", logo: "/logos/n64.png" },
    n64dd: { label: "Nintendo 64DD", logo: "/logos/n64dd.png" },
    gc: { label: "Nintendo GameCube", logo: "/logos/gc.png" },
    wii: { label: "Nintendo Wii", logo: "/logos/wii.png" },
    wiiu: { label: "Nintendo Wii U", logo: "/logos/wiiu.png" },
    switch: { label: "Nintendo Switch", logo: "/logos/switch.png" },

    // --- Sega ---
    "sg-1000": { label: "Sega SG-1000", logo: "/logos/sg-1000.png" },
    mastersystem: { label: "Sega Master System", logo: "/logos/mastersystem.png" },
    mark3: { label: "Sega Mark III" },
    genesis: { label: "Sega Genesis", logo: "/logos/genesis.png" },
    megadrive: { label: "Sega Mega Drive", logo: "/logos/megadrive.png" },
    "megadrive-japan": { label: "Mega Drive [Japan]" },
    megadrivejp: { label: "Mega Drive [Japan]" },
    genh: { label: "Genesis Hacks" },
    sega32x: { label: "Sega 32X", logo: "/logos/sega32x.png" },
    segacd: { label: "Sega CD", logo: "/logos/segacd.png" },
    megacd: { label: "Sega Mega-CD" },
    saturn: { label: "Sega Saturn", logo: "/logos/saturn.png" },
    dreamcast: { label: "Sega Dreamcast", logo: "/logos/dreamcast.png" },
    gamegear: { label: "Sega Game Gear", logo: "/logos/gamegear.png" },
    naomi: { label: "Sega NAOMI", logo: "/logos/naomi.png" },
    naomi2: { label: "Sega NAOMI 2" },
    atomiswave: { label: "Atomiswave", logo: "/logos/atomiswave.png" },
    model2: { label: "Sega Model 2" },
    model3: { label: "Sega Model 3" },
    stv: { label: "Sega Titan Video" },

    // --- NEC / PC Engine ---
    pcengine: { label: "PC Engine / TurboGrafx-16", logo: "/logos/pcengine.png" },
    turbografx: { label: "TurboGrafx-16", logo: "/logos/pcengine.png" },
    tg16: { label: "TurboGrafx-16" },
    pcenginecd: { label: "PC Engine CD", logo: "/logos/pcenginecd.png" },
    turbografxcd: { label: "TurboGrafx-CD" },
    "tg-cd": { label: "TurboGrafx-CD" },
    tg16cd: { label: "TurboGrafx-CD" },
    supergrafx: { label: "SuperGrafx", logo: "/logos/supergrafx.png" },
    sgfx: { label: "SuperGrafx" },
    pcfx: { label: "PC-FX", logo: "/logos/pcfx.png" },

    // --- SNK ---
    neogeo: { label: "SNK Neo Geo", logo: "/logos/neogeo.png" },
    neocd: { label: "SNK Neo Geo CD", logo: "/logos/neogeocd.png" },
    neogeocd: { label: "SNK Neo Geo CD", logo: "/logos/neogeocd.png" },
    neogeocdjp: { label: "Neo Geo CD [Japan]" },
    ngp: { label: "Neo Geo Pocket", logo: "/logos/ngp.png" },
    ngpc: { label: "Neo Geo Pocket Color", logo: "/logos/ngpc.png" },

    // --- Arcade ---
    arcade: { label: "Arcade (MAME)", logo: "/logos/arcade.png" },
    mame: { label: "MAME", logo: "/logos/arcade.png" },
    "mame2003": { label: "MAME 2003" },
    hbmame: { label: "HB MAME" },
    fbneo: { label: "FinalBurn Neo", logo: "/logos/fbneo.png" },
    fba: { label: "FinalBurn Alpha", logo: "/logos/fba.png" },
    cps1: { label: "CPS-1", logo: "/logos/cps1.png" },
    cps2: { label: "CPS-2", logo: "/logos/cps2.png" },
    cps3: { label: "CPS-3", logo: "/logos/cps3.png" },
    capcom: { label: "Capcom Arcade" },
    pgm2: { label: "IGS PGM2" },
    alg: { label: "American Laser Games" },

    // --- Atari ---
    atari2600: { label: "Atari 2600", logo: "/logos/atari2600.png" },
    atari5200: { label: "Atari 5200", logo: "/logos/atari5200.png" },
    atari7800: { label: "Atari 7800", logo: "/logos/atari7800.png" },
    atarilynx: { label: "Atari Lynx", logo: "/logos/atarilynx.png" },
    atarijaguar: { label: "Atari Jaguar", logo: "/logos/atarijaguar.png" },
    atarijaguarcd: { label: "Atari Jaguar CD", logo: "/logos/atarijaguarcd.png" },
    atarist: { label: "Atari ST", logo: "/logos/atarist.png" },
    atari800: { label: "Atari 800", logo: "/logos/atari800.png" },
    atarixe: { label: "Atari XE", logo: "/logos/atarixe.png" },
    atarixegs: { label: "Atari XEGS" },

    // --- Commodore ---
    c64: { label: "Commodore 64", logo: "/logos/c64.png" },
    c16: { label: "Commodore 16" },
    c128: { label: "Commodore 128" },
    amiga: { label: "Commodore Amiga", logo: "/logos/amiga.png" },
    amiga600: { label: "Amiga 600", logo: "/logos/amiga600.png" },
    amiga1200: { label: "Amiga 1200", logo: "/logos/amiga1200.png" },
    amigacd32: { label: "Amiga CD32", logo: "/logos/amigacd32.png" },
    cdtv: { label: "Commodore CDTV", logo: "/logos/cdtv.png" },
    vic20: { label: "Commodore VIC-20", logo: "/logos/vic20.png" },
    plus4: { label: "Commodore Plus/4" },

    // --- PC / DOS ---
    dos: { label: "DOS", logo: "/logos/dos.png" },
    pc: { label: "IBM PC" },
    pc98: { label: "NEC PC-98", logo: "/logos/pc98.png" },
    pc88: { label: "NEC PC-88" },
    x68000: { label: "Sharp X68000", logo: "/logos/x68000.png" },
    x1: { label: "Sharp X1", logo: "/logos/x1.png" },
    fm7: { label: "Fujitsu FM-7" },
    fmtowns: { label: "Fujitsu FM Towns", logo: "/logos/fmtowns.png" },
    fmtownsux: { label: "FM Towns UX" },
    msx: { label: "MSX", logo: "/logos/msx.png" },
    msx1: { label: "MSX1" },
    msx2: { label: "MSX2" },
    msxturbor: { label: "MSX Turbo R" },
    apple2: { label: "Apple II", logo: "/logos/apple2.png" },
    apple2gs: { label: "Apple IIGS", logo: "/logos/apple2gs.png" },
    bbcmicro: { label: "BBC Micro", logo: "/logos/bbcmicro.png" },
    amstradcpc: { label: "Amstrad CPC", logo: "/logos/amstradcpc.png" },
    amstradgx4000: { label: "Amstrad GX4000" },
    gx4000: { label: "Amstrad GX4000", logo: "/logos/gx4000.png" },
    zxspectrum: { label: "ZX Spectrum", logo: "/logos/zxspectrum.png" },
    zx81: { label: "Sinclair ZX81", logo: "/logos/zx81.png" },
    zxnext: { label: "ZX Spectrum Next" },

    // --- Handheld / other ---
    wonderswan: { label: "Bandai WonderSwan", logo: "/logos/wonderswan.png" },
    wonderswancolor: { label: "WonderSwan Color", logo: "/logos/wonderswancolor.png" },
    supervision: { label: "Watara Supervision", logo: "/logos/supervision.png" },
    gamegearh: { label: "Game Gear Hacks" },
    arduboy: { label: "Arduboy", logo: "/logos/arduboy.png" },
    virtualboy: { label: "Nintendo Virtual Boy", logo: "/logos/virtualboy.png" },
    vectrex: { label: "GCE Vectrex", logo: "/logos/vectrex.png" },
    colecovision: { label: "ColecoVision", logo: "/logos/colecovision.png" },
    coleco: { label: "ColecoVision", logo: "/logos/colecovision.png" },
    intellivision: { label: "Mattel Intellivision", logo: "/logos/intellivision.png" },
    channelf: { label: "Fairchild Channel F", logo: "/logos/channelf.png" },
    odyssey2: { label: "Magnavox Odyssey 2", logo: "/logos/odyssey2.png" },
    odyssey: { label: "Magnavox Odyssey" },
    videopac: { label: "Philips Videopac", logo: "/logos/videopac.png" },
    "3do": { label: "3DO Interactive Multiplayer", logo: "/logos/3do.png" },
    cdimono1: { label: "Philips CD-i", logo: "/logos/cdimono1.png" },
    cdi: { label: "Philips CD-i" },

    // --- Game engines / ports ---
    scummvm: { label: "ScummVM", logo: "/logos/scummvm.png" },
    ports: { label: "Ports" },
    doom: { label: "Doom", logo: "/logos/doom.png" },
    quake: { label: "Quake" },
    wolf: { label: "Wolfenstein" },
    cavestory: { label: "Cave Story", logo: "/logos/cavestory.png" },
    openbor: { label: "OpenBOR", logo: "/logos/openbor.png" },
    easyrpg: { label: "EasyRPG", logo: "/logos/easyrpg.png" },
    solarus: { label: "Solarus" },
    onscripter: { label: "ONScripter" },
    love2d: { label: "LÖVE 2D" },
    tic80: { label: "TIC-80", logo: "/logos/tic80.png" },
    "tic-80": { label: "TIC-80", logo: "/logos/tic80.png" },
    pico8: { label: "PICO-8", logo: "/logos/pico8.png" },
    "pico-8": { label: "PICO-8" },
    pico: { label: "PICO-8" },
    wasm4: { label: "WASM-4", logo: "/logos/wasm4.png" },
    lowresnx: { label: "LowRes NX", logo: "/logos/lowresnx.png" },
    puzzlescript: { label: "PuzzleScript" },
    vircon32: { label: "Vircon32" },

    // --- Mobile / Java ---
    j2me: { label: "Java 2 Micro Edition", logo: "/logos/j2me.png" },
    freej2me: { label: "FreeJ2ME" },
    palm: { label: "Palm OS", logo: "/logos/palm.png" },

    // --- Other modern ---
    "sc-3000": { label: "Sega SC-3000" },
    dragon32: { label: "Dragon 32", logo: "/logos/dragon32.png" },
    coco3: { label: "TRS-80 Color Computer 3" },
    "trs-80": { label: "TRS-80" },
    ti99: { label: "Texas Instruments TI-99", logo: "/logos/ti99.png" },
    tvc: { label: "Videoton TVC" },
    enterprise: { label: "Enterprise 64/128" },
    thomson: { label: "Thomson MO/TO" },
    daphne: { label: "Daphne LaserDisc", logo: "/logos/daphne.png" },
    mv: { label: "MultiVision" },
    vmu: { label: "Sega VMU" },
    vmac: { label: "Virtual Mac" },
    advision: { label: "Entex AdVision" },
    mugen: { label: "M.U.G.E.N" },
    scv: { label: "Super Cassette Vision" },
    uzebox: { label: "Uzebox" },
    megaduck: { label: "Creatronic Mega Duck", logo: "/logos/megaduck.png" },
    astrocde: { label: "Bally Astrocade", logo: "/logos/astrocade.png" },
  };

/** Known non-console folder names to skip during scanning */
const SKIP_FOLDERS = new Set([
  "bios",
  "backup",
  "bezels",
  "bgmusic",
  "BGM",
  "downloads",
  "launchimages",
  "movies",
  "mplayer",
  "retroarch",
  "savestates",
  "screenshots",
  "splash",
  "themes",
  "tools",
  "videos",
  "piece",
  "ports_scripts",
  "RECYCLER",
  "RECYCLED",
  "$RECYCLE.BIN",
  "System Volume Information",
]);

/** File extensions that count as ROMs */
const ROM_EXTENSIONS = new Set([
  ".chd", ".cue", ".iso", ".bin", ".img",
  ".zip", ".7z", ".rar",
  ".nes", ".snes", ".smc", ".sfc", ".fig",
  ".gba", ".gb", ".gbc",
  ".nds", ".3ds",
  ".n64", ".z64", ".v64",
  ".gcm", ".rvz", ".wbfs",
  ".gg", ".sms", ".md", ".gen", ".32x",
  ".pce", ".tg16",
  ".ngp", ".ngc",
  ".ws", ".wsc",
  ".pbp", ".cso",
  ".xci", ".nsp",
  ".a26", ".a78", ".lnx",
  ".st", ".msa",
  ".dsk",
  ".tap", ".tzx",
  ".adf", ".lha",
  ".pzx", ".szx",
  ".cdi", ".gdi",
  ".m3u",
]);

/**
 * Counts ROM files in a directory (one level deep, no recursion).
 */
async function countRoms(dirHandle: FileSystemDirectoryHandle): Promise<number> {
  let count = 0;
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (handle.kind !== "file") continue;
    const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
    if (ROM_EXTENSIONS.has(ext)) count++;
  }
  return count;
}

/**
 * Checks if a directory contains a gamelist.xml and returns its file handle if found.
 */
async function findGamelistHandle(
  dirHandle: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await dirHandle.getFileHandle("gamelist.xml");
    return handle;
  } catch {
    return null;
  }
}

/**
 * Opens a directory picker for the SD card / ROM root folder.
 * Requests read-write permission so we can save gamelist changes.
 */
export async function pickSdCardRoot(): Promise<FileSystemDirectoryHandle> {
  if (!("showDirectoryPicker" in window)) {
    throw new Error(
      "Your browser does not support the File System Access API. Please use Chrome or Edge 86+."
    );
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: "retro-scraper-root",
      mode: "readwrite",
      startIn: "desktop",
    });
    return handle as FileSystemDirectoryHandle;
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name === "AbortError") {
      throw new Error("Folder selection was cancelled.");
    }
    throw new Error(
      `Could not open folder: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Scans the SD card root directory and returns an array of ConsoleLibrary objects.
 * Emits progress via the onProgress callback for UI updates.
 *
 * @param rootHandle The root FileSystemDirectoryHandle (SD card root or roms folder)
 * @param onProgress Optional callback called after each folder is processed
 */
export async function scanSdCard(
  rootHandle: FileSystemDirectoryHandle,
  onProgress?: (progress: ScanProgress) => void
): Promise<ConsoleLibrary[]> {
  const results: ConsoleLibrary[] = [];

  // Collect all directory entries first so we know the total
  const dirs: Array<[string, FileSystemDirectoryHandle]> = [];
  for await (const [name, handle] of (rootHandle as any).entries()) {
    if (handle.kind !== "directory") continue;
    if (SKIP_FOLDERS.has(name)) continue;
    dirs.push([name, handle as FileSystemDirectoryHandle]);
  }

  const total = dirs.length;
  let current = 0;

  for (const [folderName, dirHandle] of dirs) {
    current++;
    onProgress?.({ current, total, currentFolder: folderName });

    // Get the console label (known or fallback to capitalized folder name)
    const knownConsole = CONSOLE_NAME_MAP[folderName.toLowerCase()];
    const label =
      knownConsole?.label ??
      folderName.charAt(0).toUpperCase() + folderName.slice(1);
    const logoSrc = knownConsole?.logo;

    // Check for gamelist.xml
    const gamelistHandle = await findGamelistHandle(dirHandle);
    const hasGamelist = gamelistHandle !== null;

    let games = [];
    if (hasGamelist && gamelistHandle) {
      try {
        const file = await gamelistHandle.getFile();
        const xmlText = await file.text();
        games = parseGamelist(xmlText);
      } catch {
        // If XML is malformed, show 0 games but still show the console
        games = [];
      }
    }

    // Fast scan: count games with `image` or `thumbnail` set (no disk I/O).
    // Doing on-disk existence checks here can be very slow on large libraries
    // (causes scanning to appear stuck). For performance we only check fields;
    // a separate "Deep verify" can be added later if needed.
    const gamesWithImages = games.filter(
      (g) => (g.image && g.image.trim() !== "") || (g.thumbnail && g.thumbnail.trim() !== "")
    ).length;
    const gamesWithoutImages = games.length - gamesWithImages;

    // Count ROM files (async, non-blocking per folder)
    const totalRoms = await countRoms(dirHandle);

    // Only include folders that have either a gamelist or actual ROMs
    if (totalRoms === 0 && !hasGamelist) continue;

    results.push({
      folderName,
      label,
      logoSrc,
      games,
      totalRoms,
      gamesWithImages,
      gamesWithoutImages,
      hasGamelist,
      dirHandle,
    });
  }

  // Sort: consoles with gamelist first, then alphabetically
  return results.sort((a, b) => {
    if (a.hasGamelist && !b.hasGamelist) return -1;
    if (!a.hasGamelist && b.hasGamelist) return 1;
    return a.label.localeCompare(b.label);
  });
}
