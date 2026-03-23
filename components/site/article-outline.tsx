import { ListTree } from "lucide-react";
import type { MarkdownHeading } from "@/lib/markdown";

type ArticleOutlineProps = {
  headings: MarkdownHeading[];
  contentLabel?: string;
};

export function ArticleOutline({
  headings,
  contentLabel = "本页目录",
}: ArticleOutlineProps) {
  const visibleHeadings = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);

  if (visibleHeadings.length === 0) {
    return null;
  }

  return (
    <aside className="xl:sticky xl:top-28 xl:self-start">
      <nav
        aria-label={contentLabel}
        className="editorial-note-box rounded-[1.4rem] border-l-0 p-4"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
          <ListTree className="h-4 w-4" />
          {contentLabel}
        </div>
        <div className="space-y-2">
          {visibleHeadings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className="block text-sm leading-6 text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
              style={{ paddingLeft: `${Math.max(0, heading.depth - 2) * 0.8}rem` }}
            >
              {heading.text}
            </a>
          ))}
        </div>
      </nav>
    </aside>
  );
}
