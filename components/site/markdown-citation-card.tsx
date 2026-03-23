import Link from "next/link";
import { ArrowUpRight, ExternalLink, Quote } from "lucide-react";
import type { PaperCitationCardData } from "@/lib/citation-cards";
import { getPaperReadingListAnchorId } from "@/lib/papers";

export function MarkdownCitationCard({ card }: { card: PaperCitationCardData }) {
  const readingTrailHref = card.arxivId
    ? `/papers/reading-list#${getPaperReadingListAnchorId(card.arxivId)}`
    : null;

  return (
    <aside className="my-8 overflow-hidden rounded-[1.5rem] border border-black/8 bg-[var(--panel-soft)] shadow-[0_18px_38px_rgba(20,33,43,0.06)]">
      <div className="border-b border-black/8 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              <Quote className="h-4 w-4" />
              Paper highlight
            </div>
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
              {card.title}
            </h3>
            {(card.authors || card.year || card.arxivId) && (
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                {card.authors ?? ""}
                {card.year ? ` / ${card.year}` : ""}
                {card.arxivId ? ` / ${card.arxivId}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {readingTrailHref ? (
              <Link href={readingTrailHref} className="btn-secondary">
                <ArrowUpRight className="h-4 w-4" />
                View reading trail
              </Link>
            ) : null}
            {card.url ? (
              <a
                href={card.url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                Open paper
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <blockquote className="border-l-4 border-[var(--accent)] pl-4 text-base leading-8 text-[var(--ink)]">
          {card.quote}
        </blockquote>
        {card.note ? (
          <p className="text-sm leading-7 text-[var(--ink-soft)]">{card.note}</p>
        ) : null}
      </div>
    </aside>
  );
}
