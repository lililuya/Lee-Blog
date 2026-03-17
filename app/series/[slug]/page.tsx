import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Layers3 } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublicContentSeriesBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getPublicContentSeriesBySlug(slug);

  if (!series) {
    notFound();
  }

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Series"
          title={series.title}
          description={series.summary}
          href="/series"
          linkLabel="All series"
        />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Items</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{series.totalCount}</p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Posts</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{series.postCount}</p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Notes</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{series.noteCount}</p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Digests</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{series.digestCount}</p>
          </div>
        </div>

        <section className="glass-card rounded-[2rem] p-6">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <Layers3 className="h-4 w-4" />
            Series overview
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-[var(--ink-soft)]">{series.description}</p>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Reading order</h2>
          </div>

          <div className="grid gap-4">
            {series.entries.map((entry, index) => (
              <Link
                key={`${entry.type}-${entry.id}`}
                href={entry.href}
                className="glass-card rounded-[1.8rem] p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                      <span className="rounded-full bg-[rgba(27,107,99,0.08)] px-3 py-1 font-semibold text-[var(--accent-strong)]">
                        Part {index + 1}
                      </span>
                      <span>{entry.kindLabel}</span>
                      <span>{formatDate(entry.publishedAt, "yyyy-MM-dd")}</span>
                    </div>
                    <h3 className="font-serif text-2xl font-semibold tracking-tight">{entry.title}</h3>
                    <p className="max-w-4xl text-sm leading-7 text-[var(--ink-soft)]">{entry.summary}</p>
                  </div>

                  {entry.seriesOrder ? (
                    <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3 text-sm font-semibold text-[var(--ink)]">
                      Order {entry.seriesOrder}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
