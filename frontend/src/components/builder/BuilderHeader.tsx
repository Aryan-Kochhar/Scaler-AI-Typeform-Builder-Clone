"use client";

import { Check, ChevronLeft, Cloud, Copy, ExternalLink, Eye, Loader2, MoreHorizontal, Settings, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, ComingSoonBadge } from "@/components/ui/Brand";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { publicFormUrl } from "@/lib/api";
import { cn, copyText } from "@/lib/utils";
import { type SaveState, useFormEditor } from "./FormEditorProvider";
import { PreviewModal } from "./PreviewModal";

const TABS = [
  { slug: "create", label: "Create" },
  { slug: "workflow", label: "Workflow" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
];

function SaveIndicator({ state }: { state: SaveState }) {
  const map = {
    saved: { icon: <Cloud size={14} />, text: "Saved" },
    saving: { icon: <Loader2 size={14} className="animate-spin" />, text: "Saving..." },
    unsaved: { icon: <Cloud size={14} />, text: "Unsaved changes" },
    error: { icon: <TriangleAlert size={14} />, text: "Not saved" },
  }[state];
  return (
    <span className={cn("hidden items-center gap-1.5 text-xs lg:flex", state === "error" ? "text-danger" : "text-ink-faint")}>
      {map.icon}
      {map.text}
    </span>
  );
}

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sections = [
    { title: "Response notifications", text: "Get an email every time someone submits" },
    { title: "Close form on a date", text: "Schedule when to stop accepting responses" },
    { title: "Limit number of responses", text: "Stop collecting after a set number" },
    { title: "Form language", text: "Translate system messages and buttons" },
    { title: "Hidden fields & variables", text: "Pass data in through the URL" },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Form settings" className="max-w-lg">
      <div className="flex flex-col divide-y divide-line">
        {sections.map((s) => (
          <div key={s.title} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{s.title}</p>
              <p className="text-xs text-ink-soft">{s.text}</p>
            </div>
            <ComingSoonBadge />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function BuilderHeader() {
  const { form, saveState, update, publish, unpublish } = useFormEditor();
  const pathname = usePathname();
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishedOpen, setPublishedOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const active = TABS.find((t) => pathname.endsWith(`/${t.slug}`))?.slug ?? "create";
  const link = publicFormUrl(form.slug);

  const onPublish = async () => {
    setPublishing(true);
    const ok = await publish();
    setPublishing(false);
    if (ok) setPublishedOpen(true);
  };

  return (
    <>
      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-white px-3">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/workspace" className="btn-ghost shrink-0" aria-label="Back to workspace">
            <ChevronLeft size={18} />
            <span className="hidden xl:inline">My workspace</span>
          </Link>
          <span className="hidden text-ink-faint xl:inline">/</span>
          <input
            aria-label="Form title"
            className="min-w-0 max-w-[260px] flex-1 truncate rounded-md px-2 py-1 text-sm font-medium text-ink outline-none hover:bg-black/[0.04] focus:bg-black/[0.04]"
            value={form.title}
            maxLength={255}
            onChange={(e) => update((f) => ({ ...f, title: e.target.value }))}
            onBlur={(e) => !e.target.value.trim() && update((f) => ({ ...f, title: "Untitled form" }))}
          />
          <SaveIndicator state={saveState} />
        </div>

        <nav className="flex h-full items-stretch">
          {TABS.map((tab) => (
            <Link
              key={tab.slug}
              href={`/form/${form.id}/${tab.slug}`}
              className={cn(
                "relative flex items-center px-2.5 text-sm transition sm:px-3.5",
                active === tab.slug ? "font-medium text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {tab.label}
              {active === tab.slug && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ink" />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          <button className="btn-ghost" aria-label="Form settings" onClick={() => setSettingsOpen(true)}>
            <Settings size={17} />
          </button>
          <button className="btn-ghost" aria-label="Preview" onClick={() => setPreviewOpen(true)}>
            <Eye size={17} />
            <span className="hidden lg:inline">Preview</span>
          </button>
          {form.status === "published" ? (
            <Menu
              items={[
                {
                  label: "Copy link",
                  icon: <Copy size={15} />,
                  onSelect: async () => (await copyText(link)) && toast.success("Link copied"),
                },
                { label: "Open live form", icon: <ExternalLink size={15} />, onSelect: () => window.open(link, "_blank") },
                { label: "Unpublish", onSelect: () => void unpublish(), danger: true, divider: true },
              ]}
              trigger={({ toggle }) => (
                <button className="btn-secondary !h-8 !px-3" onClick={toggle}>
                  <span className="h-2 w-2 rounded-full bg-success" /> Published <MoreHorizontal size={15} />
                </button>
              )}
            />
          ) : (
            <button className="btn-primary !h-8 !px-3.5" disabled={publishing} onClick={onPublish}>
              {publishing ? "Publishing..." : "Publish"}
            </button>
          )}
          <span className="ml-1 hidden sm:inline-flex">
            <Avatar name="Aryan Kochhar" size={28} />
          </span>
        </div>
      </header>

      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} form={form} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Modal open={publishedOpen} onClose={() => setPublishedOpen(false)} className="max-w-lg">
        <div className="flex flex-col items-center pt-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f4ec] text-success">
            <Check size={24} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink">Your typeform is live!</h2>
          <p className="mt-1 text-sm text-ink-soft">Anyone with the link can now respond — no login needed.</p>
          <div className="mt-5 flex w-full gap-2">
            <input readOnly className="field !h-10" value={link} onFocus={(e) => e.target.select()} />
            <button
              className="btn-primary !h-10 shrink-0"
              onClick={async () => (await copyText(link)) && toast.success("Link copied")}
            >
              <Copy size={15} /> Copy
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <a className="btn-secondary" href={link} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Open form
            </a>
            <button
              className="btn-secondary"
              onClick={() => {
                setPublishedOpen(false);
                router.push(`/form/${form.id}/share`);
              }}
            >
              More sharing options
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
