"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ExternalLink, Quote, Search } from "lucide-react";
import { buildPaperCitationCardSnippet } from "@/lib/citation-cards";

export type PaperHighlightInsertItem = {
  id: string;
  title: string;
  authors: string[];
  paperUrl: string;
  arxivId: string;
  primaryCategory?: string | null;
  publishedAt?: string | null;
  quote: string;
  note?: string | null;
};

type PaperHighlightInserterProps = {
  formId: string;
  items: PaperHighlightInsertItem[];
  textareaName?: string;
};

function buildSearchText(item: PaperHighlightInsertItem) {
  return [
    item.title,
    item.authors.join(" "),
    item.quote,
    item.note ?? "",
    item.primaryCategory ?? "",
    item.arxivId,
  ]
    .join(" ")
    .toLowerCase();
}

function formatYear(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear());
}

export function PaperHighlightInserter({
  formId,
  items,
  textareaName = "content",
}: PaperHighlightInserterProps) {
  const [query, setQuery] = useState("");
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => buildSearchText(item).includes(normalizedQuery));
  }, [items, normalizedQuery]);

  function insertCard(item: PaperHighlightInsertItem) {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const field = form.elements.namedItem(textareaName);

    if (!(field instanceof HTMLTextAreaElement)) {
      return;
    }

    const snippet = buildPaperCitationCardSnippet({
      title: item.title,
      authors: item.authors.join(", "),
      url: item.paperUrl,
      quote: item.quote,
      note: item.note ?? "",
      year: formatYear(item.publishedAt),
      arxivId: item.arxivId,
    });
    const selectionStart = field.selectionStart ?? field.value.length;
    const selectionEnd = field.selectionEnd ?? field.value.length;
    const prefix = selectionStart > 0 && !/\n\s*\n$/.test(field.value.slice(0, selectionStart))
      ? "\n\n"
      : "";
    const suffix =
      selectionEnd < field.value.length && !/^\s*\n\s*\n/.test(field.value.slice(selectionEnd))
        ? "\n\n"
        : "\n";

    field.focus();
    field.setRangeText(`${prefix}${snippet}${suffix}`, selectionStart, selectionEnd, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
    setLastInsertedId(item.id);
  }

  return (
    <details className="editorial-note-box p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
              引文卡片
            </div>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
              插入论文高亮
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              把已保存的论文高亮直接插入到 Markdown 正文里，生成结构化引文卡片。
            </p>
          </div>
          <div className="rounded-full border border-black/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            {items.length} 条可用
          </div>
        </div>
      </summary>

      {items.length > 0 ? (
        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">搜索高亮</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field pl-11"
                placeholder="按论文标题、作者、摘录内容或 arXiv ID 搜索"
              />
            </div>
          </label>

          <div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <article key={item.id} className="rounded-[1.3rem] border border-black/8 bg-[var(--panel-soft)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                          <Quote className="h-3.5 w-3.5" />
                          高亮摘录
                        </span>
                        {item.primaryCategory ? <span>{item.primaryCategory}</span> : null}
                        <span>{item.arxivId}</span>
                      </div>
                      <h4 className="font-serif text-xl font-semibold leading-tight tracking-tight text-[var(--ink)]">
                        {item.title}
                      </h4>
                      <p className="text-sm leading-7 text-[var(--ink-soft)]">
                        {item.authors.join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => insertCard(item)}
                        className="btn-secondary"
                      >
                        插入卡片
                      </button>
                      <a
                        href={item.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                      >
                        <ExternalLink className="h-4 w-4" />
                        论文链接
                      </a>
                    </div>
                  </div>

                  <blockquote className="mt-4 rounded-[1rem] border-l-4 border-[var(--accent)] bg-[rgba(27,107,99,0.06)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                    {item.quote}
                  </blockquote>

                  {item.note ? (
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.note}</p>
                  ) : null}

                  {lastInsertedId === item.id ? (
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                      已插入编辑器
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-black/10 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                没有匹配当前搜索的已保存高亮。
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.2rem] border border-dashed border-black/10 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
          还没有可用的论文高亮。先去{" "}
          <span className="font-semibold text-[var(--ink)]">我的论文库</span> 保存论文并标注高亮，
          然后再回到这里把它们转成引文卡片。
        </div>
      )}
    </details>
  );
}
