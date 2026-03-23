import { BookCopy, FileCode2 } from "lucide-react";
import { CopySnippet } from "@/components/ui/copy-snippet";

type CitationPanelProps = {
  citation: string;
  bibtex: string;
  title?: string;
  description?: string;
  defaultOpen?: boolean;
};

export function CitationPanel({
  citation,
  bibtex,
  title = "引用导出",
  description = "可以复制适合阅读展示的引用文本，或 BibTeX 条目，方便整理到笔记、参考文献或论文追踪列表中。",
  defaultOpen = false,
}: CitationPanelProps) {
  return (
    <details
      className="border-t border-black/8 pt-6"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <BookCopy className="h-4 w-4 text-[var(--accent)]" />
              {title}
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">{description}</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            <FileCode2 className="h-3.5 w-3.5" />
            已支持 BibTeX
          </span>
        </div>
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CopySnippet label="引用文本" value={citation} />
        <CopySnippet label="BibTeX" value={bibtex} mode="code" />
      </div>
    </details>
  );
}
