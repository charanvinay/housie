"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ModalOptions = {
  title: string;
  description: string;
  onOk: () => void | Promise<void>;
  onCancel: () => void;
  okText?: string;
  cancelText?: string;
};

type ModalContextValue = {
  info: (options: ModalOptions) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return ctx;
}

type ModalState = {
  open: boolean;
  options: ModalOptions | null;
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ open: false, options: null });
  const closingRef = useRef(false);
  const optionsRef = useRef<ModalOptions | null>(null);
  if (state.open && state.options) optionsRef.current = state.options;

  const info = useCallback((options: ModalOptions) => {
    setState({ open: true, options });
  }, []);

  const close = useCallback(() => {
    setState((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  const handleOk = useCallback(async () => {
    const opts = optionsRef.current;
    if (!opts || closingRef.current) return;
    closingRef.current = true;
    try {
      await opts.onOk();
      close();
    } finally {
      closingRef.current = false;
    }
  }, [close]);

  const handleCancel = useCallback(() => {
    if (closingRef.current) return;
    optionsRef.current?.onCancel();
    close();
  }, [close]);

  return (
    <ModalContext.Provider value={{ info }}>
      {children}
      <AnimatePresence>
        {state.open && state.options && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancel}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-labelledby="modal-title"
              aria-describedby="modal-description"
              className="relative z-10 w-full max-w-sm rounded-2xl border-2 border-accent/30 bg-cardBg p-6 shadow-xl"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="modal-title"
                className="text-lg font-semibold text-theme-primary"
              >
                {state.options.title}
              </h2>
              <p
                id="modal-description"
                className="mt-2 text-sm text-theme-muted"
              >
                {state.options.description}
              </p>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border-2 border-accent/30 bg-inputBg px-4 py-2 text-sm font-medium text-theme-primary hover:border-accent/50"
                >
                  {state.options.cancelText ?? "No"}
                </button>
                <button
                  type="button"
                  onClick={handleOk}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {state.options.okText ?? "Yes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}
