"use client";

import { useIsPresent } from "framer-motion";
import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnswerValue, Question } from "@/lib/types";
import { cn, letterFor } from "@/lib/utils";

export interface AnswerInputProps {
  question: Question;
  value: AnswerValue | undefined;
  /** `advance` asks the flow to move on automatically (single-select style answers). */
  onChange: (value: AnswerValue, advance?: boolean) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}

/** Listen for single-key shortcuts (A/B/C, Y/N, 1-9) while this question is on screen. */
function useShortcutKeys(handler: (key: string) => boolean | void) {
  const isPresent = useIsPresent();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!isPresent) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (handlerRef.current(e.key.toUpperCase())) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPresent]);
}

/** Focus the answer field when the question appears, and pull focus back to it
 *  when the respondent starts typing anywhere on the page (like Typeform). */
function useDelayedFocus<T extends HTMLElement>(enabled: boolean | undefined) {
  const ref = useRef<T>(null);
  const isPresent = useIsPresent();
  useEffect(() => {
    if (!enabled || !isPresent) return;
    const frame = requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      const target = e.target as HTMLElement;
      if (!el || document.activeElement === el || e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || e.key.length !== 1) return;
      el.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, isPresent]);
  return ref;
}

export function TextAnswer({ question, value, onChange, autoFocus }: AnswerInputProps) {
  const multiline = question.type === "long_text";
  const inputRef = useDelayedFocus<HTMLInputElement>(autoFocus && !multiline);
  const areaRef = useDelayedFocus<HTMLTextAreaElement>(autoFocus && multiline);
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, areaRef]);

  const placeholder = question.type === "email" ? "name@example.com" : "Type your answer here...";

  if (multiline) {
    return (
      <div>
        <textarea
          ref={areaRef}
          rows={1}
          className="tf-input overflow-hidden"
          placeholder={placeholder}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="mt-2 text-xs tf-subtle">
          <b>Shift ⇧ + Enter ↵</b> to make a line break
        </p>
      </div>
    );
  }
  return (
    <input
      ref={inputRef}
      className="tf-input"
      type={question.type === "email" ? "email" : "text"}
      inputMode={question.type === "number" ? "decimal" : question.type === "email" ? "email" : "text"}
      autoComplete={question.type === "email" ? "email" : "off"}
      placeholder={placeholder}
      value={text}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ChoiceBox({
  letter,
  label,
  selected,
  blink,
  onClick,
  className,
}: {
  letter: string;
  label: React.ReactNode;
  selected?: boolean;
  blink?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("tf-choice", className)}
      data-selected={selected ? "true" : "false"}
      data-blink={blink ? "true" : "false"}
      onClick={onClick}
    >
      <span className="tf-key">{letter}</span>
      <span className="min-w-0 flex-1 break-words">{label}</span>
      <Check size={18} className={cn("shrink-0", selected ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

export function ChoiceAnswer({ question, value, onChange }: AnswerInputProps) {
  const multiple = !!question.properties.allow_multiple;
  const selected = Array.isArray(value) ? value : [];
  const [blinkId, setBlinkId] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (multiple) {
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    } else {
      setBlinkId(id);
      onChange([id], true);
    }
  };

  useShortcutKeys((key) => {
    const index = key.length === 1 ? key.charCodeAt(0) - 65 : -1;
    const choice = question.choices[index];
    if (!choice) return false;
    toggle(choice.id);
    return true;
  });

  return (
    <div className="flex w-fit min-w-[min(100%,260px)] max-w-full flex-col gap-2">
      {multiple && <p className="mb-1 text-sm tf-subtle">Choose as many as you like</p>}
      {question.choices.map((choice, i) => (
        <ChoiceBox
          key={choice.id}
          letter={letterFor(i)}
          label={choice.label}
          selected={selected.includes(choice.id)}
          blink={blinkId === choice.id}
          onClick={() => toggle(choice.id)}
        />
      ))}
    </div>
  );
}

export function YesNoAnswer({ value, onChange }: AnswerInputProps) {
  const [blink, setBlink] = useState<boolean | null>(null);
  const pick = (v: boolean) => {
    setBlink(v);
    onChange(v, true);
  };
  useShortcutKeys((key) => {
    if (key === "Y") pick(true);
    else if (key === "N") pick(false);
    else return false;
    return true;
  });
  return (
    <div className="flex w-fit min-w-[min(100%,200px)] flex-col gap-2">
      <ChoiceBox letter="Y" label="Yes" selected={value === true} blink={blink === true} onClick={() => pick(true)} />
      <ChoiceBox letter="N" label="No" selected={value === false} blink={blink === false} onClick={() => pick(false)} />
    </div>
  );
}

export function RatingAnswer({ question, value, onChange }: AnswerInputProps) {
  const steps = question.properties.steps ?? 5;
  const shape = question.properties.shape ?? "star";
  const current = typeof value === "number" ? value : 0;
  const [hover, setHover] = useState(0);

  useShortcutKeys((key) => {
    if (!/^[0-9]$/.test(key)) return false;
    const n = key === "0" ? 10 : Number(key);
    if (n > steps) return false;
    onChange(n, true);
    return true;
  });

  if (shape === "number") {
    return (
      <div className="flex w-full max-w-[640px] gap-1.5 sm:gap-2">
        {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className="tf-choice !justify-center !px-0 !py-2 text-center"
            data-selected={current === n ? "true" : "false"}
            onClick={() => onChange(n, true)}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  const shown = hover || current;
  return (
    <div className="flex flex-wrap gap-1 sm:gap-2" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="flex flex-col items-center gap-1 tf-answer-text"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n, true)}
        >
          <Star
            className="h-9 w-9 transition-transform hover:scale-110 sm:h-12 sm:w-12"
            strokeWidth={1.25}
            fill={n <= shown ? "currentColor" : "transparent"}
            fillOpacity={n <= shown ? 1 : 0}
          />
          <span className="text-sm">{n}</span>
        </button>
      ))}
    </div>
  );
}

export function DropdownAnswer({ question, value, onChange, onEnter, autoFocus }: AnswerInputProps) {
  const selected = question.choices.find((c) => c.id === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useDelayedFocus<HTMLInputElement>(autoFocus);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selected?.label.toLowerCase()) return question.choices;
    return question.choices.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, question.choices, selected]);

  const pick = (id: string) => {
    const choice = question.choices.find((c) => c.id === id)!;
    setQuery(choice.label);
    setOpen(false);
    onChange(choice.id, true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && options[highlight]) pick(options[highlight].id);
      else onEnter?.();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={inputRef}
          data-dropdown="true"
          className="tf-input pr-10"
          placeholder="Type or select an option"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (value) onChange(null);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          aria-label="Toggle options"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-0 top-0 p-1 tf-answer-text"
        >
          <ChevronDown className={cn("h-7 w-7 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <div className="scrollbar-thin mt-2 flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-1">
          {options.length === 0 && <p className="py-2 text-base tf-subtle">No suggestions found</p>}
          {options.map((choice, i) => (
            <button
              key={choice.id}
              type="button"
              className="tf-choice !min-h-[36px] !text-lg"
              data-selected={choice.id === value || i === highlight ? "true" : "false"}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(choice.id)}
            >
              <span className="flex-1 px-1">{choice.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnswerInput(props: AnswerInputProps) {
  switch (props.question.type) {
    case "multiple_choice":
      return <ChoiceAnswer {...props} />;
    case "dropdown":
      return <DropdownAnswer {...props} />;
    case "yes_no":
      return <YesNoAnswer {...props} />;
    case "rating":
      return <RatingAnswer {...props} />;
    default:
      return <TextAnswer {...props} />;
  }
}
