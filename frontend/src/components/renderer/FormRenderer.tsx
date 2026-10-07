"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronUp, Clock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { themeStyle } from "@/lib/themes";
import type { Answers, AnswerValue, PublicForm, Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isEmpty, validateAnswer } from "@/lib/validation";
import { AnswerInput } from "./inputs";

const WELCOME = -1;
const AUTO_ADVANCE_TYPES = new Set(["dropdown", "yes_no", "rating"]);
const AUTO_ADVANCE_DELAY = 450;

const slide: Variants = {
  enter: (dir: number) => ({ y: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir: number) => ({ y: dir > 0 ? -80 : 80, opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }),
};

interface FormRendererProps {
  form: PublicForm;
  mode: "live" | "preview";
  /** Persist the submission. Throw ApiError with `detail.errors` for per-question errors. */
  onSubmit?: (answers: Answers, startedAt: string | null) => Promise<void>;
  onStart?: () => void;
  /** Fill the parent box instead of the viewport (builder preview). */
  embedded?: boolean;
}

/** Prepare answers for the API (numbers typed as text become numbers). */
function serialize(questions: Question[], answers: Answers): Answers {
  const out: Answers = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (isEmpty(v)) continue;
    out[q.id] = q.type === "number" ? Number(v) : typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export function FormRenderer({ form, mode, onSubmit, onStart, embedded }: FormRendererProps) {
  const { questions } = form;
  const welcome = form.settings?.welcome_screen;
  const thankYou = form.settings?.thank_you_screen;
  const firstStep = welcome?.enabled ? WELCOME : 0;

  const [step, setStep] = useState(firstStep);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const answersRef = useRef<Answers>({});
  const startedAt = useRef<string | null>(null);
  const advanceTimer = useRef<number | undefined>(undefined);

  const markStarted = useCallback(() => {
    if (startedAt.current) return;
    startedAt.current = new Date().toISOString();
    onStart?.();
  }, [onStart]);

  const goTo = (target: number) => {
    window.clearTimeout(advanceTimer.current);
    setDirection(target >= step ? 1 : -1);
    setStep(target);
  };

  const submit = async (all: Answers) => {
    const clientErrors: Record<string, string> = {};
    questions.forEach((q) => {
      const err = validateAnswer(q, all[q.id]);
      if (err) clientErrors[q.id] = err;
    });
    const firstInvalid = questions.findIndex((q) => clientErrors[q.id]);
    if (firstInvalid >= 0) {
      setErrors(clientErrors);
      goTo(firstInvalid);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === "live" && onSubmit) await onSubmit(serialize(questions, all), startedAt.current);
      setDirection(1);
      setDone(true);
    } catch (e) {
      const serverErrors = (e instanceof ApiError && (e.detail as { errors?: Record<string, string> })?.errors) || null;
      if (serverErrors) {
        setErrors(serverErrors);
        const idx = questions.findIndex((q) => serverErrors[q.id]);
        if (idx >= 0) goTo(idx);
      } else {
        setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const next = (override?: Answers) => {
    if (done || submitting) return;
    if (step === WELCOME) {
      markStarted();
      goTo(0);
      return;
    }
    const question = questions[step];
    if (!question) return;
    const all = override ?? answersRef.current;
    const err = validateAnswer(question, all[question.id]);
    if (err) {
      setErrors((e) => ({ ...e, [question.id]: err }));
      return;
    }
    markStarted();
    if (step < questions.length - 1) goTo(step + 1);
    else void submit(all);
  };

  const prev = () => {
    if (step > 0) goTo(step - 1);
    else if (step === 0 && firstStep === WELCOME) goTo(WELCOME);
  };

  const setAnswer = (question: Question, value: AnswerValue, advance?: boolean) => {
    const updated = { ...answersRef.current, [question.id]: value };
    answersRef.current = updated;
    setAnswers(updated);
    setSubmitError(null);
    setErrors((e) => {
      if (!e[question.id]) return e;
      const rest = { ...e };
      delete rest[question.id];
      return rest;
    });
    markStarted();
    window.clearTimeout(advanceTimer.current);
    if (advance) advanceTimer.current = window.setTimeout(() => next(updated), AUTO_ADVANCE_DELAY);
  };

  // Global keyboard navigation: Enter = OK / next, ↑ ↓ = previous / next question.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const target = e.target as HTMLElement;
      if (target.closest?.("[data-builder-chrome]")) return;
      const inTextarea = target.tagName === "TEXTAREA";
      const inDropdown = target.dataset?.dropdown === "true";
      if (e.key === "Enter") {
        if ((inTextarea && e.shiftKey) || inDropdown || e.isComposing) return;
        e.preventDefault();
        next();
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !inTextarea && !inDropdown && step !== WELCOME) {
        e.preventDefault();
        if (e.key === "ArrowDown") next();
        else prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const restart = () => {
    answersRef.current = {};
    startedAt.current = null;
    setAnswers({});
    setErrors({});
    setDone(false);
    setDirection(-1);
    setStep(firstStep);
  };

  const answeredCount = questions.filter((q) => !isEmpty(answers[q.id])).length;
  const progress = done ? 100 : questions.length ? (answeredCount / questions.length) * 100 : 0;
  const stepKey = done ? "done" : step === WELCOME ? "welcome" : questions[step]?.id ?? "empty";

  let content: React.ReactNode;
  if (done) {
    content = (
      <div className="flex w-full max-w-[720px] flex-col items-center text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full tf-answer-text" style={{ background: "color-mix(in srgb, var(--tf-answer) 14%, transparent)" }}>
          <Check size={28} />
        </div>
        <h1 className="text-[28px] leading-9 tf-question-text sm:text-[32px] sm:leading-10">
          {thankYou?.title || "Thanks for completing this typeform"}
        </h1>
        {thankYou?.description && <p className="mt-3 text-lg tf-subtle sm:text-xl">{thankYou.description}</p>}
        {mode === "preview" ? (
          <button className="tf-button mt-8" onClick={restart}>
            Restart preview
          </button>
        ) : (
          <Link href="/workspace" className="tf-button mt-8">
            Create a typeform
          </Link>
        )}
      </div>
    );
  } else if (step === WELCOME && welcome) {
    const minutes = Math.max(1, Math.round((questions.length * 12) / 60));
    content = (
      <div className="flex w-full max-w-[720px] flex-col items-center text-center">
        <h1 className="text-[28px] leading-9 tf-question-text sm:text-[32px] sm:leading-10">{welcome.title || form.title}</h1>
        {welcome.description && <p className="mt-3 text-lg tf-subtle sm:text-xl">{welcome.description}</p>}
        <div className="mt-8 flex items-center gap-3">
          <button className="tf-button" onClick={() => next()}>
            {welcome.button_text || "Start"}
          </button>
          <span className="hidden text-xs tf-subtle sm:inline">
            press <b>Enter ↵</b>
          </span>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-sm tf-subtle">
          <Clock size={14} /> Takes {minutes} minute{minutes > 1 ? "s" : ""}
        </p>
      </div>
    );
  } else if (!questions.length) {
    content = <p className="text-xl tf-subtle">This form doesn&apos;t have any questions yet.</p>;
  } else {
    const question = questions[step];
    const value = answers[question.id];
    const error = errors[question.id];
    const isLast = step === questions.length - 1;
    const hideOk = AUTO_ADVANCE_TYPES.has(question.type) || (question.type === "multiple_choice" && !question.properties.allow_multiple);
    content = (
      <div className="w-full max-w-[720px]">
        <div className="flex gap-2 sm:-ml-10">
          <span className="mt-[5px] flex h-6 shrink-0 items-center gap-0.5 text-base tf-answer-text sm:w-8 sm:justify-end">
            {step + 1}
            <ArrowRight size={14} strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="whitespace-pre-wrap break-words text-[20px] leading-7 tf-question-text sm:text-2xl sm:leading-8">
              {question.title || "..."}
              {question.required && <span> *</span>}
            </h1>
            {question.description && (
              <p className="mt-2 whitespace-pre-wrap text-base tf-subtle sm:text-xl sm:leading-7">{question.description}</p>
            )}
          </div>
        </div>
        <div className="mt-8">
          <AnswerInput
            key={question.id}
            question={question}
            value={value}
            onChange={(v, advance) => setAnswer(question, v, advance)}
            onEnter={() => next()}
            autoFocus
          />
        </div>
        <div className="mt-5 min-h-[44px]">
          {error ? (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="tf-error">
              <AlertTriangle size={14} /> {error}
            </motion.div>
          ) : submitError ? (
            <div className="tf-error">
              <AlertTriangle size={14} /> {submitError}
            </div>
          ) : (
            (!hideOk || isLast || !isEmpty(value)) && (
              <div className="flex items-center gap-3">
                <button className="tf-button" disabled={submitting} onClick={() => next()}>
                  {isLast ? (submitting ? "Submitting..." : "Submit") : "OK"}
                  {!isLast && <Check size={18} strokeWidth={3} />}
                </button>
                <span className="hidden text-xs tf-subtle sm:inline">
                  press <b>Enter ↵</b>
                </span>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("tf-theme relative flex flex-col overflow-hidden", embedded ? "h-full" : "h-dvh")}
      style={themeStyle(form.theme)}
    >
      <div className="absolute inset-x-0 top-0 z-10 h-1" style={{ background: "color-mix(in srgb, var(--tf-answer) 25%, transparent)" }}>
        <motion.div className="h-full" style={{ background: "var(--tf-answer)" }} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
      </div>

      <div className="scrollbar-thin relative flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={stepKey}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex min-h-full items-center justify-center px-6 py-20 sm:px-16"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      {!done && step !== WELCOME && questions.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3">
          <span className="hidden text-xs tf-subtle sm:inline">
            {answeredCount} of {questions.length} answered
          </span>
          <div className="flex overflow-hidden rounded" style={{ boxShadow: "0 3px 12px rgba(0,0,0,.1)" }}>
            {[
              { label: "Previous question", icon: ChevronUp, onClick: prev, disabled: step === 0 && firstStep !== WELCOME },
              { label: "Next question", icon: ChevronDown, onClick: () => next(), disabled: step >= questions.length - 1 },
            ].map(({ label, icon: Icon, onClick, disabled }, i) => (
              <button
                key={label}
                aria-label={label}
                onClick={onClick}
                disabled={disabled}
                className={cn("flex h-9 w-10 items-center justify-center transition hover:brightness-110 disabled:opacity-50", i && "border-l border-black/10")}
                style={{ background: "var(--tf-button)", color: "var(--tf-button-text)" }}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
