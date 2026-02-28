"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiMaximize2 } from "react-icons/fi";

const FULLSCREEN_PREF_KEY = "housie_fullscreen";

/**
 * Root-level fullscreen gate: shows "Tap to enter full screen" when not in
 * fullscreen. Persists preference and restores fullscreen on first user tap after reload.
 */
export function FullscreenPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const restoreAttemptedRef = useRef(false);

  const updateFullscreen = useCallback(() => {
    const full = Boolean(document.fullscreenElement);
    setShowPrompt(!full);
    document.documentElement.dataset.fullscreen = full ? "true" : "false";
    if (full && typeof localStorage !== "undefined") {
      localStorage.setItem(FULLSCREEN_PREF_KEY, "1");
    }
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
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  // After reload: fullscreen can only be restored on a user gesture. On first tap anywhere, try to restore.
  useEffect(() => {
    if (document.fullscreenElement || !localStorage.getItem(FULLSCREEN_PREF_KEY)) return;
    if (restoreAttemptedRef.current) return;

    const tryRestore = () => {
      if (document.fullscreenElement) return;
      restoreAttemptedRef.current = true;
      document.documentElement.requestFullscreen?.().catch(() => {
        restoreAttemptedRef.current = false;
      });
    };

    const opts = { capture: true, passive: true };
    const onTouch = (e: TouchEvent) => {
      tryRestore();
    };
    const onClick = () => {
      tryRestore();
    };

    document.addEventListener("touchstart", onTouch, opts);
    document.addEventListener("click", onClick, opts);
    return () => {
      document.removeEventListener("touchstart", onTouch, opts);
      document.removeEventListener("click", onClick, opts);
    };
  }, [showPrompt]);

  if (!showPrompt) {
    return null;
  }

  const hadPreference = typeof localStorage !== "undefined" && localStorage.getItem(FULLSCREEN_PREF_KEY);

  return (
    <button
      type="button"
      onClick={requestFullscreen}
      className="fixed inset-0 z-9998 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center focus:outline-none focus:ring-2 focus:ring-yellow focus:ring-offset-2"
      aria-label="Enter full screen"
    >
      <FiMaximize2 className="size-14 text-yellow drop-shadow-sm" aria-hidden />
      <span className="text-lg font-semibold text-white drop-shadow-sm">
        {hadPreference ? "Tap to restore full screen" : "Tap to enter full screen"}
      </span>
    </button>
  );
}
