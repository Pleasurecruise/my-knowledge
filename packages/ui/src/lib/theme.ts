export type Theme = "light" | "dark";

export const themeStorageKey = "my-knowledge:theme";

export function applyTheme(theme: Theme, button: HTMLElement) {
  const root = document.documentElement;
  const isDark = theme === "dark";

  const bounds = button.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const transition = document.startViewTransition(() => {
    root.classList.toggle("dark", isDark);
    root.dataset.theme = theme;
  });

  void transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 500,
        easing: "ease-in-out",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
}
