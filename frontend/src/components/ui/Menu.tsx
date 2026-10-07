"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

/** Small click-to-open dropdown menu (the "..." menus across the app). */
export function Menu({
  trigger,
  items,
  align = "right",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-40 mt-1 min-w-[200px] rounded-lg border border-line bg-white py-1.5 shadow-lg",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {items.map((item) => (
              <div key={item.label}>
                {item.divider && <div className="my-1.5 border-t border-line" />}
                <button
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-black/[0.04] disabled:opacity-40",
                    item.danger ? "text-danger" : "text-ink",
                  )}
                >
                  {item.icon && <span className="flex w-4 justify-center opacity-80">{item.icon}</span>}
                  {item.label}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
