"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FormRenderer } from "@/components/renderer/FormRenderer";
import type { PublicForm } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Full-screen live preview of the form being edited (nothing is submitted). */
export function PreviewModal({ open, onClose, form }: { open: boolean; onClose: () => void; form: PublicForm }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    // Keystrokes belong to the preview, not to whichever builder field had focus.
    (document.activeElement as HTMLElement | null)?.blur();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-[#2b2b2b]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div data-builder-chrome className="flex h-12 shrink-0 items-center justify-between px-4 text-white">
            <span className="text-sm font-medium">Preview</span>
            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-0.5">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  aria-label={`${d} preview`}
                  onClick={() => setDevice(d)}
                  className={cn("rounded-md p-1.5", device === d ? "bg-white text-black" : "text-white/70 hover:text-white")}
                >
                  {d === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10" onClick={() => setRunKey((k) => k + 1)}>
                <RotateCcw size={14} /> Restart
              </button>
              <button aria-label="Close preview" className="rounded-md p-1.5 text-white/80 hover:bg-white/10" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-3 pt-0">
            <div
              className={cn(
                "overflow-hidden bg-white shadow-2xl transition-all",
                device === "desktop" ? "h-full w-full rounded-lg" : "h-[min(760px,100%)] w-[375px] rounded-[28px] ring-8 ring-black",
              )}
            >
              <FormRenderer key={`${runKey}-${device}`} form={form} mode="preview" embedded />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
