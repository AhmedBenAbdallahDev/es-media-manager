![ES Cover Manager](readme.png)

<div align="center">

**🎮 Cover & Media Manager for Retro Handheld SD Cards**

[![Open Source](https://img.shields.io/badge/Open%20Source-100%25-green?style=for-the-badge)](https://github.com/AhmedBenAbdallahDev/es-cover-manager) [![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-orange?style=for-the-badge)](#-100-client-side-processing)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 🎯 What Is This?

**ES Cover Manager** is a web-based tool for managing game covers, logos, screenshots, and other media on **retro handheld SD cards** — devices like the **R36S**, **RG35XX**, **RG503**, and similar handhelds running **ArkOS**, **ROCKNIX**, **JELOS**, or other EmulationStation-based firmware.

> ⚠️ **This is NOT ES-DE (EmulationStation Desktop Edition).** ES-DE is a desktop frontend. This tool is for **handheld SD cards** that use EmulationStation-based firmware (ArkOS, ROCKNIX, etc.) with a different folder structure and media conventions.

### The Problem

- 🔍 **Missing Covers**: Your SD card has hundreds of ROMs but many are missing box art
- 📁 **Complex File Structure**: Media files need specific naming conventions and folder placement
- 🖼️ **No Visual Management**: Hard to see which games have artwork and which don't
- 💾 **Manual Work**: Copying/pasting files into nested directories is tedious
- 🎨 **Limited Tools**: Existing tools are clunky or require technical knowledge

### The Solution

**ES Cover Manager** makes it easy to:

- **Scan your SD card** and see which games are missing covers
- **Fetch artwork** from ScreenScraper.fr automatically
- **Generate media files** with correct naming and folder structure
- **Edit metadata** directly in your `gamelist.xml` files
- **Manage everything** in a clean, visual interface — all offline

---

## ✨ Key Features

### 📂 Library Scanner

- **Auto-detect consoles** by scanning your SD card folder structure
- **Parse `gamelist.xml`** files to get game metadata
- **Show media status** — see which games have covers, logos, screenshots, videos
- **Filter & search** — find games missing specific media types
- **Edit metadata** — fix game names, descriptions, ratings, and more

### 🎨 Media Generator

- **Drag & drop** images, videos, or paste URLs
- **Auto-organize** files into the correct folder structure
- **Image optimization** — compress images to save storage space
- **Batch processing** — handle multiple games at once

### 🔍 ScreenScraper Integration

- **Fetch artwork** from [ScreenScraper.fr](https://www.screenscraper.fr/) API
- **Search by game name** and console system
- **Download covers, logos, screenshots, and videos** automatically
- **Server-side API calls** — your API keys stay private

### 🎮 Supported Media Types

| Type | Folder | Suffix | Description |
|------|--------|--------|-------------|
| Box Art / Covers | `images/` | `-image` | Main cover art |
| Wheel / Marquee | `images/` | `-marquee` | Game logo |
| Video Snap | `images/` | `-video` | Gameplay video |
| Screenshot | `images/` | `-image` | In-game screenshot |
| Thumbnail | `images/` | `-thumb` | Smaller preview |

### 🏆 Supported Consoles

Supports **100+ console systems** including:

- **Nintendo**: NES, SNES, N64, GameCube, GBA, DS, 3DS, Switch
- **PlayStation**: PS1, PS2, PS3, PSP, Vita
- **Sega**: Genesis, Saturn, Dreamcast, Game Gear, Master System
- **Arcade**: MAME, FinalBurn Neo, CPS1/2/3, Neo Geo
- **Handhelds**: Game Boy, Game Boy Color, Game Boy Advance, Atari Lynx
- **And many more** — see `lib/constants.ts` for the full list

---

## 🚀 Quick Start

### Option 1: Run Locally

```bash
# Clone the repository
git clone https://github.com/AhmedBenAbdallahDev/es-cover-manager.git
cd es-cover-manager

# Install dependencies
bun install

# Set up environment variables (see below)
cp .env.example .env.local

# Start development server
bun run dev

# Open http://localhost:3000
```

### Option 2: Use the Web App

**👉 [Open ES Cover Manager](https://esde-manager.ashref.tn/)**

No installation required! Works in any modern web browser.

---

## 🔧 Environment Variables

Create a `.env.local` file in the project root:

```env
# ScreenScraper API credentials (for fetching artwork)
SCREENSCRAPER_DEVID=your_developer_id
SCREENSCRAPER_DEVPASSWORD=your_developer_password
```

> ⚠️ **Never commit `.env.local` to version control.** It's already in `.gitignore`.

---

## 📂 How It Works

### 1. **Library Mode** — Scan & Manage Your SD Card

1. **Connect your SD card** to your PC
2. **Click "Open SD Card"** and select the root folder
3. **Auto-scan** detects all console folders and parses `gamelist.xml`
4. **Browse your library** — see which games have artwork and which don't
5. **Edit metadata** — fix names, descriptions, ratings, and more
6. **Save changes** — writes directly to your SD card

### 2. **Generator Mode** — Create Media Files

1. **Upload media** — drag & drop images/videos or paste URLs
2. **Select console** — choose the target platform
3. **Generate** — files are organized into the correct folder structure
4. **Save to SD card** — grant browser access and files are placed automatically

### 3. **ScreenScraper Mode** — Fetch Artwork

1. **Search for a game** by name and console
2. **Browse results** from ScreenScraper.fr
3. **Download artwork** — covers, logos, screenshots, videos
4. **Save to SD card** — files are placed in the correct locations

---

## 🔒 100% Client-Side Processing

Your privacy is our priority:

- ✅ **No Server Uploads**: Files are processed entirely in your browser
- ✅ **No Data Collection**: We don't collect or store any personal information
- ✅ **Offline Capable**: Works without an internet connection (after initial load)
- ✅ **No Registration**: Use immediately without creating accounts
- ✅ **Open Source**: Fully transparent code you can audit yourself

---

## 🛠️ Development

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **File Processing**: Web APIs (FileSystem Access API, Canvas, etc.)
- **Image Optimization**: Built-in image compression
- **Build Tool**: Turbopack
- **Package Manager**: Bun

### Project Structure

```
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (ScreenScraper, image fetching)
│   ├── generator/         # Media generator page
│   └── library/           # Library scanner & manager
├── components/            # React components
│   ├── browser/           # Library browser components
│   ├── scraper/           # ScreenScraper components
│   └── ui/                # UI component library (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, constants, helpers
│   ├── constants.ts       # Console list, media types
│   ├── screenscraper.ts   # ScreenScraper API client
│   ├── sdScanner.ts       # SD card scanner
│   └── gamelistParser.ts  # gamelist.xml parser
├── types/                 # TypeScript type definitions
└── public/                # Static assets (logos, etc.)
```

### Development Commands

```bash
bun run dev             # Start development server
bun run build           # Build for production
bun run lint            # Run ESLint
bun run format          # Format with Prettier
bun run dev:debug       # Start with debugger attached
```

---

## 📝 License

Open source — use it however you like. Contributions welcome!

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **🐛 Report Issues**: Found a bug? [Open an issue](https://github.com/Ashref-dev/es-de-custom-cover-generator/issues)
2. **💡 Suggest Features**: Have an idea? [Start a discussion](https://github.com/Ashref-dev/es-de-custom-cover-generator/discussions)
3. **🔧 Submit Pull Requests**:
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Submit a pull request

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Start development server: `bun run dev`
4. Make your changes and test
5. Submit a pull request

---

## 📸 Screenshots

<details>
<summary>🖼️ Click to view screenshots</summary>

### Home Page

![Home Page](docs/screenshots/home.png)

### Generator Mode

![Generator](docs/screenshots/generator.png)

### Browse Mode

![Browse](docs/screenshots/browse.png)

### Media Management

![Media Management](docs/screenshots/media-management.png)

</details>

---

## ❤️ Support the Project

If you find this project helpful:

- ⭐ **Star the repository** to show your support
- 🐛 **Report issues** to help improve the tool
- 🔄 **Share with others** in the retro gaming community
- 💡 **Contribute features** or improvements
- ☕ **[Buy me a coffee](https://ashref.tn)** to fuel more development

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 About the Author

**Ashref Ben Abdallah**

- 🌐 Website: [ashref.tn](https://ashref.tn)
- 🐙 GitHub: [@Ashref-dev](https://github.com/Ashref-dev)
- 🎮 Passionate retro gaming enthusiast and developer

---

## 🙏 Acknowledgments

- **EmulationStation Desktop Edition** team for creating an amazing frontend
- The **retro gaming community** for inspiration and feedback
- **Open source contributors** who make projects like this possible
- **Beta testers** who helped shape the user experience

---

<div align="center">

**🎮 Happy Gaming! 🎮**

_Made with ❤️ for the retro gaming community_

[![Website](https://img.shields.io/badge/Try%20it%20now-esde--manager.ashref.tn-blue?style=for-the-badge&logo=web)](https://esde-manager.ashref.tn/)

</div>
