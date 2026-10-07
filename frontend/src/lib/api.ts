import type {
  Answers,
  Form,
  FormListItem,
  FormSummary,
  PublicForm,
  ResponseList,
  User,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Please try again.", 0);
  }
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json()).detail;
    } catch {
      /* non-JSON error body */
    }
    const message =
      typeof detail === "string"
        ? detail
        : ((detail as { message?: string } | undefined)?.message ?? `Request failed (${res.status})`);
    throw new ApiError(message, res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (body: unknown) => JSON.stringify(body);

/** Shape accepted by PUT /forms/:id — the whole editable form document. */
export function toDefinition(form: Form) {
  return {
    title: form.title,
    theme: form.theme,
    settings: form.settings,
    questions: form.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      description: q.description,
      required: q.required,
      properties: q.properties,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
    })),
  };
}

export const api = {
  me: () => request<User>("/api/me"),

  listForms: () => request<FormListItem[]>("/api/forms"),
  createForm: (title: string) => request<Form>("/api/forms", { method: "POST", body: json({ title }) }),
  getForm: (id: string) => request<Form>(`/api/forms/${id}`),
  saveForm: (form: Form) => request<Form>(`/api/forms/${form.id}`, { method: "PUT", body: json(toDefinition(form)) }),
  renameForm: (id: string, title: string) =>
    request<Form>(`/api/forms/${id}`, { method: "PATCH", body: json({ title }) }),
  deleteForm: (id: string) => request<void>(`/api/forms/${id}`, { method: "DELETE" }),
  duplicateForm: (id: string) => request<Form>(`/api/forms/${id}/duplicate`, { method: "POST" }),
  publishForm: (id: string) => request<Form>(`/api/forms/${id}/publish`, { method: "POST" }),
  unpublishForm: (id: string) => request<Form>(`/api/forms/${id}/unpublish`, { method: "POST" }),

  listResponses: (formId: string) => request<ResponseList>(`/api/forms/${formId}/responses?limit=500`),
  deleteResponse: (formId: string, responseId: string) =>
    request<void>(`/api/forms/${formId}/responses/${responseId}`, { method: "DELETE" }),
  getSummary: (formId: string) => request<FormSummary>(`/api/forms/${formId}/summary`),
  csvUrl: (formId: string) => `${API_URL}/api/forms/${formId}/responses.csv`,

  getPublicForm: (slug: string) => request<PublicForm>(`/api/public/forms/${slug}`),
  trackEvent: (slug: string, type: "view" | "start") =>
    request<void>(`/api/public/forms/${slug}/events`, { method: "POST", body: json({ type }) }).catch(() => {}),
  submitResponse: (slug: string, answers: Answers, startedAt: string | null) =>
    request<{ id: string; submitted_at: string }>(`/api/public/forms/${slug}/responses`, {
      method: "POST",
      body: json({ answers, started_at: startedAt }),
    }),
};

export function publicFormUrl(slug: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/to/${slug}`;
}
