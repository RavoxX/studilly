export const THEME_COOKIE = "studilly_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Resolves the `data-theme` attribute for <html>.
 *
 * "system" returns null, meaning no attribute: the CSS falls through to
 * `prefers-color-scheme`. Resolving this on the server from a cookie is what
 * avoids a flash of the wrong theme, with no inline script needed.
 */
export function themeAttribute(theme: Theme): "light" | "dark" | null {
  return theme === "system" ? null : theme;
}
