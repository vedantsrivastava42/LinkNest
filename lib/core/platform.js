/**
 * Platform detection utility — works in both web and Chrome extension contexts.
 */

export function isExtension() {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.runtime !== "undefined" &&
    typeof chrome.runtime.id !== "undefined"
  );
}

export function isPWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isWeb() {
  return !isExtension();
}

/**
 * Returns "extension" | "pwa" | "web"
 */
export function getPlatform() {
  if (isExtension()) return "extension";
  if (isPWA()) return "pwa";
  return "web";
}
