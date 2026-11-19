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
    timeoutRef.current = null;
    setToast({ id, ...options });
    // A toast with an action (undo, retry, add anyway) stays until it is used
    // or closed: a timer would take the action away from anyone who needs
    // longer to reach it, such as a keyboard user tabbing down to it (WCAG
    // 2.2.1). A newer toast still replaces it.
    if (options.actions?.length) return;
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

      {/* Board style: the forest band as a small floating pill. It rides above
          the bottom bars phones get on Explore and on a place page. */}
      <div
        data-brand
        className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 font-brand lg:bottom-6"
      >
        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
              transition={
                shouldReduceMotion ? { duration: 0.01 } : { type: "spring", duration: 0.3, bounce: 0 }
              }
              className="pointer-events-auto flex max-w-[min(560px,calc(100vw-2rem))] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-forest py-2 pr-2 pl-5 text-on-forest shadow-lift dark:ring-1 dark:ring-line-strong"
            >
              <span className="min-w-0 flex-1 py-2 text-label text-pretty">{toast.message}</span>
              {toast.actions?.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    dismiss();
                  }}
                  className="min-h-10 shrink-0 cursor-pointer rounded-full bg-cmj-sand px-4 text-label text-cmj-green transition-colors duration-150 hover:bg-cmj-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sand"
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={dismiss}
                aria-label={dict.nav.close}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-on-forest-soft transition-colors duration-150 hover:bg-cmj-paper/12 hover:text-on-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sand"
              >
                <X aria-hidden strokeWidth={1.75} className="size-4" />
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
