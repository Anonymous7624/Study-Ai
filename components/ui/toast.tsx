"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ToastContext = React.createContext<{
  toasts: { id: string; message: string; variant?: "default" | "destructive" }[];
  addToast: (message: string, variant?: "default" | "destructive") => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<
    { id: string; message: string; variant?: "default" | "destructive" }[]
  >([]);

  const addToast = React.useCallback(
    (message: string, variant: "default" | "destructive" = "default") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((p) => [...p, { id, message, variant }]);
      setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border px-4 py-3 shadow-lg",
              t.variant === "destructive"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border bg-background text-foreground"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.addToast;
}
