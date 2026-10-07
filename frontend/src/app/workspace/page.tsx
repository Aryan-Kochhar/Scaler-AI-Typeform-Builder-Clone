"use client";

import {
  BarChart3,
  Copy,
  ExternalLink,
  LayoutGrid,
  Link2,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormThumb } from "@/components/workspace/FormThumb";
import { CreateFormModal, RenameModal } from "@/components/workspace/FormModals";
import { TopNav } from "@/components/workspace/TopNav";
import { Loading } from "@/components/ui/Brand";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { ConfirmModal } from "@/components/ui/Modal";
import { api, publicFormUrl } from "@/lib/api";
import type { FormListItem } from "@/lib/types";
import { cn, copyText, timeAgo } from "@/lib/utils";

type SortKey = "updated" | "created" | "title";
const VIEW_KEY = "tf-workspace-view";

function StatusPill({ status }: { status: FormListItem["status"] }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ec] px-2 py-0.5 text-[11px] font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Published
    </span>
  ) : (
    <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink-soft">Draft</span>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<SortKey>("updated");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<FormListItem | null>(null);
  const [deleting, setDeleting] = useState<FormListItem | null>(null);

  const load = () =>
    api
      .listForms()
      .then((f) => {
        setForms(f);
        setLoadError(null);
      })
      .catch((e: Error) => setLoadError(e.message));

  useEffect(() => {
    void load();
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const changeView = (v: "list" | "grid") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const visible = useMemo(() => {
    const list = (forms ?? []).filter((f) => f.title.toLowerCase().includes(query.trim().toLowerCase()));
    return [...list].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "created"
          ? b.created_at.localeCompare(a.created_at)
          : b.updated_at.localeCompare(a.updated_at),
    );
  }, [forms, query, sort]);

  const totalResponses = (forms ?? []).reduce((sum, f) => sum + f.response_count, 0);

  const createForm = async (title: string) => {
    try {
      const form = await api.createForm(title);
      router.push(`/form/${form.id}/create`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const menuFor = (form: FormListItem): MenuItem[] => [
    { label: "Open", icon: <ExternalLink size={15} />, onSelect: () => router.push(`/form/${form.id}/create`) },
    { label: "Results", icon: <BarChart3 size={15} />, onSelect: () => router.push(`/form/${form.id}/results`) },
    {
      label: "Copy link",
      icon: <Link2 size={15} />,
      disabled: form.status !== "published",
      onSelect: async () => {
        if (await copyText(publicFormUrl(form.slug))) toast.success("Link copied to clipboard");
      },
    },
    { label: "Rename", icon: <Pencil size={15} />, onSelect: () => setRenaming(form), divider: true },
    { label: "Duplicate", icon: <Copy size={15} />, onSelect: () => run(() => api.duplicateForm(form.id), "Form duplicated") },
    { label: "Delete", icon: <Trash2 size={15} />, danger: true, divider: true, onSelect: () => setDeleting(form) },
  ];

  const actionMenu = (form: FormListItem) => (
    <Menu
      items={menuFor(form)}
      trigger={({ toggle, open }) => (
        <button
          aria-label="Form actions"
          onClick={toggle}
          className={cn("rounded-md p-1.5 text-ink-soft hover:bg-black/[0.06]", open && "bg-black/[0.06]")}
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white p-4 md:flex">
          <button className="btn-primary !h-10 w-full" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create a new form
          </button>
          <label className="mt-4 flex h-9 items-center gap-2 rounded-lg bg-black/[0.04] px-3 text-sm text-ink-soft">
            <Search size={15} />
            <input
              className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="mt-6 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Workspaces
            <button className="rounded p-0.5 hover:bg-black/5" aria-label="New workspace" onClick={() => toast("Multiple workspaces are coming soon")}>
              <Plus size={14} />
            </button>
          </div>
          <nav className="mt-2 flex flex-col gap-0.5 text-sm">
            <span className="flex items-center justify-between rounded-lg bg-black/[0.06] px-3 py-2 font-medium text-ink">
              My workspace <span className="text-ink-soft">{forms?.length ?? "–"}</span>
            </span>
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-ink-soft hover:bg-black/[0.04]"
              onClick={() => toast("Team collaboration & sharing is coming soon")}
            >
              <Users size={15} /> Shared with me
            </button>
          </nav>
          <div className="mt-auto rounded-xl border border-line p-3.5 text-sm">
            <p className="font-medium text-ink">Responses collected</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, totalResponses)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{totalResponses} / 100 this month · Free plan</p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#fafaf9] px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">My workspace</h1>
              <div className="flex items-center gap-2">
                <button className="btn-primary md:!hidden" onClick={() => setCreateOpen(true)}>
                  <Plus size={16} /> New form
                </button>
                <select
                  aria-label="Sort forms"
                  className="field !h-9 !w-auto pr-8"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="updated">Last updated</option>
                  <option value="created">Date created</option>
                  <option value="title">Alphabetical</option>
                </select>
                <div className="flex rounded-lg border border-line bg-white p-0.5">
                  {(["list", "grid"] as const).map((v) => (
                    <button
                      key={v}
                      aria-label={`${v} view`}
                      onClick={() => changeView(v)}
                      className={cn("rounded-md p-1.5", view === v ? "bg-black/[0.07] text-ink" : "text-ink-faint hover:text-ink")}
                    >
                      {v === "list" ? <List size={16} /> : <LayoutGrid size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loadError ? (
              <div className="rounded-xl border border-line bg-white p-10 text-center">
                <p className="font-medium text-ink">Couldn&apos;t load your forms</p>
                <p className="mt-1 text-sm text-ink-soft">{loadError} The API may be waking up — this can take ~30s.</p>
                <button className="btn-secondary mt-4" onClick={() => void load()}>
                  Try again
                </button>
              </div>
            ) : !forms ? (
              <div className="flex justify-center py-24 text-ink-soft">
                <Loading />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white py-20 text-center">
                <p className="text-lg font-medium text-ink">{query ? "No forms match your search" : "No forms yet"}</p>
                <p className="mt-1 text-sm text-ink-soft">Create your first typeform — it only takes a minute.</p>
                <button className="btn-primary mt-5" onClick={() => setCreateOpen(true)}>
                  <Plus size={16} /> Create a new form
                </button>
              </div>
            ) : view === "list" ? (
              <div className="rounded-xl border border-line bg-white">
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-4 py-2.5 text-xs font-medium text-ink-faint sm:grid-cols-[1fr_110px_140px_40px]">
                  <span>Form</span>
                  <span className="hidden sm:block">Responses</span>
                  <span className="hidden sm:block">Updated</span>
                  <span />
                </div>
                {visible.map((form) => (
                  <div
                    key={form.id}
                    onClick={() => router.push(`/form/${form.id}/create`)}
                    className="group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 hover:bg-[#fafaf9] sm:grid-cols-[1fr_110px_140px_40px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FormThumb theme={form.theme} title={form.title} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">{form.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
                          <StatusPill status={form.status} />
                          <span>{form.question_count} questions</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/form/${form.id}/results`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden text-sm text-ink hover:underline sm:block"
                    >
                      {form.response_count}
                    </Link>
                    <span className="hidden text-sm text-ink-soft sm:block">{timeAgo(form.updated_at)}</span>
                    {actionMenu(form)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((form) => (
                  <div
                    key={form.id}
                    onClick={() => router.push(`/form/${form.id}/create`)}
                    className="cursor-pointer overflow-hidden rounded-xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <FormThumb theme={form.theme} title={form.title} large />
                    <div className="flex items-start justify-between gap-2 border-t border-line p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{form.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
                          <StatusPill status={form.status} />
                          {form.response_count} responses
                        </div>
                      </div>
                      {actionMenu(form)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateFormModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createForm} />
      <RenameModal
        open={!!renaming}
        initial={renaming?.title ?? ""}
        onClose={() => setRenaming(null)}
        onSave={(title) => renaming && run(() => api.renameForm(renaming.id, title), "Form renamed")}
      />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this form?"
        body={
          <>
            <b className="text-ink">{deleting?.title}</b> and all of its {deleting?.response_count ?? 0} responses will be
            permanently deleted. This can&apos;t be undone.
          </>
        }
        onConfirm={() => deleting && run(() => api.deleteForm(deleting.id), "Form deleted")}
      />
    </div>
  );
}
