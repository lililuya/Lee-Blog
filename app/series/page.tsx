import Link from "next/link";
import { Layers3, Star } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublicContentSeries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SeriesIndexPage() {
  const seriesList = await getPublicContentSeries();

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Series"
          title="Curated reading series"
          description="Follow connected posts, notes, and weekly digests as guided tracks instead of isolated pages."
          href="/archive"
          linkLabel="Browse archive"
        />

        {seriesList.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {seriesList.map((series) => (
              <Link
                key={series.id}
                href={`/series/${series.slug}`}
                className="glass-card rounded-[2rem] p-6 transition hover:-translate-y-1 hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      <Layers3 className="h-4 w-4" />
                      Series
                    </div>
                    <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{series.title}</h2>
                  </div>
                  {series.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(168,123,53,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                      <Star className="h-3.5 w-3.5" />
                      Featured
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-8 text-[var(--ink-soft)]">{series.summary}</p>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Items</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{series.totalCount}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Posts</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{series.postCount}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Notes</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{series.noteCount}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Latest</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                      {series.latestPublishedAt ? formatDate(series.latestPublishedAt, "yyyy-MM-dd") : "N/A"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            No public series are available yet. Once you connect posts, notes, or digests into a curated track, they will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
