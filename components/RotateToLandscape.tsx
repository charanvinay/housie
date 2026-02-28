"use client";

import { useIsMobileUserAgent } from "@/hooks/useIsMobileUserAgent";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FiRotateCw } from "react-icons/fi";

const NARROW_BREAKPOINT = 768;

type Props = {
  children: ReactNode;
  /** When true, on mobile: lock orientation to landscape and tilt layout 90° in portrait; on desktop: show rotate prompt when portrait/narrow. */
  active?: boolean;
};

function tryLockLandscape() {
  if (typeof window === "undefined" || !document.fullscreenElement) return;
  const o = (window.screen as { orientation?: { lock?: (mode: string) => Promise<void> } }).orientation;
  if (o?.lock) {
    o.lock("landscape").catch(() => {});
  }
}

export function RotateToLandscape({ children, active = false }: Props) {
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const isMobileUserAgent = useIsMobileUserAgent();

  const checkOrientation = useCallback(() => {
    const portrait =
      typeof window !== "undefined" &&
      window.matchMedia("(orientation: portrait)").matches;
    const narrow =
      typeof window !== "undefined" &&
      window.innerWidth < NARROW_BREAKPOINT;
    if (!isMobileUserAgent) {
      setShowRotatePrompt(portrait || narrow);
    }
  }, [isMobileUserAgent]);

  useEffect(() => {
    if (!active) {
      setShowRotatePrompt(false);
      return;
    }
    checkOrientation();
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener("change", checkOrientation);
    window.addEventListener("resize", checkOrientation);
    return () => {
      mq.removeEventListener("change", checkOrientation);
      window.removeEventListener("resize", checkOrientation);
    };
  }, [active, checkOrientation]);

  // On mobile: when in fullscreen, try to lock orientation to landscape so user cannot rotate
  useEffect(() => {
    if (!active || !isMobileUserAgent) return;
    tryLockLandscape();
    const onFullscreenChange = () => tryLockLandscape();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [active, isMobileUserAgent]);

  // Non-mobile: show "Please rotate" when portrait or narrow (mobile rotation is handled by MobilePortraitGameWrap around game screen only)
  if (active && showRotatePrompt) {
    return (
      <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
        <FiRotateCw className="mb-6 size-16 text-yellow" aria-hidden />
        <h1 className="text-xl font-bold text-white drop-shadow-sm">
          Please rotate
        </h1>
      </div>
    );
  }

  return <>{children}</>;
}
