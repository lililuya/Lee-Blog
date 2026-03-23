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
    <section className="editorial-section space-y-6">
      <div className="space-y-2">
        <p className="section-kicker">专题</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">{series.title}</h2>
        <p className="editorial-separator-copy">{series.summary}</p>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
          <Layers3 className="h-4 w-4" />
          第 {currentIndex + 1} 篇，共 {series.totalCount} 篇
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {previous ? (
          <Link
            href={previous.href}
            className="editorial-panel group p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
          >
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              <ArrowLeft className="h-4 w-4" />
              上一篇
            </div>
            <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
              {previous.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{previous.kindLabel}</p>
          </Link>
        ) : (
          <div className="editorial-panel editorial-panel--soft rounded-[1.6rem] border-dashed p-5 text-sm leading-7 text-[var(--ink-soft)]">
            这是这个专题里最早发布的一篇。
          </div>
        )}

        {next ? (
          <Link
            href={next.href}
            className="editorial-panel group p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
          >
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              下一篇
              <ArrowRight className="h-4 w-4" />
            </div>
            <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
              {next.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{next.kindLabel}</p>
          </Link>
        ) : (
          <div className="editorial-panel editorial-panel--soft rounded-[1.6rem] border-dashed p-5 text-sm leading-7 text-[var(--ink-soft)]">
            这是这个专题里目前最新发布的一篇。
          </div>
        )}
      </div>

      <Link href={`/series/${series.slug}`} className="section-link-pill section-link-pill--compact">
        查看完整专题
      </Link>
    </section>
  );
}
