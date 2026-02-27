"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const GRADIENT_BG =
  "radial-gradient(ellipse at center, #0045f6 0%, #0038d4 35%, #002a9e 70%, #001a62 100%)";

type PageWrapperProps = {
  children: React.ReactNode;
  /** Show a Back link at the top of the card (for create/join). */
  showBack?: boolean;
  /** Optional card title below Back (e.g. "Create room"). */
  cardTitle?: string;
};

/** When true, title is at top and card is below (avoids overlap with tall cards). */
const formLayout = (showBack?: boolean) => !!showBack;

export function PageWrapper({
  children,
  showBack = false,
  cardTitle,
}: PageWrapperProps) {
  const isFormLayout = formLayout(showBack);

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-6"
      style={{ background: GRADIENT_BG }}
    >
      <div className="flex-1 min-h-[1rem]" />
      <header className="flex-shrink-0 flex justify-center">
        <Link href="/" className="block">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl text-white drop-shadow-lg text-center"
            style={{ fontFamily: "var(--font-pacifico), cursive" }}
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Housie
          </motion.h1>
        </Link>
      </header>
      <div className="h-5 flex-shrink-0" />
      <motion.div
        className={
          isFormLayout
            ? "w-full max-w-sm flex-shrink-0 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl p-8 max-h-[calc(100vh-14rem)] overflow-y-auto"
            : "w-full max-w-sm flex-shrink-0 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl p-8"
        }
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {showBack && (
          <Link
            href="/"
            className="inline-block text-[#0045f6] hover:underline font-medium text-sm mb-4"
          >
            ← Back
          </Link>
        )}
        {cardTitle && (
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">
            {cardTitle}
          </h2>
        )}
        {children}
      </motion.div>
      <div className="flex-1 min-h-[10rem]" />
    </div>
  );
}
