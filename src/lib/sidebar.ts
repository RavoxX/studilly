export const SIDEBAR_COOKIE = "studilly_sidebar";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Whether the desktop sidebar is collapsed to icons.
 *
 * Kept in a cookie, like the theme, so the server renders the right width on
 * the first paint. A sidebar that expands a moment after the page appears
 * shifts everything beside it, which is worse than either state.
 */
export function isCollapsed(cookieValue: string | undefined): boolean {
  return cookieValue === "collapsed";
}
