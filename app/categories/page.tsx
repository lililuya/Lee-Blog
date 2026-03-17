import Link from "next/link";
import { FolderTree } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getCategoryArchive, getTagArchive } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, tags] = await Promise.all([getCategoryArchive(), getTagArchive(12)]);
  const topCategory = categories[0] ?? null;
  const totalPosts = categories.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Categories"
          title="Browse blog categories"
          description="Categories keep the long-form blog organized at a higher level than tags, so essays and project writeups stay easy to scan by theme."
          href="/tags"
          linkLabel="Browse tags"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Categories</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{categories.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Distinct blog groupings currently visible on the public site.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Published posts</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{totalPosts}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Long-form articles currently filed into those categories.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Top category</p>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">
              {topCategory?.category ?? "None yet"}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {topCategory
                ? `${topCategory.count} published posts currently live in this category.`
                : "Publish at least one categorized post to build this index."}
            </p>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {categories.map((item) => (
              <Link
                key={item.category}
                href={`/categories/${encodeURIComponent(item.category)}`}
                className="glass-card rounded-[2rem] p-6 transition hover:-translate-y-1 hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      <FolderTree className="h-4 w-4" />
                      Category
                    </div>
                    <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{item.category}</h2>
                  </div>
                  <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                    {item.count}
                  </span>
                </div>

                <div className="mt-5 rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Latest post</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                    {item.latestPublishedAt ? formatDate(item.latestPublishedAt, "yyyy-MM-dd") : "N/A"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            No public categories are available yet. Publish categorized blog posts to make this archive useful.
          </div>
        )}

        <section className="glass-card rounded-[2rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Cross-link</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Popular tags</h2>
            </div>
            <Link href="/tags" className="section-link-pill section-link-pill--compact">
              Open tags
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {tags.map((item) => (
              <Link
                key={item.tag}
                href={`/tags/${encodeURIComponent(item.tag)}`}
                className="rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                #{item.tag} · {item.count}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
