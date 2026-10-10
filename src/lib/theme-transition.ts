/**
 * Switches the theme with a short colour fade.
 *
 * The fade is only switched on for the moment of the change (class
 * `theme-switching` on <html>, see globals.css). A permanent transition on
 * every element made the browser animate hundreds of elements whenever any
 * colour changed, which froze phones for seconds while pages loaded.
 */
const FADE_MS = 500;
let timer: ReturnType<typeof setTimeout> | undefined;

export function switchThemeSmoothly(setTheme: (theme: string) => void, theme: string) {
  const root = document.documentElement;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(theme);
    return;
  }

  root.classList.add("theme-switching");
  setTheme(theme);

  clearTimeout(timer);
  timer = setTimeout(() => root.classList.remove("theme-switching"), FADE_MS + 50);
}
