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

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const show = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);

      const timeoutId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutsRef.current.delete(id);
      }, TOAST_DURATION_MS);

      timeoutsRef.current.set(id, timeoutId);
    },
    []
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed left-1/2 top-6 z-10001 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="pointer-events-auto"
            >
              <div
                className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-xl backdrop-blur-md ${
                  toast.variant === "success"
                    ? "border-2 border-green-500 bg-white text-slate-900 shadow-green-950/20"
                    : "bg-slate-800/95 text-white ring-1 ring-white/10"
                }`}
              >
                {toast.variant === "success" && (
                  <FaCheckCircle
                    className="size-4.5 shrink-0 text-green-600"
                    aria-hidden
                  />
                )}
                <span>{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
