"use client";

import { useCallback, useEffect, useState } from "react";
import { FiMaximize2 } from "react-icons/fi";

/**
 * Root-level fullscreen gate: shows "Tap to enter full screen" when not in
 * fullscreen. App is not usable until the user enters fullscreen (e.g. on "/").
 */
export function FullscreenPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const updateFullscreen = useCallback(() => {
    const full = Boolean(document.fullscreenElement);
    setShowPrompt(!full);
    document.documentElement.dataset.fullscreen = full ? "true" : "false";
  }, []);

  useEffect(() => {
    updateFullscreen();
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.documentElement.dataset.fullscreen = "false";
    };
  }, [updateFullscreen]);

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  if (!showPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={requestFullscreen}
      className="fixed inset-0 z-9998 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center focus:outline-none focus:ring-2 focus:ring-yellow focus:ring-offset-2"
      aria-label="Enter full screen"
    >
      <FiMaximize2 className="size-14 text-yellow drop-shadow-sm" aria-hidden />
      <span className="text-lg font-semibold text-white drop-shadow-sm">
        Tap to enter full screen
      </span>
    </button>
  );
}
