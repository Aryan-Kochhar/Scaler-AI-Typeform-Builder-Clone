"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/ui/Brand";
import { api } from "@/lib/api";
import { createQuestion } from "@/lib/questionTypes";
import type { Form, Question, QuestionType } from "@/lib/types";
import { uid } from "@/lib/utils";

export type SaveState = "saved" | "saving" | "unsaved" | "error";
/** A question id, or one of the two special screens. */
export type Selection = string | "welcome" | "thankyou";

interface FormEditorContextValue {
  form: Form;
  saveState: SaveState;
  selected: Selection | null;
  select: (selection: Selection | null) => void;
  /** Apply an immutable change to the form content; schedules an autosave. */
  update: (recipe: (form: Form) => Form) => void;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  addQuestion: (type: QuestionType) => void;
  removeQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  moveQuestion: (from: number, to: number) => void;
  flush: () => Promise<void>;
  publish: () => Promise<boolean>;
  unpublish: () => Promise<void>;
}

const FormEditorContext = createContext<FormEditorContextValue | null>(null);

export function useFormEditor() {
  const ctx = useContext(FormEditorContext);
  if (!ctx) throw new Error("useFormEditor must be used inside <FormEditorProvider>");
  return ctx;
}

const AUTOSAVE_DELAY = 700;

export function FormEditorProvider({ formId, children }: { formId: string; children: React.ReactNode }) {
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [selected, setSelected] = useState<Selection | null>(null);

  const formRef = useRef<Form | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getForm(formId)
      .then((f) => {
        if (cancelled) return;
        formRef.current = f;
        setForm(f);
        setSelected(f.questions[0]?.id ?? (f.settings.welcome_screen.enabled ? "welcome" : null));
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [formId]);

  /** Save the latest form if it has unsaved changes. Saves are serialized. */
  const flush = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    if (!dirty.current || !formRef.current) return;
    dirty.current = false;
    setSaveState("saving");
    const snapshot = formRef.current;
    const request = api
      .saveForm(snapshot)
      .then((saved) => {
        // Keep local edits; only adopt server-owned fields.
        const merged = { ...formRef.current!, updated_at: saved.updated_at, response_count: saved.response_count };
        formRef.current = merged;
        setForm(merged);
        setSaveState(dirty.current ? "unsaved" : "saved");
      })
      .catch((e: Error) => {
        dirty.current = true;
        setSaveState("error");
        toast.error(`Couldn't save: ${e.message}`);
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = request;
    await request;
  }, []);

  const update = useCallback(
    (recipe: (form: Form) => Form) => {
      if (!formRef.current) return;
      const next = recipe(formRef.current);
      formRef.current = next;
      setForm(next);
      dirty.current = true;
      setSaveState("unsaved");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY);
    },
    [flush],
  );

  // Save on unmount and warn before closing the tab with unsaved work.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      void flush();
    };
  }, [flush]);

  const updateQuestion = useCallback(
    (id: string, patch: Partial<Question>) =>
      update((f) => ({ ...f, questions: f.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
    [update],
  );

  const addQuestion = useCallback(
    (type: QuestionType) => {
      const question = createQuestion(type);
      update((f) => {
        const index = f.questions.findIndex((q) => q.id === selected);
        const questions = [...f.questions];
        questions.splice(index >= 0 ? index + 1 : questions.length, 0, question);
        return { ...f, questions };
      });
      setSelected(question.id);
    },
    [update, selected],
  );

  const removeQuestion = useCallback(
    (id: string) => {
      const questions = formRef.current?.questions ?? [];
      const index = questions.findIndex((q) => q.id === id);
      const neighbour = questions[index + 1] ?? questions[index - 1];
      update((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== id) }));
      setSelected((s) => (s === id ? (neighbour?.id ?? null) : s));
    },
    [update],
  );

  const duplicateQuestion = useCallback(
    (id: string) => {
      const source = formRef.current?.questions.find((q) => q.id === id);
      if (!source) return;
      const copy: Question = {
        ...structuredClone(source),
        id: uid(),
        choices: source.choices.map((c) => ({ ...c, id: uid() })),
      };
      update((f) => {
        const questions = [...f.questions];
        questions.splice(questions.findIndex((q) => q.id === id) + 1, 0, copy);
        return { ...f, questions };
      });
      setSelected(copy.id);
    },
    [update],
  );

  const moveQuestion = useCallback(
    (from: number, to: number) =>
      update((f) => {
        const questions = [...f.questions];
        const [moved] = questions.splice(from, 1);
        questions.splice(to, 0, moved);
        return { ...f, questions };
      }),
    [update],
  );

  const applyServerStatus = (server: Form) => {
    const merged = { ...formRef.current!, status: server.status, published_at: server.published_at };
    formRef.current = merged;
    setForm(merged);
  };

  const publish = useCallback(async () => {
    await flush();
    try {
      applyServerStatus(await api.publishForm(formId));
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }, [flush, formId]);

  const unpublish = useCallback(async () => {
    try {
      applyServerStatus(await api.unpublishForm(formId));
      toast("Form unpublished. The link no longer accepts responses.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [formId]);

  const value = useMemo(
    () =>
      form && {
        form,
        saveState,
        selected,
        select: setSelected,
        update,
        updateQuestion,
        addQuestion,
        removeQuestion,
        duplicateQuestion,
        moveQuestion,
        flush,
        publish,
        unpublish,
      },
    [form, saveState, selected, update, updateQuestion, addQuestion, removeQuestion, duplicateQuestion, moveQuestion, flush, publish, unpublish],
  );

  if (loadError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-medium text-ink">Couldn&apos;t open this form</p>
        <p className="text-sm text-ink-soft">{loadError}</p>
        <a href="/workspace" className="btn-secondary mt-3">
          Back to workspace
        </a>
      </div>
    );
  }
  if (!value) {
    return (
      <div className="flex h-dvh items-center justify-center text-ink-soft">
        <Loading />
      </div>
    );
  }
  return <FormEditorContext.Provider value={value}>{children}</FormEditorContext.Provider>;
}
