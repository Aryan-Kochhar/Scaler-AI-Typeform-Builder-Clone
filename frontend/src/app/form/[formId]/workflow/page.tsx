"use client";

import { Calculator, CornerDownRight, GitBranch, Variable } from "lucide-react";
import Link from "next/link";
import { TypeChip } from "@/components/builder/AddContentModal";
import { useFormEditor } from "@/components/builder/FormEditorProvider";
import { ComingSoonBadge } from "@/components/ui/Brand";
import { END, supportsJumps } from "@/lib/logic";
import type { Question } from "@/lib/types";
import { letterFor } from "@/lib/utils";

function answerOptions(q: Question): { key: string; label: string; letter: string }[] {
  if (q.type === "yes_no")
    return [
      { key: "yes", label: "Yes", letter: "Y" },
      { key: "no", label: "No", letter: "N" },
    ];
  return q.choices.map((c, i) => ({ key: c.id, label: c.label || `Choice ${i + 1}`, letter: letterFor(i) }));
}

function JumpRules({ question, index }: { question: Question; index: number }) {
  const { form, updateQuestion } = useFormEditor();
  const jumps = question.properties.jumps ?? {};
  const later = form.questions.slice(index + 1);
  // A jump whose target was deleted or moved above this question is ignored at runtime ("next question").
  const validTargets = new Set([END, ...later.map((q) => q.id)]);

  const setJump = (key: string, target: string) => {
    const next = { ...jumps };
    if (target) next[key] = target;
    else delete next[key];
    updateQuestion(question.id, { properties: { ...question.properties, jumps: next } });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start gap-3">
        <TypeChip type={question.type} number={index + 1} />
        <p className="font-medium text-ink">{question.title || "Untitled question"}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {answerOptions(question).map((option) => (
          <div key={option.key} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-14 shrink-0 text-ink-soft">If answer is</span>
            <span className="flex min-w-0 max-w-[220px] items-center gap-2 rounded-md bg-[#f1ecfe] px-2 py-1 text-ink">
              <span className="text-[11px] font-semibold text-accent">{option.letter}</span>
              <span className="truncate">{option.label}</span>
            </span>
            <CornerDownRight size={15} className="text-ink-faint" />
            <span className="text-ink-soft">go to</span>
            <select
              className="field !h-8 !w-auto max-w-[260px] flex-1"
              value={validTargets.has(jumps[option.key]) ? jumps[option.key] : ""}
              onChange={(e) => setJump(option.key, e.target.value)}
            >
              <option value="">Next question</option>
              {later.map((q) => (
                <option key={q.id} value={q.id}>
                  {form.questions.indexOf(q) + 1}. {q.title || "Untitled"}
                </option>
              ))}
              <option value={END}>End (thank you screen)</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  const { form } = useFormEditor();
  const branchable = form.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question, index }) => supportsJumps(question) && index < form.questions.length);

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1ecfe] text-accent">
            <GitBranch size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Logic jumps</h1>
            <p className="text-sm text-ink-soft">Send people to different questions based on their answers.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {branchable.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-ink-soft">
              Add a single-select <b>Multiple Choice</b>, <b>Dropdown</b> or <b>Yes/No</b> question to create logic jumps.{" "}
              <Link href={`/form/${form.id}/create`} className="text-ink underline">
                Go to Create
              </Link>
            </div>
          ) : (
            branchable.map(({ question, index }) => <JumpRules key={question.id} question={question} index={index} />)
          )}
        </div>

        <p className="mt-3 text-xs text-ink-faint">
          Jumps only go forward. Questions that are skipped aren&apos;t required and aren&apos;t stored.
        </p>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {[
            { icon: Calculator, label: "Scoring & calculations" },
            { icon: Variable, label: "Variables & hidden fields" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-ink">
                <Icon size={16} /> {label}
              </span>
              <ComingSoonBadge />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
