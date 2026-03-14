import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, pattern = "MMM d, yyyy") {
  if (!date) {
    return "TBD";
  }

  return format(new Date(date), pattern);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parseCsv(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripMarkdownToText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getContentStats(content: string) {
  const plainText = stripMarkdownToText(content);
  const characterCount = plainText.replace(/\s/g, "").length;
  const hanCharacterCount = (plainText.match(/\p{Script=Han}/gu) ?? []).length;
  const kanaAndHangulCount = (plainText.match(/[\u3040-\u30ff\uac00-\ud7af]/g) ?? []).length;
  const latinWordCount = (plainText.match(/\b[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*\b/g) ?? []).length;
  const wordCount = hanCharacterCount + kanaAndHangulCount + latinWordCount;
  const estimatedMinutes = Math.max(1, Math.round(Math.max(wordCount, 1) / 260));

  return {
    plainText,
    characterCount,
    hanCharacterCount,
    latinWordCount,
    wordCount,
    estimatedMinutes,
  };
}

export function estimateReadingTime(content: string) {
  return getContentStats(content).estimatedMinutes;
}

export function absoluteUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}