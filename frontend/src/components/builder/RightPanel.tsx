"use client";

import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { ComingSoonBadge } from "@/components/ui/Brand";
import { Toggle } from "@/components/ui/Toggle";
import { convertQuestion, QUESTION_TYPES } from "@/lib/questionTypes";
import { FONTS, resolveTheme, THEME_PRESETS } from "@/lib/themes";
import type { Question, QuestionType, Theme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TypeChip } from "./AddContentModal";
import { useFormEditor } from "./FormEditorProvider";

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label">{label}</span>
        {children}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function NumberField({ value, onChange, placeholder }: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      className="field !h-8 !w-24"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

function QuestionSettings({ question }: { question: Question }) {
  const { update, updateQuestion, duplicateQuestion, removeQuestion } = useFormEditor();
  const props = question.properties;
  const setProps = (patch: Partial<Question["properties"]>) =>
    updateQuestion(question.id, { properties: { ...props, ...patch } });

  return (
    <div className="divide-y divide-line">
      <div className="pb-3">
        <span className="label">Question type</span>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-2 top-1.5">
            <TypeChip type={question.type} />
          </span>
          <select
            className="field !h-9 appearance-none !pl-11"
            value={question.type}
            onChange={(e) =>
              update((f) => ({
                ...f,
                questions: f.questions.map((q) => (q.id === question.id ? convertQuestion(q, e.target.value as QuestionType) : q)),
              }))
            }
          >
            {Object.entries(QUESTION_TYPES).map(([type, meta]) => (
              <option key={type} value={type}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Row label="Required">
        <Toggle checked={question.required} onChange={(required) => updateQuestion(question.id, { required })} label="Required" />
      </Row>

      {question.type === "multiple_choice" && (
        <Row label="Multiple selection" hint="Let people choose more than one answer">
          <Toggle checked={!!props.allow_multiple} onChange={(v) => setProps({ allow_multiple: v })} label="Multiple selection" />
        </Row>
      )}

      {question.type === "rating" && (
        <>
          <Row label="Steps">
            <select className="field !h-8 !w-24" value={props.steps ?? 5} onChange={(e) => setProps({ steps: Number(e.target.value) })}>
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Shape">
            <div className="flex rounded-lg border border-line p-0.5 text-xs">
              {(["star", "number"] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setProps({ shape })}
                  className={cn("rounded-md px-2.5 py-1 capitalize", (props.shape ?? "star") === shape ? "bg-ink text-white" : "text-ink-soft")}
                >
                  {shape === "star" ? "Stars" : "Numbers"}
                </button>
              ))}
            </div>
          </Row>
        </>
      )}

      {question.type === "number" && (
        <>
          <Row label="Min number">
            <NumberField value={props.min} onChange={(min) => setProps({ min })} placeholder="None" />
          </Row>
          <Row label="Max number">
            <NumberField value={props.max} onChange={(max) => setProps({ max })} placeholder="None" />
          </Row>
        </>
      )}

      {(question.type === "short_text" || question.type === "long_text") && (
        <Row label="Max characters" hint="Leave empty for no limit">
          <NumberField value={props.max_length} onChange={(max_length) => setProps({ max_length })} placeholder="None" />
        </Row>
      )}

      <Row label="Logic jumps">
        <ComingSoonBadge />
      </Row>
      <Row label="Image or video">
        <ComingSoonBadge />
      </Row>

      <div className="flex gap-2 pt-4">
        <button className="btn-secondary flex-1" onClick={() => duplicateQuestion(question.id)}>
          <Copy size={14} /> Duplicate
        </button>
        <button className="btn-secondary flex-1 !text-danger" onClick={() => removeQuestion(question.id)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}

function ScreenSettings({ kind }: { kind: "welcome" | "thankyou" }) {
  const { form, update } = useFormEditor();
  if (kind === "welcome") {
    const welcome = form.settings.welcome_screen;
    return (
      <div className="divide-y divide-line">
        <Row label="Show welcome screen" hint="A friendly intro shown before the first question">
          <Toggle
            checked={welcome.enabled}
            label="Show welcome screen"
            onChange={(enabled) =>
              update((f) => ({ ...f, settings: { ...f.settings, welcome_screen: { ...f.settings.welcome_screen, enabled } } }))
            }
          />
        </Row>
        <Row label="Time to complete">
          <span className="text-xs text-ink-soft">Shown automatically</span>
        </Row>
      </div>
    );
  }
  return (
    <div className="divide-y divide-line">
      <p className="pb-3 text-sm text-ink-soft">Edit the title and description directly on the canvas.</p>
      <Row label="Redirect on completion">
        <ComingSoonBadge />
      </Row>
      <Row label="Social share icons">
        <ComingSoonBadge />
      </Row>
      <Row label="Multiple endings">
        <ComingSoonBadge />
      </Row>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 text-sm text-ink">
      {label}
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-ink-faint">{value}</span>
        <span className="relative h-7 w-7 overflow-hidden rounded-md ring-1 ring-line">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute -inset-2 h-12 w-12 cursor-pointer" />
        </span>
      </span>
    </label>
  );
}

function DesignPanel() {
  const { form, update } = useFormEditor();
  const theme = resolveTheme(form.theme);
  const setTheme = (patch: Partial<Theme>) => update((f) => ({ ...f, theme: { ...resolveTheme(f.theme), ...patch } }));

  return (
    <div>
      <p className="label mb-2">Themes</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.values(THEME_PRESETS).map(({ name, ...preset }) => (
          <button
            key={preset.preset}
            onClick={() => setTheme(preset)}
            className={cn(
              "overflow-hidden rounded-lg text-left ring-1 transition",
              theme.preset === preset.preset ? "ring-2 ring-ink" : "ring-line hover:ring-ink-faint",
            )}
          >
            <div className="flex h-14 flex-col justify-center gap-1 px-2.5" style={{ background: preset.background, fontFamily: `"${preset.font}"` }}>
              <span className="text-xs" style={{ color: preset.question }}>
                Question
              </span>
              <span className="text-xs" style={{ color: preset.answer }}>
                Answer
              </span>
              <span className="h-2 w-6 rounded-sm" style={{ background: preset.button }} />
            </div>
            <p className="bg-white px-2.5 py-1.5 text-xs text-ink">{name}</p>
          </button>
        ))}
      </div>

      <p className="label mb-1 mt-6">Font</p>
      <select className="field" value={theme.font} onChange={(e) => setTheme({ font: e.target.value, preset: "custom" })}>
        {FONTS.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>

      <p className="label mb-1 mt-6">Colors</p>
      <ColorField label="Questions" value={theme.question} onChange={(question) => setTheme({ question, preset: "custom" })} />
      <ColorField label="Answers" value={theme.answer} onChange={(answer) => setTheme({ answer, preset: "custom" })} />
      <ColorField label="Buttons" value={theme.button} onChange={(button) => setTheme({ button, preset: "custom" })} />
      <ColorField label="Button text" value={theme.button_text} onChange={(button_text) => setTheme({ button_text, preset: "custom" })} />
      <ColorField label="Background" value={theme.background} onChange={(background) => setTheme({ background, preset: "custom" })} />

      <div className="mt-6 flex items-center justify-between rounded-lg border border-dashed border-line p-3">
        <span className="text-sm text-ink-soft">Background image & logo</span>
        <ComingSoonBadge />
      </div>
    </div>
  );
}

export function RightPanel() {
  const { form, selected } = useFormEditor();
  const [tab, setTab] = useState<"content" | "design">("content");
  const question = form.questions.find((q) => q.id === selected);

  return (
    <aside className="scrollbar-thin hidden w-[260px] shrink-0 overflow-y-auto border-l border-line bg-white md:block xl:w-[300px]">
      <div className="sticky top-0 z-10 flex border-b border-line bg-white px-2">
        {(["content", "design"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("relative px-3 py-3 text-sm capitalize", tab === t ? "font-medium text-ink" : "text-ink-soft hover:text-ink")}
          >
            {t === "content" ? (selected === "welcome" || selected === "thankyou" ? "Screen" : "Question") : "Design"}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ink" />}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "design" ? (
          <DesignPanel />
        ) : selected === "welcome" || selected === "thankyou" ? (
          <ScreenSettings kind={selected} />
        ) : question ? (
          <QuestionSettings question={question} />
        ) : (
          <p className="text-sm text-ink-soft">Select a question to edit its settings.</p>
        )}
      </div>
    </aside>
  );
}
