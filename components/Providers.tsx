"use client";

import { type ReactNode } from "react";
import { FullscreenPrompt } from "@/components/FullscreenPrompt";
import { ModalProvider } from "@/components/Modal";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ModalProvider>
      <ToastProvider>
        {children}
        <FullscreenPrompt />
      </ToastProvider>
    </ModalProvider>
  );
}
