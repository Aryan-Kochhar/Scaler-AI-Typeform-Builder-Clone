"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Logo({ href = "/workspace" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 text-[22px] font-semibold tracking-[-0.04em] text-brand">
      <span>typeform</span>
      <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
        clone
      </span>
    </Link>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[#3d3d3d] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

/** Spinner that explains the free-tier API cold start if loading takes a while. */
export function Loading({ className = "" }: { className?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className={`flex flex-col items-center gap-3 text-center text-ink-soft ${className}`}>
      <Spinner />
      {slow && <p className="max-w-xs text-sm">Waking up the server — the free hosting tier can take up to a minute on first load.</p>}
    </div>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="rounded-full bg-[#f1ecfe] px-2 py-0.5 text-[11px] font-medium text-accent">Coming soon</span>
  );
}
