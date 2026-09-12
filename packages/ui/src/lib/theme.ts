export type Theme = "light" | "dark";

export const themeStorageKey = "my-knowledge:theme";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  void root.offsetWidth;
  requestAnimationFrame(() => root.classList.remove("theme-switching"));
}
