import { GalleryCard } from "@/components/site/gallery-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublishedGalleryAlbums } from "@/lib/gallery-queries";

export const dynamic = "force-dynamic";

export default async function GalleryIndexPage() {
  const albums = await getPublishedGalleryAlbums();
  const featuredAlbums = albums.filter((album) => album.featured).length;
  const totalImages = albums.reduce((total, album) => total + album._count.images, 0);

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Gallery"
          title="Visual albums"
          description="Curated image collections for field notes, travel records, visual archives, interfaces, and other photo-led stories that work better as sequences than as single images inside a blog post."
          href="/archive"
          linkLabel="Browse archive"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Published albums</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{albums.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Standalone visual stories that sit alongside essays and notes.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Featured albums</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{featuredAlbums}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Mark standout visual sets so they can be highlighted later on the homepage or landing pages.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Images</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{totalImages}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              A lightweight archive for visual material that deserves its own reading rhythm.
            </p>
          </div>
        </div>

        {albums.length > 0 ? (
          <div className="data-grid">
            {albums.map((album) => (
              <GalleryCard key={album.slug} album={album} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            No published galleries are available yet. Create one in the admin console to start a
            visual archive.
          </div>
        )}
      </div>
    </div>
  );
}
