export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface Choice {
  id: string;
  label: string;
}

export interface QuestionProperties {
  allow_multiple?: boolean;
  steps?: number;
  shape?: "star" | "number";
  min?: number | null;
  max?: number | null;
  max_length?: number | null;
  /** Logic jumps: answer key (choice id, "yes" or "no") -> target question id or "end". */
  jumps?: Record<string, string>;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  properties: QuestionProperties;
  choices: Choice[];
}

export interface Theme {
  preset: string;
  background: string;
  question: string;
  answer: string;
  button: string;
  button_text: string;
  font: string;
}

export interface WelcomeScreen {
  enabled: boolean;
  title: string;
  description: string;
  button_text: string;
}

export interface ThankYouScreen {
  title: string;
  description: string;
}

export interface FormSettings {
  welcome_screen: WelcomeScreen;
  thank_you_screen: ThankYouScreen;
}

export type FormStatus = "draft" | "published";

export interface FormListItem {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  theme: Theme;
  response_count: number;
  question_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Form {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  theme: Theme;
  settings: FormSettings;
  questions: Question[];
  response_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type PublicForm = Pick<Form, "id" | "title" | "slug" | "theme" | "settings" | "questions">;

export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;

export interface AnswerOut {
  question_id: string;
  text: string | null;
  number: number | null;
  boolean: boolean | null;
  choice_ids: string[];
  display: string;
}

export interface ResponseOut {
  id: string;
  started_at: string | null;
  submitted_at: string;
  answers: AnswerOut[];
}

export interface ResponseList {
  total: number;
  items: ResponseOut[];
}

export interface ChoiceStat {
  id: string | null;
  label: string;
  count: number;
  percent: number;
}

export interface QuestionSummary {
  question_id: string;
  type: QuestionType;
  title: string;
  answered: number;
  skipped: number;
  choices: ChoiceStat[] | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  latest: string[] | null;
}

export interface FormSummary {
  views: number;
  starts: number;
  submissions: number;
  completion_rate: number | null;
  average_time_seconds: number | null;
  questions: QuestionSummary[];
}

export interface User {
  id: number;
  name: string;
  email: string;
}
