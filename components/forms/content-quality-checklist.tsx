"use client";

import { useEffect, useState } from "react";
import { getContentStats } from "@/lib/utils";

type ContentChecklistKind = "post" | "note";

type ChecklistInput = {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  noteType?: string | null;
  tags?: string[] | string | null;
  status?: string | null;
  publishedAt?: string | null;
  coverImageUrl?: string | null;
};

type ChecklistItem = {
  label: string;
  passed: boolean;
  detail: string;
};

type ChecklistReport = {
  readyToPublish: boolean;
  essentialChecks: ChecklistItem[];
  recommendationChecks: ChecklistItem[];
  metrics: {
    characterCount: number;
    estimatedMinutes: number;
    headingCount: number;
    tagCount: number;
    summaryLength: number;
  };
  status: string;
};

function normalizeTags(tags: ChecklistInput["tags"]) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function readFieldValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);

  if (!field) {
    return "";
  }

  if (field instanceof RadioNodeList) {
    return typeof field.value === "string" ? field.value : "";
  }

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    return field.value;
  }

  return "";
}

function readChecklistInput(form: HTMLFormElement, kind: ContentChecklistKind): ChecklistInput {
  return {
    title: readFieldValue(form, "title"),
    summary: readFieldValue(form, kind === "post" ? "excerpt" : "summary"),
    content: readFieldValue(form, "content"),
    category: kind === "post" ? readFieldValue(form, "category") : null,
    noteType: kind === "note" ? readFieldValue(form, "noteType") : null,
    tags: readFieldValue(form, "tags"),
    status: readFieldValue(form, "status"),
    publishedAt: readFieldValue(form, "publishedAt"),
    coverImageUrl: kind === "post" ? readFieldValue(form, "coverImageUrl") : null,
  };
}

