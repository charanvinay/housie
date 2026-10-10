"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiDownload, FiShare, FiX } from "react-icons/fi";
import { useToast } from "@/components/Toast";
import { Sounds } from "@/lib/sounds";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already running as installed standalone PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as unknown as { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  if (isStandalone || dismissed) return null;

  // Show if browser fired install prompt OR on iOS Safari
  const canPrompt = Boolean(deferredPrompt || isIos);
  if (!canPrompt) return null;

  const handleInstallClick = async () => {
    Sounds.mouseClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.show("Housie app installed successfully!", "success");
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mt-6 flex flex-col items-center w-full"
      >
        <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-accent/40 shadow-lg backdrop-blur-md max-w-sm w-full">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-3 text-left flex-1 min-w-0 group cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="Housie"
              className="size-11 rounded-xl object-cover shrink-0 shadow-md border border-white/15 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white group-hover:text-yellow transition-colors leading-tight">
                Install Housie App
              </p>
              <p className="text-xs text-theme-muted truncate">
                Download for quick access & fullscreen play
              </p>
            </div>
            <div className="size-8 rounded-lg bg-yellow/15 text-yellow flex items-center justify-center shrink-0 border border-yellow/30 group-hover:bg-yellow group-hover:text-slate-950 transition-colors">
              <FiDownload className="size-4" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              Sounds.mouseClick();
              setDismissed(true);
            }}
            className="text-theme-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <FiX className="size-4" />
          </button>
        </div>
      </motion.div>

      {/* iOS Safari instructions modal */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-10002 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl bg-roomCard border-2 border-yellow/80 p-6 shadow-2xl text-center space-y-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-192.png"
                alt="Housie"
                className="size-16 mx-auto rounded-2xl shadow-xl border border-white/20"
              />
              <h3 className="text-lg font-bold text-white">Install Housie on iOS</h3>
              <p className="text-sm text-theme-muted">
                1. Tap the <strong className="text-white">Share</strong> button
                at the bottom of Safari.
                <br />
                2. Scroll down and tap{" "}
                <strong className="text-yellow">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  Sounds.mouseClick();
                  setShowIosGuide(false);
                }}
                className="w-full py-2.5 rounded-xl font-bold bg-yellow text-slate-950 hover:bg-yellow/90 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
