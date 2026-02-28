"use client";

import { useIsMobileUserAgent } from "@/hooks/useIsMobileUserAgent";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Props = { children: ReactNode };

/**
 * When on mobile and in portrait, wraps the game screen (pick next + tickets) in a
 * 90° rotated container so it appears landscape. Only the game content is rotated;
 * header and other cards stay normal.
 */
export function MobilePortraitGameWrap({ children }: Props) {
  const isMobileUserAgent = useIsMobileUserAgent();
  const [isPortrait, setIsPortrait] = useState(false);

  const check = useCallback(() => {
    if (typeof window === "undefined") return;
    setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
  }, []);

  useEffect(() => {
    check();
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener("change", check);
    window.addEventListener("resize", check);
    return () => {
      mq.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, [check]);

  const shouldRotate = isMobileUserAgent && isPortrait;

  if (!shouldRotate) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden w-full">
        {children}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden w-full">
      <div
        className="overflow-auto w-full h-full"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100vh",
          height: "100vw",
          transform: "translate(-50%, -50%) rotate(90deg)",
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
