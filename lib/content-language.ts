export const DEFAULT_CONTENT_LANGUAGE = "en-US";

export const COMMON_CONTENT_LANGUAGE_OPTIONS = [
  { value: "en-US", label: "英文" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁体中文" },
  { value: "ja-JP", label: "日文" },
] as const;

const CONTENT_LANGUAGE_LABELS: Record<string, string> = {
  en: "英文",
  "en-us": "英文",
  zh: "中文",
  "zh-cn": "简体中文",
  "zh-tw": "繁体中文",
  ja: "日文",
  "ja-jp": "日文",
};

const CONTENT_LANGUAGE_SHORT_LABELS: Record<string, string> = {
  en: "EN",
  "en-us": "EN",
  zh: "ZH",
  "zh-cn": "简中",
  "zh-tw": "繁中",
  ja: "JA",
  "ja-jp": "JA",
};

export function normalizeContentLanguage(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || DEFAULT_CONTENT_LANGUAGE;
}

export function formatContentLanguageLabel(value: string | null | undefined) {
  const normalized = normalizeContentLanguage(value).toLowerCase();
  return (
    CONTENT_LANGUAGE_LABELS[normalized] ??
    CONTENT_LANGUAGE_LABELS[normalized.split("-", 1)[0] ?? ""] ??
    normalizeContentLanguage(value)
  );
}

export function formatContentLanguageShortLabel(value: string | null | undefined) {
  const normalized = normalizeContentLanguage(value).toLowerCase();
  return (
    CONTENT_LANGUAGE_SHORT_LABELS[normalized] ??
    CONTENT_LANGUAGE_SHORT_LABELS[normalized.split("-", 1)[0] ?? ""] ??
    normalizeContentLanguage(value).toUpperCase()
  );
}
