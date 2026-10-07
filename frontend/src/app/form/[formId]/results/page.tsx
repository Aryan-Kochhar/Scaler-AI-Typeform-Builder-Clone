"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TypeChip } from "@/components/builder/AddContentModal";
import { useFormEditor } from "@/components/builder/FormEditorProvider";
import { Loading } from "@/components/ui/Brand";
import { ConfirmModal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import type { FormSummary, Question, QuestionSummary, ResponseOut } from "@/lib/types";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function Bars({ items }: { items: NonNullable<QuestionSummary["choices"]> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.label + item.id}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-ink">{item.label}</span>
            <span className="shrink-0 text-ink-soft">
              {item.percent}% · {item.count}
            </span>
          </div>
          <div className="h-7 overflow-hidden rounded-md bg-[#f1f0ee]">
            <motion.div
              className="h-full rounded-md bg-accent/80"
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / max) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionSummaryCard({ summary, index, question }: { summary: QuestionSummary; index: number; question?: Question }) {
  const total = summary.answered + summary.skipped;
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="flex items-start gap-3">
        <TypeChip type={summary.type} number={index + 1} />
        <div className="min-w-0">
          <p className="font-medium text-ink">{summary.title || "Untitled question"}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {summary.answered} out of {total} people answered this question
          </p>
        </div>
      </div>
      <div className="mt-5">
        {summary.type === "rating" && summary.average != null && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-3xl font-semibold text-ink">{summary.average}</span>
            <span className="flex text-[#f5a623]">
              {Array.from({ length: question?.properties.steps ?? 5 }, (_, i) => (
                <Star key={i} size={18} fill={i < Math.round(summary.average!) ? "currentColor" : "none"} />
              ))}
            </span>
            <span className="text-sm text-ink-soft">average rating</span>
          </div>
        )}
        {summary.type === "number" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Average", summary.average],
              ["Min", summary.minimum],
              ["Max", summary.maximum],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-[#f7f6f4] p-3">
                <p className="text-xs text-ink-soft">{label}</p>
                <p className="text-xl font-semibold text-ink">{value ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
        {summary.choices && <Bars items={summary.choices} />}
        {summary.latest &&
          (summary.latest.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-ink-faint">Latest responses</p>
              {summary.latest.map((text, i) => (
                <p key={i} className="rounded-lg bg-[#f7f6f4] px-3 py-2 text-sm text-ink">
                  {text}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">No answers yet</p>
          ))}
      </div>
    </div>
  );
}

function ResponseDrawer({
  formId,
  response,
  questions,
  onClose,
  onDelete,
}: {
  formId: string;
  response: ResponseOut | null;
  questions: Question[];
  onClose: () => void;
  onDelete: (r: ResponseOut) => void;
}) {
  const answers = new Map(response?.answers.map((a) => [a.question_id, a]));
  return (
    <AnimatePresence>
      {response && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-medium text-ink">Response</p>
                <p className="text-xs text-ink-soft">Submitted {formatDateTime(response.submitted_at)}</p>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost !text-danger" aria-label="Delete response" onClick={() => onDelete(response)}>
                  <Trash2 size={16} />
                </button>
                <button className="btn-ghost" aria-label="Close" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
              {questions.map((q, i) => {
                const answer = answers.get(q.id);
                return (
                  <div key={q.id} className="border-b border-line py-4 last:border-0">
                    <div className="flex items-center gap-2">
                      <TypeChip type={q.type} number={i + 1} size={20} />
                      <p className="text-sm text-ink-soft">{q.title}</p>
                    </div>
                    {answer?.file_id ? (
                      <a
                        href={api.fileUrl(formId, answer.file_id)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[15px] text-ink hover:bg-black/[0.03]"
                      >
                        <Download size={15} /> {answer.display}
                      </a>
                    ) : (
                      <p className={cn("mt-2 whitespace-pre-wrap text-[15px]", answer ? "text-ink" : "text-ink-faint")}>
                        {answer?.display || "No answer"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ResultsPage() {
  const { form } = useFormEditor();
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const [summary, setSummary] = useState<FormSummary | null>(null);
  const [responses, setResponses] = useState<ResponseOut[] | null>(null);
  const [open, setOpen] = useState<ResponseOut | null>(null);
  const [deleting, setDeleting] = useState<ResponseOut | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([api.getSummary(form.id), api.listResponses(form.id)]);
      setSummary(s);
      setResponses(r.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [form.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!responses || !q) return responses ?? [];
    return responses.filter((r) => r.answers.some((a) => a.display.toLowerCase().includes(q)));
  }, [responses, query]);

  const deleteResponse = async (r: ResponseOut) => {
    try {
      await api.deleteResponse(form.id, r.id);
      toast.success("Response deleted");
      setOpen(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const questionById = new Map(form.questions.map((q) => [q.id, q]));

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-line bg-white px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex">
            {(["summary", "responses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("relative px-3 py-3 text-sm capitalize", tab === t ? "font-medium text-ink" : "text-ink-soft hover:text-ink")}
              >
                {t}
                {t === "responses" && responses && <span className="ml-1.5 rounded-full bg-black/[0.06] px-1.5 text-xs">{responses.length}</span>}
                {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ink" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => void load()} aria-label="Refresh">
              <RefreshCw size={15} />
            </button>
            <a className="btn-secondary !h-8" href={api.csvUrl(form.id)} download>
              <Download size={14} /> Export CSV
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {error ? (
          <div className="rounded-xl border border-line bg-white p-10 text-center">
            <p className="text-ink">{error}</p>
            <button className="btn-secondary mt-4" onClick={() => void load()}>
              Try again
            </button>
          </div>
        ) : !summary || !responses ? (
          <div className="flex justify-center py-24 text-ink-soft">
            <Loading />
          </div>
        ) : tab === "summary" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Views" value={summary.views} />
              <Stat label="Starts" value={summary.starts} />
              <Stat label="Submissions" value={summary.submissions} />
              <Stat label="Completion rate" value={summary.completion_rate != null ? `${summary.completion_rate}%` : "—"} />
              <Stat label="Time to complete" value={formatDuration(summary.average_time_seconds)} />
            </div>
            {summary.submissions === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
                <p className="font-medium text-ink">No responses yet</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {form.status === "published" ? "Share your form link to start collecting answers." : "Publish your form to start collecting answers."}
                </p>
              </div>
            )}
            {summary.submissions > 0 &&
              summary.questions.map((q, i) => (
                <QuestionSummaryCard key={q.question_id} summary={q} index={i} question={questionById.get(q.question_id)} />
              ))}
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-line bg-white px-3 text-ink-soft focus-within:border-ink">
                <Search size={15} />
                <input
                  className="w-full bg-transparent text-sm text-ink outline-none"
                  placeholder="Search responses"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <span className="text-sm text-ink-soft">
                {filtered.length} response{filtered.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="scrollbar-thin overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full min-w-max text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-soft">
                    <th className="sticky left-0 bg-white px-4 py-3 font-medium">Submitted</th>
                    {form.questions.map((q, i) => (
                      <th key={q.id} className="max-w-[220px] px-4 py-3 font-medium">
                        <span className="flex items-center gap-2">
                          <TypeChip type={q.type} number={i + 1} size={20} />
                          <span className="truncate">{q.title || "Untitled"}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const byQ = new Map(r.answers.map((a) => [a.question_id, a.display]));
                    return (
                      <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer border-b border-line last:border-0 hover:bg-[#fafaf9]">
                        <td className="sticky left-0 whitespace-nowrap bg-inherit px-4 py-3 text-ink-soft">{formatDateTime(r.submitted_at)}</td>
                        {form.questions.map((q) => (
                          <td key={q.id} className="max-w-[220px] truncate px-4 py-3 text-ink">
                            {byQ.get(q.id) || <span className="text-ink-faint">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={form.questions.length + 1} className="px-4 py-12 text-center text-ink-soft">
                        No responses to show
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ResponseDrawer formId={form.id} response={open} questions={form.questions} onClose={() => setOpen(null)} onDelete={setDeleting} />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this response?"
        body="This response will be permanently removed from your results."
        onConfirm={() => deleting && void deleteResponse(deleting)}
      />
    </div>
  );
}
