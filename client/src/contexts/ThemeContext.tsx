import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type Palette = "ocean" | "violet" | "forest" | "sunset";

interface ThemeContextType {
  theme: Theme;
  palette: Palette;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setPalette: (palette: Palette) => void;
  applyPreferences: (theme: Theme, palette: Palette) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "light" }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("recebimentos-theme") as Theme) || defaultTheme);
  const [palette, setPalette] = useState<Palette>(() => (localStorage.getItem("recebimentos-palette") as Palette) || "ocean");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.palette = palette;
    localStorage.setItem("recebimentos-theme", theme);
    localStorage.setItem("recebimentos-palette", palette);
  }, [theme, palette]);

  const value = {
    theme,
    palette,
    setTheme,
    setPalette,
    toggleTheme: () => setTheme(previous => (previous === "light" ? "dark" : "light")),
    applyPreferences: (nextTheme: Theme, nextPalette: Palette) => {
      setTheme(nextTheme);
      setPalette(nextPalette);
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
