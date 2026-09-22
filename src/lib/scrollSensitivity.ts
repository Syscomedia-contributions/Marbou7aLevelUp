// Amplifies wheel/trackpad scrolling for a more sensitive feel.
// Touch scroll on mobile is handled natively by the browser.
const MULTIPLIER = 1.8;

export function initScrollSensitivity() {
  if (typeof window === "undefined") return;

  const onWheel = (e: WheelEvent) => {
    // Ignore zoom / horizontal / modifier gestures and scoped scroll containers.
    if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    if (e.deltaMode !== 0) return; // only pixel mode (trackpad/mouse wheel)

    // Find the scrolling ancestor; if it's not the page, let it scroll natively.
    let el = e.target as HTMLElement | null;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
        return;
      }
      el = el.parentElement;
    }

    e.preventDefault();
    window.scrollBy({ top: e.deltaY * MULTIPLIER, left: e.deltaX * MULTIPLIER, behavior: "auto" });
  };

  window.addEventListener("wheel", onWheel, { passive: false });
}
