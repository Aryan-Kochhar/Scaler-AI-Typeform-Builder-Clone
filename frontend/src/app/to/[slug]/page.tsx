"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormRenderer } from "@/components/renderer/FormRenderer";
import { Loading } from "@/components/ui/Brand";
import { api } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    api
      .getPublicForm(slug)
      .then((f) => {
        setForm(f);
        document.title = f.title;
        if (!tracked.current) {
          tracked.current = true;
          void api.trackEvent(slug, "view");
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [slug]);

  const onStart = useCallback(() => void api.trackEvent(slug, "start"), [slug]);

  if (error) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-2xl font-medium text-ink">Hmm, this typeform isn&apos;t available</p>
        <p className="text-ink-soft">{error}</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex h-dvh items-center justify-center bg-white text-ink-soft">
        <Loading />
      </main>
    );
  }

  return (
    <FormRenderer
      form={form}
      mode="live"
      onStart={onStart}
      uploadFile={(questionId, file) => api.uploadFile(slug, questionId, file)}
      onSubmit={async (answers, startedAt) => {
        await api.submitResponse(slug, answers, startedAt);
      }}
    />
  );
}