function buildChecklistReport(kind: ContentChecklistKind, input: ChecklistInput): ChecklistReport {
  const title = (input.title ?? "").trim();
  const summary = (input.summary ?? "").trim();
  const content = input.content ?? "";
  const category = (input.category ?? "").trim();
  const noteType = (input.noteType ?? "").trim();
  const tags = normalizeTags(input.tags);
  const status = (input.status ?? "DRAFT").trim().toUpperCase();
  const publishedAt = (input.publishedAt ?? "").trim();
  const coverImageUrl = (input.coverImageUrl ?? "").trim();
  const contentStats = getContentStats(content);
  const headingCount = (content.match(/^#{1,6}\s+/gm) ?? []).length;
  const minimumCharacters = kind === "post" ? 1200 : 500;

  const essentialChecks: ChecklistItem[] = [
    {
      label: "标题表达清楚",
      passed: title.length >= 12,
      detail:
        title.length >= 12
          ? "标题长度已经足够，能清楚传达具体主题。"
          : "建议至少写到 12 个字符，让读者一眼就知道主题是什么。",
    },
    {
      label: kind === "post" ? "已设置分类" : "已设置笔记类型",
      passed: kind === "post" ? category.length > 0 : noteType.length > 0,
      detail:
        kind === "post"
          ? category.length > 0
            ? "这篇文章已经有分类，便于归档页和推荐位使用。"
            : "请补充分类，这样文章才能正确进入归档页和分类页。"
          : noteType.length > 0
            ? "这篇笔记已经带有可复用的类型标签。"
            : "请补充笔记类型，方便读者快速判断它的用途。",
    },
    {
      label: kind === "post" ? "摘要已准备好" : "简介已准备好",
      passed: summary.length >= 60,
      detail:
        summary.length >= 60
          ? "短描述长度足够，适合卡片、订阅流和搜索预览使用。"
          : "建议至少写到 60 个字符，让卡片、订阅流和搜索预览更完整。",
    },
    {
      label: "正文内容足够扎实",
      passed: contentStats.characterCount >= minimumCharacters,
      detail:
        contentStats.characterCount >= minimumCharacters
          ? `当前正文已有 ${contentStats.characterCount} 个非空白字符。`
          : `建议在发布前继续补充内容，当前正文长度为 ${contentStats.characterCount}/${minimumCharacters} 字符。`,
    },
    {
      label: "至少设置了一个标签",
      passed: tags.length >= 1,
      detail:
        tags.length >= 1
          ? "标签发现和相关推荐已经可以使用这条内容。"
          : "请至少补充一个标签，方便相关推荐和标签页收录。",
    },
    {
      label: "发布状态带有时间戳",
      passed: status !== "PUBLISHED" || publishedAt.length > 0,
      detail:
        status !== "PUBLISHED" || publishedAt.length > 0
          ? "当前状态下的发布时间设置有效。"
          : "如果要发布，请先填写发布时间。",
    },
  ];

  const recommendationChecks: ChecklistItem[] = [
    {
      label: "标题适合搜索和分享卡片",
      passed: title.length >= 18 && title.length <= 70,
      detail:
        title.length >= 18 && title.length <= 70
          ? "标题长度处在比较适合 SEO 和分享卡片的区间。"
          : "一般 18 到 70 个字符的标题，在预览卡片里阅读体验更好。",
    },
    {
      label: "短描述更完整",
      passed: summary.length >= 90 && summary.length <= 220,
      detail:
        summary.length >= 90 && summary.length <= 220
          ? "短描述长度比较适合做预览和元信息。"
          : "更成熟的摘要通常会落在 90 到 220 个字符之间。",
    },
    {
      label: "正文结构使用了标题层级",
      passed: headingCount >= (kind === "post" ? 2 : 1),
      detail:
        headingCount >= (kind === "post" ? 2 : 1)
          ? `当前正文已经包含 ${headingCount} 个 Markdown 标题。`
          : kind === "post"
            ? "建议至少补两个 Markdown 标题，方便扫读，也能改善文章大纲。"
            : "建议至少补一个 Markdown 标题，让笔记更容易浏览。",
    },
    {
      label: "主题覆盖更充分",
      passed: tags.length >= 2,
      detail:
        tags.length >= 2
          ? "多个标签可以帮助这条内容出现在更准确的发现路径里。"
          : "两个及以上标签通常更有利于相关推荐和归档导航。",
    },
    {
      label: "封面图已准备好",
      passed: kind !== "post" || coverImageUrl.length > 0,
      detail:
        kind !== "post"
          ? "笔记不强制要求封面图。"
          : coverImageUrl.length > 0
            ? "封面图已经设置完成，可以支持更完整的卡片和分享预览。"
            : "建议补一张封面图，提升首页卡片、OG 图和分享预览效果。",
    },
  ];

  return {
    readyToPublish: essentialChecks.every((item) => item.passed),
    essentialChecks,
    recommendationChecks,
    metrics: {
      characterCount: contentStats.characterCount,
      estimatedMinutes: contentStats.estimatedMinutes,
      headingCount,
      tagCount: tags.length,
      summaryLength: summary.length,
    },
    status,
  };
}

function checkToneClass(passed: boolean) {
  return passed
    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
    : "border-amber-200 bg-amber-50/80 text-amber-900";
}

export function ContentQualityChecklist({
  formId,
  kind,
  initialData,
}: {
  formId: string;
  kind: ContentChecklistKind;
  initialData: ChecklistInput;
}) {
  const [report, setReport] = useState<ChecklistReport>(() =>
    buildChecklistReport(kind, initialData),
  );

  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const sync = () => {
      setReport(buildChecklistReport(kind, readChecklistInput(form, kind)));
    };

    sync();
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);

    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }, [formId, kind]);

  const readyText =
    report.status === "PUBLISHED" && !report.readyToPublish
      ? "这条内容已标记为发布，但仍有一项或多项核心发布检查未通过。"
      : report.readyToPublish
        ? "核心发布检查状态良好。"
        : "核心发布检查还差一点点。";

  return (
    <section className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
            内容检查
          </div>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {kind === "post" ? "文章发布准备度" : "笔记发布准备度"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">{readyText}</p>
        </div>
        <div
          className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold ${checkToneClass(
            report.readyToPublish,
          )}`}
        >
          {report.essentialChecks.filter((item) => item.passed).length}/
          {report.essentialChecks.length} 项核心检查已通过
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.2rem] border border-black/8 bg-white/80 px-4 py-3">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            预计阅读
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
            {report.metrics.estimatedMinutes} 分钟
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-black/8 bg-white/80 px-4 py-3">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            正文字数
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
            {report.metrics.characterCount}
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-black/8 bg-white/80 px-4 py-3">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            标题数
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
            {report.metrics.headingCount}
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-black/8 bg-white/80 px-4 py-3">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            标签数
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
            {report.metrics.tagCount}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--ink)]">核心发布检查</h3>
          {report.essentialChecks.map((item) => (
            <div
              key={`essential-${item.label}`}
              className={`rounded-[1.2rem] border px-4 py-4 ${checkToneClass(item.passed)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{item.label}</div>
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
                  {item.passed ? "通过" : "待完善"}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--ink)]">发现性与质量优化</h3>
          {report.recommendationChecks.map((item) => (
            <div
              key={`recommendation-${item.label}`}
              className={`rounded-[1.2rem] border px-4 py-4 ${checkToneClass(item.passed)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{item.label}</div>
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
                  {item.passed ? "良好" : "可选"}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
