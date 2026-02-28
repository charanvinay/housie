"use client";

import { type ReactNode } from "react";
import { FullscreenPrompt } from "@/components/FullscreenPrompt";
import { ModalProvider } from "@/components/Modal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ModalProvider>
      {children}
      <FullscreenPrompt />
    </ModalProvider>
  );
}
