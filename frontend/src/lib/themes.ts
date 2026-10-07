import type { CSSProperties } from "react";
import type { Theme } from "./types";

export const THEME_PRESETS: Record<string, Theme & { name: string }> = {
  classic: {
    name: "Classic",
    preset: "classic",
    background: "#FFFFFF",
    question: "#191919",
    answer: "#0445AF",
    button: "#0445AF",
    button_text: "#FFFFFF",
    font: "Karla",
  },
  midnight: {
    name: "Midnight",
    preset: "midnight",
    background: "#1C1B3A",
    question: "#FFFFFF",
    answer: "#A9C7FF",
    button: "#A9C7FF",
    button_text: "#1C1B3A",
    font: "Montserrat",
  },
  lavender: {
    name: "Lavender",
    preset: "lavender",
    background: "#F1EDFF",
    question: "#2B1B5A",
    answer: "#6B4EFF",
    button: "#6B4EFF",
    button_text: "#FFFFFF",
    font: "Space Grotesk",
  },
  coral: {
    name: "Coral",
    preset: "coral",
    background: "#FFF1EC",
    question: "#4A1A0B",
    answer: "#D9472B",
    button: "#D9472B",
    button_text: "#FFFFFF",
    font: "Inter",
  },
  forest: {
    name: "Forest",
    preset: "forest",
    background: "#0F3B2E",
    question: "#F0EAD6",
    answer: "#BEE3B8",
    button: "#BEE3B8",
    button_text: "#0F3B2E",
    font: "Lora",
  },
  sand: {
    name: "Sand",
    preset: "sand",
    background: "#F5EEDC",
    question: "#3A2F1E",
    answer: "#8A5A2B",
    button: "#3A2F1E",
    button_text: "#F5EEDC",
    font: "Playfair Display",
  },
  ocean: {
    name: "Ocean",
    preset: "ocean",
    background: "#0B4F6C",
    question: "#FFFFFF",
    answer: "#9EE7FF",
    button: "#FFFFFF",
    button_text: "#0B4F6C",
    font: "DM Sans",
  },
  mono: {
    name: "Mono",
    preset: "mono",
    background: "#F4F4F4",
    question: "#000000",
    answer: "#000000",
    button: "#000000",
    button_text: "#FFFFFF",
    font: "Space Grotesk",
  },
};

export const FONTS = ["Karla", "Inter", "Montserrat", "Space Grotesk", "Lora", "Playfair Display", "DM Sans", "Poppins"];

export const DEFAULT_THEME: Theme = THEME_PRESETS.classic;

export function resolveTheme(theme: Partial<Theme> | undefined): Theme {
  return { ...DEFAULT_THEME, ...(theme ?? {}) };
}

/** CSS custom properties consumed by the respondent UI (see globals.css `.tf-theme`). */
export function themeStyle(theme: Partial<Theme> | undefined): CSSProperties {
  const t = resolveTheme(theme);
  return {
    "--tf-bg": t.background,
    "--tf-question": t.question,
    "--tf-answer": t.answer,
    "--tf-button": t.button,
    "--tf-button-text": t.button_text,
    "--tf-font": `"${t.font}", "Karla", system-ui, sans-serif`,
  } as CSSProperties;
}
