"use client";

import { useState } from "react";

function getIsMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    ua
  );
}

export function useIsMobileUserAgent(): boolean {
  const [isMobile] = useState(getIsMobileUserAgent);
  return isMobile;
}
