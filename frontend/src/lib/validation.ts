import type { AnswerValue, Question } from "./types";

// Mirrors backend/app/services/validation.py so users get instant feedback;
// the server re-validates everything on submit.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmpty(value: AnswerValue | undefined) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function validateAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (isEmpty(value)) return question.required ? "Please fill this in" : null;
  const props = question.properties ?? {};

  switch (question.type) {
    case "email":
      return EMAIL_RE.test(String(value).trim()) ? null : "Hmm... that email doesn't look right";
    case "number": {
      const n = Number(value);
      if (typeof value === "boolean" || Number.isNaN(n) || !Number.isFinite(n)) return "Please enter a number";
      if (props.min != null && n < props.min) return `Number must be at least ${props.min}`;
      if (props.max != null && n > props.max) return `Number must be at most ${props.max}`;
      return null;
    }
    case "short_text":
    case "long_text": {
      const max = props.max_length;
      return max && String(value).trim().length > max ? `Please keep it under ${max} characters` : null;
    }
    default:
      return null;
  }
}
