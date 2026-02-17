"use client";

import { useState, useEffect } from "react";

/**
 * PWA Install Prompt — shows a banner when the browser fires
 * the `beforeinstallprompt` event.
 * Renders nothing if already installed or not available.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      !!window.navigator.standalone
    );
  });

  useEffect(() => {
    // Already installed — nothing to listen for
    if (installed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't render if installed, dismissed, or no prompt available
  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-full max-w-sm animate-in slide-in-from-bottom-4">
      <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/95 px-5 py-4 shadow-2xl backdrop-blur-xl">
        <span className="text-2xl">🔖</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100">
            Install LinkNest
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Add to home screen for quick access
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:from-orange-500 hover:to-amber-500 active:scale-[0.97]"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
