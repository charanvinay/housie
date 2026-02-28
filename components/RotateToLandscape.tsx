"use client";

import { useIsMobileUserAgent } from "@/hooks/useIsMobileUserAgent";
import { useEffect, useState, type ReactNode } from "react";
import { FiRotateCw } from "react-icons/fi";

const NARROW_BREAKPOINT = 768;

type Props = {
  children: ReactNode;
  /** When true, show rotate prompt and apply orientation lock (game screen with tickets only). When false, just render children. */
  active?: boolean;
};

export function RotateToLandscape({ children, active = false }: Props) {
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const isMobileUserAgent = useIsMobileUserAgent();

  useEffect(() => {
    if (!active) {
      setShowRotatePrompt(false);
      return;
    }

    const checkOrientation = () => {
      const isPortrait =
        typeof window !== "undefined" &&
        window.matchMedia("(orientation: portrait)").matches;
      const isNarrow =
        typeof window !== "undefined" &&
        window.innerWidth < NARROW_BREAKPOINT;

      // Non-mobile (e.g. laptop in device mode): show rotate when portrait or narrow
      // Mobile (real device): show rotate only when portrait; in landscape we lock
      if (isMobileUserAgent) {
        setShowRotatePrompt(isPortrait);
      } else {
        setShowRotatePrompt(isPortrait || isNarrow);
      }

      if (isMobileUserAgent && !isPortrait && typeof window !== "undefined") {
        const orientation = (screen as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
        orientation?.lock?.("landscape").catch(() => {});
      }
    };

    checkOrientation();
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const resizeHandler = () => checkOrientation();
    mediaQuery.addEventListener("change", checkOrientation);
    window.addEventListener("resize", resizeHandler);
    return () => {
      mediaQuery.removeEventListener("change", checkOrientation);
      window.removeEventListener("resize", resizeHandler);
    };
  }, [isMobileUserAgent, active]);

  if (active && showRotatePrompt) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--gradient-bg)] p-6 text-center">
        <FiRotateCw className="mb-6 size-16 text-yellow" aria-hidden />
        <h1 className="text-xl font-bold text-white drop-shadow-sm">
          Please rotate
        </h1>
      </div>
    );
  }

  return <>{children}</>;
}
