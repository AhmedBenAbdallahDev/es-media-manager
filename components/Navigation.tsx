"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { LibraryIcon, GamepadIcon } from "lucide-react";
import { useLibrary } from "@/hooks/useLibrary";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Top navigation bar for the Retro Scraper app.
 */
export function Navigation() {
  const pathname = usePathname();
  const { state } = useLibrary();

  const isReady = state.status === "ready";
  const totalConsoles = isReady ? state.consoles.length : 0;

  const navItems: NavItem[] = [
    { href: "/", label: "Library", icon: LibraryIcon },
  ];

  return (
    <header className="bg-background sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-[#FF0080] to-[#7928CA] p-1 shadow-sm">
            <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-white">
               <path d="M160 120 L352 120 L384 180 L384 400 L128 400 L128 180 Z" fill="currentColor" fillOpacity="0.2" />
               <path d="M160 120 L352 120 L384 180 L384 400 L128 400 L128 180 Z" stroke="currentColor" strokeWidth="32" strokeLinejoin="round" />
               <rect x="180" y="150" width="152" height="120" rx="4" fill="currentColor" fillOpacity="0.3" />
               <circle cx="210" cy="330" r="30" fill="currentColor" />
               <circle cx="280" cy="330" r="15" fill="currentColor" />
               <circle cx="310" cy="330" r="15" fill="currentColor" />
            </svg>
          </div>
          <span className="font-pixel hidden text-sm tracking-wider sm:inline">
            RETRO SCRAPER
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === "/" || pathname.startsWith("/library");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-pixel flex items-center gap-1.5 rounded-md px-3 py-2 text-sm tracking-wider transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden md:inline">
                  {item.label.toUpperCase()}
                </span>
                {item.href === "/" && isReady && totalConsoles > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 hidden h-4 px-1 text-[10px] md:flex"
                  >
                    {totalConsoles}
                  </Badge>
                )}
              </Link>
            );
          })}

          <ThemeToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
