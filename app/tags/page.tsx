import Link from "next/link";
import { Hash } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getCategoryArchive, getTagArchive } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const [tags, categories] = await Promise.all([getTagArchive(), getCategoryArchive(8)]);
  const topTag = tags[0] ?? null;
  const totalAssignments = tags.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Tags"
          title="Browse by tag"
          description="Tags connect related blog posts and evergreen notes across the site, so you can follow one idea without jumping between unrelated sections."
          href="/categories"
          linkLabel="Browse categories"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">All tags</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{tags.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Distinct topics currently used across published posts and notes.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Tagged entries</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{totalAssignments}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Total tag assignments across public writing and reference material.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Top tag</p>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">
              {topTag ? `#${topTag.tag}` : "None yet"}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {topTag
                ? `Used in ${topTag.count} published entries so far.`
                : "Add tags to published posts or notes to build a topic directory."}
            </p>
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {tags.map((item) => (
              <Link
                key={item.tag}
                href={`/tags/${encodeURIComponent(item.tag)}`}
                className="glass-card rounded-[2rem] p-6 transition hover:-translate-y-1 hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      <Hash className="h-4 w-4" />
                      Tag
                    </div>
                    <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">#{item.tag}</h2>
                  </div>
                  <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                    {item.count}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Posts</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{item.postCount}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Notes</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{item.noteCount}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Latest</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                      {item.latestPublishedAt ? formatDate(item.latestPublishedAt, "yyyy-MM-dd") : "N/A"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            No public tags are available yet. Publish posts or notes with tags to start building the topic index.
          </div>
        )}

        <section className="glass-card rounded-[2rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Cross-link</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Related categories</h2>
            </div>
            <Link href="/categories" className="section-link-pill section-link-pill--compact">
              Open categories
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((item) => (
              <Link
                key={item.category}
                href={`/categories/${encodeURIComponent(item.category)}`}
                className="rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                {item.category} · {item.count}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
