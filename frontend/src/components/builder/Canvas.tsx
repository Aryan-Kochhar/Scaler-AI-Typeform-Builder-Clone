"use client";

import { ArrowRight, Check, ChevronDown, Clock, Monitor, Plus, Smartphone, Star, Upload, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChoiceBox } from "@/components/renderer/inputs";
import { themeStyle } from "@/lib/themes";
import type { Question } from "@/lib/types";
import { cn, letterFor, uid } from "@/lib/utils";
import { useFormEditor } from "./FormEditorProvider";

/** Textarea that grows with its content and looks like plain text. */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn("tf-inline-edit", className)}
    />
  );
}

function ChoicesEditor({ question }: { question: Question }) {
  const { updateQuestion } = useFormEditor();
  const [focusId, setFocusId] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (focusId) inputs.current[focusId]?.focus();
  }, [focusId, question.choices.length]);

  const setChoices = (choices: Question["choices"]) => updateQuestion(question.id, { choices });

  const addAfter = (index: number) => {
    const choice = { id: uid(), label: "" };
    const choices = [...question.choices];
    choices.splice(index + 1, 0, choice);
    setChoices(choices);
    setFocusId(choice.id);
  };

  return (
    <div className="flex w-fit min-w-[min(100%,280px)] max-w-full flex-col gap-2">
      {question.properties.allow_multiple && <p className="mb-1 text-sm tf-subtle">Choose as many as you like</p>}
      {question.choices.map((choice, i) => (
        <div key={choice.id} className="tf-choice group !py-1">
          <span className="tf-key">{letterFor(i)}</span>
          <input
            ref={(el) => {
              inputs.current[choice.id] = el;
            }}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-50"
            style={{ color: "inherit" }}
            value={choice.label}
            placeholder={`Choice ${i + 1}`}
            size={Math.max(8, choice.label.length + 1)}
            onChange={(e) =>
              setChoices(question.choices.map((c) => (c.id === choice.id ? { ...c, label: e.target.value } : c)))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAfter(i);
              } else if (e.key === "Backspace" && !choice.label && question.choices.length > 1) {
                e.preventDefault();
                setChoices(question.choices.filter((c) => c.id !== choice.id));
                setFocusId(question.choices[Math.max(0, i - 1)].id);
              }
            }}
          />
          {question.choices.length > 1 && (
            <button
              aria-label="Remove choice"
              className="rounded p-0.5 opacity-0 transition group-hover:opacity-70 hover:!opacity-100"
              onClick={() => setChoices(question.choices.filter((c) => c.id !== choice.id))}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      <button
        className="mt-1 flex w-fit items-center gap-1 text-base underline-offset-4 tf-answer-text hover:underline"
        onClick={() => addAfter(question.choices.length - 1)}
      >
        <Plus size={16} /> Add choice
      </button>
    </div>
  );
}

function AnswerPreview({ question }: { question: Question }) {
  switch (question.type) {
    case "multiple_choice":
      return <ChoicesEditor question={question} />;
    case "dropdown":
      return (
        <div className="flex flex-col gap-5">
          <div className="pointer-events-none relative">
            <input disabled className="tf-input" placeholder="Type or select an option" />
            <ChevronDown className="absolute right-0 top-1 h-7 w-7 tf-answer-text" />
          </div>
          <ChoicesEditor question={question} />
        </div>
      );
    case "yes_no":
      return (
        <div className="pointer-events-none flex w-fit min-w-[200px] flex-col gap-2">
          <ChoiceBox letter="Y" label="Yes" />
          <ChoiceBox letter="N" label="No" />
        </div>
      );
    case "rating": {
      const steps = question.properties.steps ?? 5;
      return question.properties.shape === "number" ? (
        <div className="pointer-events-none flex max-w-[640px] gap-2">
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className="tf-choice !justify-center !px-0">
              {i + 1}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 tf-answer-text">
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className="flex flex-col items-center gap-1">
              <Star className="h-10 w-10" strokeWidth={1.25} />
              <span className="text-sm">{i + 1}</span>
            </span>
          ))}
        </div>
      );
    }
    case "file_upload":
      return (
        <div
          className="pointer-events-none flex h-44 w-full max-w-[520px] flex-col items-center justify-center gap-2 rounded tf-answer-text"
          style={{
            background: "color-mix(in srgb, var(--tf-answer) 8%, transparent)",
            border: "1px dashed color-mix(in srgb, var(--tf-answer) 60%, transparent)",
          }}
        >
          <Upload size={28} />
          <span className="text-lg">
            <b>Choose file</b> or drag here
          </span>
          <span className="text-sm opacity-70">Size limit: 10MB</span>
        </div>
      );
    default:
      return (
        <div className="pointer-events-none">
          <input
            disabled
            className="tf-input"
            placeholder={question.type === "email" ? "name@example.com" : "Type your answer here..."}
          />
          {question.type === "long_text" && (
            <p className="mt-2 text-xs tf-subtle">
              <b>Shift ⇧ + Enter ↵</b> to make a line break
            </p>
          )}
        </div>
      );
  }
}

