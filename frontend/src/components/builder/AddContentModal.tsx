"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { QUESTION_GROUPS, QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

export function TypeChip({ type, number, size = 24 }: { type: QuestionType; number?: number; size?: number }) {
  const meta = QUESTION_TYPES[type];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 text-[#262627]"
      style={{ background: meta.color, height: size, minWidth: size }}
    >
      <Icon size={size * 0.55} strokeWidth={2} />
      {number !== undefined && <span className="text-xs font-semibold">{number}</span>}
    </span>
  );
}

export function AddContentModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <Modal open={open} onClose={onClose} title="Add content" className="max-w-4xl">
      <label className="mb-5 flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-ink-soft focus-within:border-ink">
        <Search size={16} />
        <input
          autoFocus
          className="w-full bg-transparent text-sm text-ink outline-none"
          placeholder="Search question types"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="scrollbar-thin grid max-h-[60vh] grid-cols-1 gap-x-6 gap-y-5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {QUESTION_GROUPS.map((group) => {
          const types = group.types.filter((t) => QUESTION_TYPES[t].label.toLowerCase().includes(q));
          const soon = (group.comingSoon ?? []).filter((l) => l.toLowerCase().includes(q));
          if (!types.length && !soon.length) return null;
          return (
            <div key={group.title}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">{group.title}</p>
              <div className="flex flex-col gap-0.5">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onPick(type);
                      onClose();
                      setQuery("");
                    }}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-ink hover:bg-black/[0.05]"
                  >
                    <TypeChip type={type} />
                    <span className="flex-1">{QUESTION_TYPES[type].label}</span>
                  </button>
                ))}
                {soon.map((label) => (
                  <button
                    key={label}
                    onClick={() => toast(`${label} is coming soon`)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-ink-faint hover:bg-black/[0.03]"
                  >
                    <span className="h-6 w-6 rounded-md bg-black/[0.06]" />
                    <span className="flex-1">{label}</span>
                    <span className="text-[11px]">Soon</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
