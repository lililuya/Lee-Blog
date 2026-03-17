import { notFound } from "next/navigation";
import { BookOpenText, FolderTree } from "lucide-react";
import { PostCard } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getCategoryDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const detail = await getCategoryDetail(category);

  if (!detail) {
    notFound();
  }

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Category"
          title={detail.category}
          description="This category page gathers blog posts that belong to the same higher-level track, so related essays stay easy to browse together."
          href="/categories"
          linkLabel="All categories"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Posts</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{detail.total}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Published long-form entries currently grouped under this category.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Scope</p>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">Long-form only</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Categories are used on blog posts, while notes stay connected primarily through tags.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Browse mode</p>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">Sequential reading</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              A good fit for reading several essays in the same theme without running a keyword search.
            </p>
          </div>
        </div>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Posts in this category</h2>
          </div>
          <div className="data-grid">
            {detail.posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Why categories and tags both exist</h2>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-[var(--ink-soft)]">
            Categories organize the blog at a broad structural level. Tags stay more granular and can connect both essays and evergreen notes across module boundaries.
          </p>
        </section>
      </div>
    </div>
  );
}
