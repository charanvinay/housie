"use client";

import { type ReactNode } from "react";
import { ModalProvider } from "@/components/Modal";
import { RotateToLandscape } from "@/components/RotateToLandscape";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RotateToLandscape>
      <ModalProvider>{children}</ModalProvider>
    </RotateToLandscape>
  );
}
