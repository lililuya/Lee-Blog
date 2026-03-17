import Link from "next/link";
import { Images, Plus, Sparkles } from "lucide-react";
import { getAdminGalleryAlbums, getGalleryOverviewStats } from "@/lib/gallery-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getCoverUrl(album: Awaited<ReturnType<typeof getAdminGalleryAlbums>>[number]) {
  return album.coverImageUrl || album.images[0]?.imageUrl || null;
}

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const [{ deleted, error }, albums, stats] = await Promise.all([
    searchParams,
    getAdminGalleryAlbums(),
    getGalleryOverviewStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Gallery</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Gallery Management</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            Curate visual albums, order images, and publish standalone gallery pages alongside your
            blog, notes, and digests.
          </p>
        </div>
        <Link href="/admin/gallery/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          New gallery
        </Link>
      </div>

      {deleted === "1" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          Gallery album deleted.
        </div>
      ) : null}

      {error === "client" ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          The running Prisma client is older than the latest schema update. Restart the Next.js dev
          server once with <code>npm run dev</code>, then the Gallery module will work normally.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Albums</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{stats.totalAlbums}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Published</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{stats.publishedAlbums}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Featured</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{stats.featuredAlbums}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Images</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{stats.totalImages}</p>
        </div>
      </div>

      {albums.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {albums.map((album) => {
            const coverUrl = getCoverUrl(album);
            const title = album.title || "Untitled gallery";
            const summary = album.summary || "No summary yet.";

            return (
              <article key={album.id} className="glass-card overflow-hidden rounded-[2rem]">
                <div className="grid gap-0 md:grid-cols-[16rem_minmax(0,1fr)]">
                  <div className="min-h-[15rem] bg-[rgba(20,33,43,0.05)]">
                    {coverUrl ? (
                      <div
                        className="h-full min-h-[15rem] bg-cover bg-center"
                        style={{ backgroundImage: `url("${coverUrl}")` }}
                      />
                    ) : (
                      <div className="flex h-full min-h-[15rem] items-center justify-center text-sm font-semibold text-[var(--ink-soft)]">
                        No cover
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-soft">{album.status}</span>
                      {album.featured ? (
                        <span className="badge-soft bg-[rgba(27,107,99,0.1)] text-[var(--accent-strong)]">
                          <Sparkles className="h-3.5 w-3.5" />
                          Featured
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <h2 className="font-serif text-3xl font-semibold tracking-tight">{title}</h2>
                      <p className="text-sm leading-7 text-[var(--ink-soft)]">{summary}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.2rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                        <div className="font-semibold text-[var(--ink)]">Images</div>
                        <div>{album._count.images} item(s)</div>
                        <div>Author: {album.author.name}</div>
                      </div>
                      <div className="rounded-[1.2rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                        <div>Updated: {formatDate(album.updatedAt, "yyyy-MM-dd HH:mm")}</div>
                        <div>
                          Published:{" "}
                          {album.publishedAt ? formatDate(album.publishedAt, "yyyy-MM-dd HH:mm") : "Not published"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {album.tags.slice(0, 4).map((tag) => (
                          <span
                            key={`${album.id}-${tag}`}
                            className="rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <Link href={`/admin/gallery/${album.id}`} className="btn-secondary">
                        <Images className="h-4 w-4" />
                        Edit gallery
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
          No gallery albums yet. Create one to start publishing visual collections.
        </div>
      )}
    </div>
  );
}
