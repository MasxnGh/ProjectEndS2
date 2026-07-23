"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  actions?: ToastAction[];
  durationMs?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { dict } = useLocale();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  const dismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    idRef.current += 1;
    const id = idRef.current;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ id, ...options });
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, options.durationMs ?? DEFAULT_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div aria-live="polite" role="status" className="sr-only">
        {toast?.message}
      </div>

      <div className="no-print pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-6">
        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
              transition={
                shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 420, damping: 32 }
              }
              className="pointer-events-auto flex max-w-[calc(100vw-3rem)] flex-wrap items-center gap-3 rounded-2xl border border-border bg-background px-5 py-3 shadow-elevated"
            >
              <span className="text-sm text-foreground">{toast.message}</span>
              {toast.actions?.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    dismiss();
                  }}
                  className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground transition-transform duration-200 hover:scale-[1.03]"
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={dismiss}
                aria-label={dict.nav.close}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
