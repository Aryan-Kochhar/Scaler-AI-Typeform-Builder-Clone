"use client";

import { FileText, LayoutTemplate, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { ComingSoonBadge } from "@/components/ui/Brand";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export function CreateFormModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  const options = [
    { icon: FileText, title: "Start from scratch", text: "Build your form question by question", enabled: true },
    { icon: LayoutTemplate, title: "Use a template", text: "Pick from 3,000+ ready-made forms" },
    { icon: Sparkles, title: "Create with AI", text: "Describe it and let AI draft it" },
    { icon: Upload, title: "Import questions", text: "Paste from Google Forms or a doc" },
  ];

  const submit = async () => {
    setBusy(true);
    try {
      await onCreate(title.trim() || "My new form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a new form" className="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(({ icon: Icon, title: label, text, enabled }) => (
          <div
            key={label}
            className={cn(
              "rounded-xl border p-4 transition",
              enabled ? "border-ink bg-[#fafaf9] shadow-[0_0_0_1px_var(--color-ink)]" : "border-line opacity-70",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1ecfe] text-accent">
                <Icon size={18} />
              </span>
              {!enabled && <ComingSoonBadge />}
            </div>
            <p className="font-medium text-ink">{label}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{text}</p>
          </div>
        ))}
      </div>
      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          autoFocus
          className="field !h-10"
          placeholder="Give your form a name"
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="btn-primary !h-10 shrink-0" disabled={busy}>
          {busy ? "Creating..." : "Create form"}
        </button>
      </form>
    </Modal>
  );
}

export function RenameModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  const save = () => {
    if (!value.trim()) return;
    onSave(value.trim());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rename form"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!value.trim()} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <input
        autoFocus
        className="field"
        value={value}
        maxLength={255}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
    </Modal>
  );
}
