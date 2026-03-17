import Link from "next/link";
import { ArrowLeft, ArrowRight, Layers3 } from "lucide-react";

type SeriesNavEntry = {
  title: string;
  href: string;
  kindLabel: string;
};

type ContentSeriesNavProps = {
  series: {
    title: string;
    slug: string;
    summary: string;
    totalCount: number;
  };
  currentIndex: number;
  previous: SeriesNavEntry | null;
  next: SeriesNavEntry | null;
};

export function ContentSeriesNav({
  series,
  currentIndex,
  previous,
  next,
}: ContentSeriesNavProps) {
  return (
    <section className="space-y-5 rounded-[2rem] border border-black/8 bg-white/72 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
      <div className="space-y-2">
        <p className="section-kicker">Series</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">{series.title}</h2>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">{series.summary}</p>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
          <Layers3 className="h-4 w-4" />
          Part {currentIndex + 1} of {series.totalCount}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {previous ? (
          <Link
            href={previous.href}
            className="group rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.84)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
          >
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              <ArrowLeft className="h-4 w-4" />
              Previous in series
            </div>
            <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
              {previous.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{previous.kindLabel}</p>
          </Link>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.52)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            This is the first published entry in the series.
          </div>
        )}

        {next ? (
          <Link
            href={next.href}
            className="group rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.84)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
          >
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              Next in series
              <ArrowRight className="h-4 w-4" />
            </div>
            <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
              {next.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{next.kindLabel}</p>
          </Link>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.52)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            This is currently the newest published entry in the series.
          </div>
        )}
      </div>

      <Link href={`/series/${series.slug}`} className="section-link-pill section-link-pill--compact">
        Open full series
      </Link>
    </section>
  );
}
