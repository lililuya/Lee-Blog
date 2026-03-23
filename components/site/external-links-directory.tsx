"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Blocks,
  BrainCircuit,
  ExternalLink,
  GraduationCap,
  NotebookTabs,
  Palette,
  Search,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExternalLinkCategory, ExternalLinkCategoryId, ExternalLinkEntry } from "@/lib/tool-links";

type ExternalLinksDirectoryProps = {
  categories: ExternalLinkCategory[];
  links: ExternalLinkEntry[];
};

const categoryIconMap: Record<ExternalLinkCategoryId, LucideIcon> = {
  research: GraduationCap,
  models: BrainCircuit,
  development: Blocks,
  coding: Trophy,
  knowledge: NotebookTabs,
  design: Palette,
};

function getHostnameLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function getFaviconUrl(entry: ExternalLinkEntry) {
  if (entry.iconUrl?.trim()) {
    return entry.iconUrl.trim();
  }

  try {
    const url = new URL(entry.href);
    return `${url.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function ExternalLinkIcon({ entry }: { entry: ExternalLinkEntry }) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = getFaviconUrl(entry);

  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.8)] text-lg font-semibold text-[var(--ink)] shadow-[0_10px_24px_rgba(20,33,43,0.05)]">
      {!failed && faviconUrl ? (
        <img
          src={faviconUrl}
          alt={`${entry.title} 图标`}
          className="h-6 w-6 rounded-md object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{entry.title.slice(0, 1)}</span>
      )}
    </span>
  );
}

export function ExternalLinksDirectory({
  categories,
  links,
}: ExternalLinksDirectoryProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | ExternalLinkCategoryId>("all");
  const deferredQuery = useDeferredValue(query);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ExternalLinkCategoryId, number>();

    for (const category of categories) {
      counts.set(category.id, 0);
    }

    for (const link of links) {
      counts.set(link.categoryId, (counts.get(link.categoryId) ?? 0) + 1);
    }

    return counts;
  }, [categories, links]);

  const filteredLinks = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return links.filter((link) => {
      if (activeCategory !== "all" && link.categoryId !== activeCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchText = [
        link.title,
        link.description,
        getHostnameLabel(link.href),
        ...link.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }, [activeCategory, deferredQuery, links]);

  const groupedLinks = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          links: filteredLinks.filter((link) => link.categoryId === category.id),
        }))
        .filter((category) => category.links.length > 0),
    [categories, filteredLinks],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
        <div className="editorial-panel p-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">搜索站点</span>
            <span className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.72)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--ink-soft)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="按名称、描述、标签或域名搜索"
                className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
              />
            </span>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                activeCategory === "all"
                  ? "border-[rgba(27,107,99,0.26)] bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]"
                  : "border-black/8 bg-[rgba(255,255,255,0.72)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
              )}
            >
              全部站点
            </button>
            {categories.map((category) => {
              const Icon = categoryIconMap[category.id];

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    activeCategory === category.id
                      ? "border-[rgba(27,107,99,0.26)] bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]"
                      : "border-black/8 bg-[rgba(255,255,255,0.72)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="editorial-note-box p-5 text-sm leading-7 text-[var(--ink-soft)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                导航说明
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                当前显示 {filteredLinks.length} / {links.length} 个站点
              </p>
            </div>
            <span className="badge-soft">可扩展配置</span>
          </div>
          <p className="mt-3">
            这里优先收纳你高频使用的站外网站。图标默认读取站点 favicon，描述和标签则方便你按工作流快速回忆“这个站是干什么的”。
          </p>
          <p className="mt-2">
            后续只要补充数据文件，就能继续扩充自己的个人导航库，不需要再改页面结构。
          </p>
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {categories.map((category) => {
          const Icon = categoryIconMap[category.id];
          const count = categoryCounts.get(category.id) ?? 0;

          return (
            <article key={category.id} className="editorial-note-box px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="badge-soft">{count}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--ink)]">{category.label}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                {category.description}
              </p>
            </article>
          );
        })}
      </div>

      {groupedLinks.length > 0 ? (
        <div className="space-y-6">
          {groupedLinks.map((category) => {
            const Icon = categoryIconMap[category.id];

            return (
              <section key={category.id} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                        {category.label}
                      </h3>
                      <p className="text-sm text-[var(--ink-soft)]">{category.description}</p>
                    </div>
                  </div>
                  <span className="badge-soft">{category.links.length} 个站点</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {category.links.map((entry) => (
                    <a
                      key={entry.id}
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group editorial-panel flex h-full flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-[rgba(27,107,99,0.26)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <ExternalLinkIcon entry={entry} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-semibold text-[var(--ink)]">
                                {entry.title}
                              </h4>
                              {entry.featured ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(168,123,53,0.12)] px-2.5 py-1 text-[0.72rem] font-semibold text-[var(--gold)]">
                                  <Star className="h-3.5 w-3.5" />
                                  常用
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                              {getHostnameLabel(entry.href)}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-[rgba(255,255,255,0.75)] text-[var(--ink-soft)] transition group-hover:text-[var(--accent-strong)]">
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      </div>

                      <p className="flex-1 text-sm leading-7 text-[var(--ink-soft)]">
                        {entry.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span key={`${entry.id}-${tag}`} className="badge-soft">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="editorial-panel p-6 text-sm leading-7 text-[var(--ink-soft)]">
          没有找到匹配的站点。你可以换个关键词，或者切回“全部站点”继续浏览。
        </div>
      )}
    </div>
  );
}
