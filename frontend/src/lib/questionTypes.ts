import {
  AlignLeft,
  ChevronDownCircle,
  CircleCheck,
  Hash,
  type LucideIcon,
  Mail,
  Star,
  Type,
  ListChecks,
  Upload,
} from "lucide-react";
import type { Question, QuestionType } from "./types";
import { uid } from "./utils";

export interface QuestionTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Chip background used in the builder sidebar and add-content modal. */
  color: string;
  description: string;
}

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeMeta> = {
  short_text: { label: "Short Text", icon: Type, color: "#C8DCFF", description: "One line answers" },
  long_text: { label: "Long Text", icon: AlignLeft, color: "#C8DCFF", description: "Paragraph answers" },
  email: { label: "Email", icon: Mail, color: "#FFC9D7", description: "Valid email addresses" },
  number: { label: "Number", icon: Hash, color: "#FFDFB0", description: "Numeric answers with limits" },
  multiple_choice: { label: "Multiple Choice", icon: ListChecks, color: "#DCCFFF", description: "Pick one or many" },
  dropdown: { label: "Dropdown", icon: ChevronDownCircle, color: "#DCCFFF", description: "Long lists of options" },
  yes_no: { label: "Yes/No", icon: CircleCheck, color: "#DCCFFF", description: "A simple yes or no" },
  rating: { label: "Rating", icon: Star, color: "#C3EBD4", description: "Stars or a number scale" },
  file_upload: { label: "File Upload", icon: Upload, color: "#FFDFB0", description: "Files up to 10 MB" },
};

export const QUESTION_GROUPS: { title: string; types: QuestionType[]; comingSoon?: string[] }[] = [
  { title: "Contact info", types: ["email"], comingSoon: ["Phone Number", "Address", "Website"] },
  { title: "Choice", types: ["multiple_choice", "dropdown", "yes_no"], comingSoon: ["Picture Choice", "Checkbox", "Legal"] },
  { title: "Rating & ranking", types: ["rating"], comingSoon: ["Opinion Scale", "Ranking", "Matrix", "Net Promoter Score®"] },
  { title: "Text & Video", types: ["short_text", "long_text"], comingSoon: ["Video and Audio", "Clarify with AI"] },
  { title: "Other", types: ["number", "file_upload"], comingSoon: ["Date", "Payment", "Calendly"] },
];

export const isChoiceType = (type: QuestionType) => type === "multiple_choice" || type === "dropdown";

export function defaultProperties(type: QuestionType): Question["properties"] {
  switch (type) {
    case "multiple_choice":
      return { allow_multiple: false };
    case "rating":
      return { steps: 5, shape: "star" };
    case "number":
      return { min: null, max: null };
    default:
      return {};
  }
}

export function createQuestion(type: QuestionType): Question {
  return {
    id: uid(),
    type,
    title: "",
    description: null,
    required: false,
    properties: defaultProperties(type),
    choices: isChoiceType(type)
      ? [
          { id: uid(), label: "Choice 1" },
          { id: uid(), label: "Choice 2" },
        ]
      : [],
  };
}

/** Change a question's type, keeping whatever still makes sense. */
export function convertQuestion(question: Question, type: QuestionType): Question {
  const choices = isChoiceType(type)
    ? question.choices.length
      ? question.choices
      : createQuestion(type).choices
    : [];
  return { ...question, type, properties: defaultProperties(type), choices };
}
