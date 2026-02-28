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
import { FaCheckCircle } from "react-icons/fa";

const TOAST_DURATION_MS = 2500;

export type ToastVariant = "default" | "success";

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
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
  variant: ToastVariant;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({
    message: null,
    id: 0,
    variant: "default",
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState((prev) => ({ message, id: prev.id + 1, variant }));
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setState((prev) =>
          prev.message === message
            ? { message: null, id: prev.id, variant: prev.variant }
            : prev
        );
      }, TOAST_DURATION_MS);
    },
    []
  );

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
            <div
              className={`flex items-center gap-2 rounded-4xl px-4 py-2.5 text-sm font-medium shadow-lg ${
                state.variant === "success"
                  ? "border-3 border-green-600 bg-white text-black"
                  : "bg-slate-800/95 text-white ring-1 ring-white/10"
              }`}
            >
              {state.variant === "success" && (
                <FaCheckCircle
                  className="size-5 shrink-0 text-green-600"
                  aria-hidden
                />
              )}
              {state.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
