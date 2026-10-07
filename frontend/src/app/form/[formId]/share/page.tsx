"use client";

import { Code2, Copy, ExternalLink, Mail, MessageSquare, PanelRight, QrCode, SquareStack } from "lucide-react";
import { toast } from "sonner";
import { useFormEditor } from "@/components/builder/FormEditorProvider";
import { ComingSoonBadge } from "@/components/ui/Brand";
import { publicFormUrl } from "@/lib/api";
import { copyText } from "@/lib/utils";

const EMBEDS = [
  { icon: SquareStack, title: "Standard", text: "Embed inline on a page" },
  { icon: PanelRight, title: "Slider", text: "Slides in from the side" },
  { icon: MessageSquare, title: "Popover", text: "Floating chat-style button" },
  { icon: Code2, title: "Full page", text: "Takes over the whole page" },
];

export default function SharePage() {
  const { form, publish } = useFormEditor();
  const link = publicFormUrl(form.slug);
  const live = form.status === "published";

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Share your form</h1>
        <p className="mt-1 text-sm text-ink-soft">Anyone with the link can respond — no account required.</p>

        {!live && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3d9a4] bg-[#fff8e8] p-4">
            <p className="text-sm text-[#7a5300]">This form is a draft. Publish it to start collecting responses.</p>
            <button
              className="btn-primary !h-8"
              onClick={async () => {
                if (await publish()) toast.success("Your form is live!");
              }}
            >
              Publish
            </button>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-line bg-white p-5">
          <p className="label">Share link</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly className="field !h-10 font-mono !text-[13px]" value={link} onFocus={(e) => e.target.select()} />
            <button
              className="btn-primary !h-10 shrink-0"
              disabled={!live}
              onClick={async () => (await copyText(link)) && toast.success("Link copied to clipboard")}
            >
              <Copy size={15} /> Copy link
            </button>
            <a
              className={`btn-secondary !h-10 shrink-0 ${live ? "" : "pointer-events-none opacity-50"}`}
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} /> Open
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="label">Embed in a web page</p>
            <ComingSoonBadge />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EMBEDS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-line p-3 opacity-70">
                <Icon size={18} className="text-ink-soft" />
                <p className="mt-2 text-sm font-medium text-ink">{title}</p>
                <p className="text-xs text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: Mail, title: "Send by email" },
            { icon: QrCode, title: "QR code" },
          ].map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center justify-between rounded-xl border border-line bg-white p-4">
              <span className="flex items-center gap-2 text-sm text-ink">
                <Icon size={16} /> {title}
              </span>
              <ComingSoonBadge />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
