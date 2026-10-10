"use client";

import { type ReactNode, useEffect } from "react";
import { FullscreenPrompt } from "@/components/FullscreenPrompt";
import { ModalProvider } from "@/components/Modal";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Register service worker for PWA support
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("[SW] Registration failed:", err));
      });
    }

    // Silently pre-warm the Render socket server in background when app is opened
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (socketUrl && typeof window !== "undefined") {
      const cleanUrl = socketUrl.replace(/\/+$/, "");
      if (!cleanUrl.includes("localhost")) {
        fetch(`${cleanUrl}/health`, { mode: "no-cors" }).catch(() => {});
      }
    }
  }, []);

  return (
    <ModalProvider>
      <ToastProvider>
        {children}
        <FullscreenPrompt />
      </ToastProvider>
    </ModalProvider>
  );
}
