"use client";

import { type ReactNode } from "react";
import { ModalProvider } from "@/components/Modal";

export function Providers({ children }: { children: ReactNode }) {
  return <ModalProvider>{children}</ModalProvider>;
}
