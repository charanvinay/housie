"use client";

import { useIsMobileUserAgent } from "@/hooks/useIsMobileUserAgent";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FiRotateCw } from "react-icons/fi";

const NARROW_BREAKPOINT = 768;

export function RotateToLandscape({ children }: { children: ReactNode }) {
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const isMobileUserAgent = useIsMobileUserAgent();
  const pathname = usePathname();
  const isRoomPage = pathname?.startsWith("/room/") ?? false;

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait =
        typeof window !== "undefined" &&
        window.matchMedia("(orientation: portrait)").matches;
      const isNarrow =
        typeof window !== "undefined" &&
        window.innerWidth < NARROW_BREAKPOINT;

      // Non-mobile (e.g. laptop in device mode): show rotate when portrait or narrow; after "larger device" / landscape → app with scrollable tickets
      // Mobile (real device): show rotate only when portrait so we only display landscape view; in landscape we lock and show app
      if (isMobileUserAgent) {
        setShowRotatePrompt(isPortrait);
      } else {
        setShowRotatePrompt(isPortrait || isNarrow);
      }

      // Mobile (by user agent): prevent rotation on room page when in landscape
      if (
        isMobileUserAgent &&
        isRoomPage &&
        !isPortrait &&
        typeof window !== "undefined" &&
        "orientation" in screen &&
        "lock" in screen.orientation
      ) {
        screen.orientation.lock("landscape").catch(() => {});
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
  }, [isMobileUserAgent, isRoomPage]);

  if (showRotatePrompt) {
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
