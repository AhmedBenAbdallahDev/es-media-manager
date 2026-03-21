"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string; // 'class' (default) or custom attribute name
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function applyThemeToDocument(theme: Theme, attribute = "class") {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  if (attribute === "class") {
    root.classList.toggle("dark", isDark);
  } else {
    root.setAttribute(attribute, isDark ? "dark" : "light");
  }
}

export default function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps): React.ReactElement {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      return stored ?? defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  React.useEffect(() => {
    // Apply on mount
    applyThemeToDocument(theme, attribute);

    if (enableSystem) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyThemeToDocument(theme, attribute);
      media.addEventListener ? media.addEventListener("change", handler) : media.addListener(handler);
      return () => media.removeEventListener ? media.removeEventListener("change", handler) : media.removeListener(handler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, attribute, enableSystem]);

  const setTheme = React.useCallback(
    (value: Theme) => {
      setThemeState(value);
      try {
        localStorage.setItem("theme", value);
      } catch {}
      applyThemeToDocument(value, attribute);

      if (disableTransitionOnChange) {
        const root = document.documentElement;
        root.classList.add("disable-theme-transitions");
        window.setTimeout(() => root.classList.remove("disable-theme-transitions"), 0);
      }
    },
    [attribute, disableTransitionOnChange]
  );

  const ctx = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
