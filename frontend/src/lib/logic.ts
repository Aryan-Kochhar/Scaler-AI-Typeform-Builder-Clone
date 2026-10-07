import type { Answers, AnswerValue, Question } from "./types";

// Mirrors backend/app/services/logic.py. Jumps are stored in
// `question.properties.jumps` as { [choiceId | "yes" | "no"]: questionId | "end" }.
export const END = "end";

export function supportsJumps(q: Question) {
  return q.type === "yes_no" || q.type === "dropdown" || (q.type === "multiple_choice" && !q.properties.allow_multiple);
}

export function jumpKey(q: Question, value: AnswerValue | undefined): string | null {
  if (q.type === "yes_no" && typeof value === "boolean") return value ? "yes" : "no";
  if (!supportsJumps(q)) return null;
  const ids = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  return ids.length === 1 ? ids[0] : null;
}

/** Index of the question to show after `index`; `questions.length` means "finish". */
export function nextIndex(questions: Question[], index: number, answers: Answers): number {
  const q = questions[index];
  const key = jumpKey(q, answers[q.id]);
  const target = key ? q.properties.jumps?.[key] : undefined;
  if (target === END) return questions.length;
  const j = target ? questions.findIndex((x) => x.id === target) : -1;
  return j > index ? j : index + 1;
}

/** Ordered indices of the questions a respondent sees, given their answers. */
export function visitedPath(questions: Question[], answers: Answers): number[] {
  const path: number[] = [];
  for (let i = 0; i < questions.length; i = nextIndex(questions, i, answers)) path.push(i);
  return path;
}
