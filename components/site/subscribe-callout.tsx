import Link from "next/link";
import { BellRing, Mail, Rss, Tags } from "lucide-react";
import { normalizeTaxonomyValue } from "@/lib/utils";

type SubscribeCalloutProps = {
  title: string;
  description: string;
  categories?: string[];
  tags?: string[];
  source?: "post" | "note" | "digest" | "category" | "tag";
  prefillDigest?: boolean;
};

function uniqueFilters(values: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const normalized = normalizeTaxonomyValue(trimmed);

    if (!trimmed || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function buildSubscribeHref(input: {
  categories?: string[];
  tags?: string[];
  source?: SubscribeCalloutProps["source"];
  prefillDigest?: boolean;
}) {
  const categories = uniqueFilters(input.categories ?? [], 3);
  const tags = uniqueFilters(input.tags ?? [], 6);
  const params = new URLSearchParams();

  for (const category of categories) {
    params.append("category", category);
  }

  for (const tag of tags) {
    params.append("tag", tag);
  }

  if (input.source) {
    params.set("source", input.source);
  }

  if (input.prefillDigest) {
    params.set("digests", "1");
  }

  const query = params.toString();
  return query ? `/subscribe?${query}` : "/subscribe";
}

export function SubscribeCallout({
  title,
  description,
  categories = [],
  tags = [],
  source,
  prefillDigest = false,
}: SubscribeCalloutProps) {
  const visibleCategories = uniqueFilters(categories, 3);
  const visibleTags = uniqueFilters(tags, 6);
  const subscribeHref = buildSubscribeHref({
    categories: visibleCategories,
    tags: visibleTags,
    source,
    prefillDigest,
  });

  if (visibleCategories.length === 0 && visibleTags.length === 0 && !prefillDigest) {
    return null;
  }

  return (
    <section className="editorial-section space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <BellRing className="h-4 w-4" />
            邮件订阅
          </div>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {title}
          </h2>
          <p className="editorial-separator-copy">{description}</p>
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            {prefillDigest
              ? "这个预填会顺便勾选每周周报，并保留相关文章提醒的筛选条件。"
              : "邮件提醒只会在首次发布时发送，后续编辑不会重复通知。"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={subscribeHref} className="btn-primary">
            <Mail className="h-4 w-4" />
            一键带入订阅
          </Link>
          <Link href="/feed.xml" className="btn-secondary">
            <Rss className="h-4 w-4" />
            RSS 订阅
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {visibleCategories.map((category) => (
          <span
            key={`category-${category}`}
            className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[rgba(27,107,99,0.08)] px-4 py-2 text-sm font-medium text-[var(--accent-strong)]"
          >
            <Tags className="h-3.5 w-3.5" />
            分类：{category}
          </span>
        ))}
        {visibleTags.map((tag) => (
          <span
            key={`tag-${tag}`}
            className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[rgba(168,123,53,0.1)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
          >
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}