function QuestionCanvas({ question, index }: { question: Question; index: number }) {
  const { updateQuestion } = useFormEditor();
  return (
    <div className="w-full max-w-[720px]">
      <div className="flex gap-2 sm:-ml-10">
        <span className="mt-[5px] flex h-6 shrink-0 items-center gap-0.5 text-base tf-answer-text sm:w-8 sm:justify-end">
          {index + 1}
          <ArrowRight size={14} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <AutoTextarea
              key={question.id}
              autoFocus={!question.title}
              value={question.title}
              onChange={(title) => updateQuestion(question.id, { title })}
              placeholder="Your question here. Recall information with @"
              className="min-w-[2ch] max-w-full text-2xl leading-8 tf-question-text [field-sizing:content]"
            />
            {question.required && <span className="text-2xl leading-8 tf-question-text">*</span>}
          </div>
          <AutoTextarea
            value={question.description ?? ""}
            onChange={(d) => updateQuestion(question.id, { description: d || null })}
            placeholder="Description (optional)"
            className="mt-2 text-xl leading-7 tf-subtle"
          />
        </div>
      </div>
      <div className="mt-8">
        <AnswerPreview question={question} />
      </div>
      <div className="pointer-events-none mt-6 flex items-center gap-3">
        <span className="tf-button">
          OK <Check size={18} strokeWidth={3} />
        </span>
        <span className="text-xs tf-subtle">
          press <b>Enter ↵</b>
        </span>
      </div>
    </div>
  );
}

function WelcomeCanvas() {
  const { form, update } = useFormEditor();
  const welcome = form.settings.welcome_screen;
  const set = (patch: Partial<typeof welcome>) =>
    update((f) => ({ ...f, settings: { ...f.settings, welcome_screen: { ...f.settings.welcome_screen, ...patch } } }));
  return (
    <div className={cn("flex w-full max-w-[720px] flex-col items-center text-center", !welcome.enabled && "opacity-50")}>
      <AutoTextarea
        value={welcome.title}
        onChange={(title) => set({ title })}
        placeholder="Say hi! Recall information with @"
        className="text-center text-[32px] leading-10 tf-question-text"
      />
      <AutoTextarea
        value={welcome.description}
        onChange={(description) => set({ description })}
        placeholder="Description (optional)"
        className="mt-3 text-center text-xl tf-subtle"
      />
      <div className="mt-8 flex items-center gap-3">
        <span className="tf-button">
          <input
            aria-label="Button text"
            className="bg-transparent text-center outline-none"
            value={welcome.button_text}
            size={Math.max(4, welcome.button_text.length)}
            onChange={(e) => set({ button_text: e.target.value })}
          />
        </span>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-sm tf-subtle">
        <Clock size={14} /> Takes {Math.max(1, Math.round((form.questions.length * 12) / 60))} minute(s)
      </p>
      {!welcome.enabled && <p className="mt-6 text-sm tf-subtle">Welcome screen is off — turn it on in the panel →</p>}
    </div>
  );
}

function ThankYouCanvas() {
  const { form, update } = useFormEditor();
  const screen = form.settings.thank_you_screen;
  const set = (patch: Partial<typeof screen>) =>
    update((f) => ({ ...f, settings: { ...f.settings, thank_you_screen: { ...f.settings.thank_you_screen, ...patch } } }));
  return (
    <div className="flex w-full max-w-[720px] flex-col items-center text-center">
      <span
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-full tf-answer-text"
        style={{ background: "color-mix(in srgb, var(--tf-answer) 14%, transparent)" }}
      >
        <Check size={28} />
      </span>
      <AutoTextarea
        value={screen.title}
        onChange={(title) => set({ title })}
        placeholder="Thank you! Recall information with @"
        className="text-center text-[32px] leading-10 tf-question-text"
      />
      <AutoTextarea
        value={screen.description}
        onChange={(description) => set({ description })}
        placeholder="Description (optional)"
        className="mt-3 text-center text-xl tf-subtle"
      />
      <span className="tf-button pointer-events-none mt-8">Create a typeform</span>
    </div>
  );
}

export function Canvas() {
  const { form, selected } = useFormEditor();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const index = form.questions.findIndex((q) => q.id === selected);

  let content: React.ReactNode;
  if (selected === "welcome") content = <WelcomeCanvas />;
  else if (selected === "thankyou") content = <ThankYouCanvas />;
  else if (index >= 0) content = <QuestionCanvas question={form.questions[index]} index={index} />;
  else content = <p className="text-lg tf-subtle">Add a question to get started</p>;

  return (
    <section className="flex min-w-0 flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-end gap-1">
        {(["desktop", "mobile"] as const).map((d) => (
          <button
            key={d}
            aria-label={`${d} view`}
            onClick={() => setDevice(d)}
            className={cn("rounded-md p-1.5", device === d ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink")}
          >
            {d === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 justify-center">
        <div
          className={cn(
            "tf-theme scrollbar-thin flex overflow-y-auto rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all",
            device === "desktop" ? "w-full" : "w-[375px]",
          )}
          style={themeStyle(form.theme)}
        >
          <div className={cn("m-auto flex w-full justify-center py-16", device === "desktop" ? "px-16" : "px-6 pl-12")}>{content}</div>
        </div>
      </div>
    </section>
  );
}
