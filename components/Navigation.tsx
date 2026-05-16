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
          <GamepadIcon className="gradient-icon h-6 w-6" />
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
