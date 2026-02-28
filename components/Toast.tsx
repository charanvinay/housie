"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOAST_DURATION_MS = 2500;

type ToastContextValue = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

type ToastState = {
  message: string | null;
  id: number;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: null, id: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState((prev) => ({ message, id: prev.id + 1 }));
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setState((prev) => (prev.message === message ? { message: null, id: prev.id } : prev));
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <AnimatePresence>
        {state.message && (
          <motion.div
            key={state.id}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed left-1/2 top-6 z-10001 -translate-x-1/2"
          >
            <div className="rounded-lg bg-slate-800/95 px-4 py-2.5 text-sm font-medium text-white shadow-lg ring-1 ring-white/10">
              {state.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
