"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiChevronLeft } from "react-icons/fi";
import { IconButton } from "@/components/IconButton";
import { GRADIENT_BG } from "@/lib/theme";

const exitTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
/** Title: entered from top (y -32), so exit back up and fade. */
const titleExit = { opacity: 0, y: -32 };
/** Card: entered scale 0→1, so exit scale 1→0 and fade. */
const cardExit = { opacity: 0, scale: 0 };

type PageWrapperProps = {
  children: React.ReactNode;
  /** Show a Back link at the top of the card (for create/join). */
  showBack?: boolean;
  /** Optional card title below Back (e.g. "Create room"). */
  cardTitle?: string;
  /** When true, run exit animation (title + card hide). */
  exiting?: boolean;
  /** Called when exit animation completes. */
  onExitComplete?: () => void;
  /** If provided, Back button calls this instead of linking to /. Use for exit-then-navigate. */
  onBackClick?: () => void;
};

/** When true, title is at top and card is below (avoids overlap with tall cards). */
const formLayout = (showBack?: boolean) => !!showBack;

export function PageWrapper({
  children,
  showBack = false,
  cardTitle,
  exiting = false,
  onExitComplete,
  onBackClick,
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
            animate={exiting ? titleExit : { opacity: 1, y: 0 }}
            transition={
              exiting
                ? exitTransition
                : { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
            }
          >
            Housie
          </motion.h1>
        </Link>
      </header>
      <div className="h-5 shrink-0" />
      <motion.div
        className={
          isFormLayout
            ? "w-full max-w-sm shrink-0 rounded-2xl backdrop-blur-sm shadow-2xl p-8 max-h-[calc(100vh-14rem)] overflow-y-auto bg-cardBg"
            : "w-full max-w-sm shrink-0 rounded-2xl backdrop-blur-sm shadow-2xl p-8 bg-cardBg"
        }
        initial={{ opacity: 0, scale: 0 }}
        animate={exiting ? cardExit : { opacity: 1, scale: 1 }}
        transition={
          exiting
            ? exitTransition
            : { duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }
        }
        onAnimationComplete={() => {
          if (exiting) onExitComplete?.();
        }}
      >
        {(showBack || cardTitle) && (
          <div className="flex flex-row items-center gap-3 mb-4">
            {showBack ? (
              onBackClick ? (
                <IconButton
                  type="button"
                  onClick={onBackClick}
                  icon={
                    <FiChevronLeft
                      className="size-5 shrink-0"
                      strokeWidth={2.5}
                    />
                  }
                  aria-label="Back to home"
                />
              ) : (
                <IconButton
                  href="/"
                  icon={
                    <FiChevronLeft
                      className="size-5 shrink-0"
                      strokeWidth={2.5}
                    />
                  }
                  aria-label="Back to home"
                />
              )
            ) : (
              <span className="w-10" aria-hidden />
            )}
            {cardTitle ? (
              <h2 className="flex-1 text-xl font-semibold text-theme-primary text-center">
                {cardTitle}
              </h2>
            ) : (
              <span className="flex-1" aria-hidden />
            )}
            <span className="w-10" aria-hidden />
          </div>
        )}
        {children}
      </motion.div>
      <div className="flex-1 min-h-[10rem]" />
    </div>
  );
}
