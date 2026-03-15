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
  title = "Citation export",
  description = "Copy a reader-facing citation or the BibTeX entry for your notes, references, or literature tracker.",
  defaultOpen = false,
}: CitationPanelProps) {
  return (
    <details
      className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4"
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
            BibTeX ready
          </span>
        </div>
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CopySnippet label="Citation" value={citation} />
        <CopySnippet label="BibTeX" value={bibtex} mode="code" />
      </div>
    </details>
  );
}
