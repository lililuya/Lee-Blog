import Link from "next/link";
import { ArrowUpRight, Images, Sparkles } from "lucide-react";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { formatDate } from "@/lib/utils";

type GalleryCardProps = {
  album: {
    title: string;
    slug: string;
    summary: string;
    description: string;
    coverImageUrl: string | null;
    featured: boolean;
    tags: string[];
    publishedAt: Date | string | null;
    _count: {
      images: number;
    };
    images?: Array<{
      imageUrl: string;
      alt: string;
    }>;
  };
};

export function GalleryCard({ album }: GalleryCardProps) {
  const coverUrl = album.coverImageUrl || album.images?.[0]?.imageUrl || null;
  const title = album.title || "Untitled gallery";
  const summary = album.summary || "This gallery is published without a summary yet.";

  return (
    <article className="glass-card group overflow-hidden rounded-[2rem] transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]">
      <div className="relative min-h-[14rem] overflow-hidden border-b border-black/8 bg-[rgba(20,33,43,0.05)]">
        {coverUrl ? (
          <div
            className="min-h-[14rem] bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
            style={{ backgroundImage: `url("${coverUrl}")` }}
          />
        ) : (
          <div className="flex min-h-[14rem] items-center justify-center text-sm font-semibold text-[var(--ink-soft)]">
            Gallery cover pending
          </div>
        )}

        <div className="absolute inset-x-4 top-4 flex flex-wrap items-center gap-2">
          <span className="badge-soft bg-[rgba(255,255,255,0.84)] text-[var(--ink)]">
            <Images className="h-3.5 w-3.5" />
            {album._count.images} images
          </span>
          {album.featured ? (
            <span className="badge-soft bg-[rgba(27,107,99,0.88)] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Featured
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="space-y-3">
          <div className="text-sm text-[var(--ink-soft)]">{formatDate(album.publishedAt)}</div>
          <h3 className="font-serif text-3xl font-semibold tracking-tight">{title}</h3>
          <p className="line-clamp-3 text-sm leading-7 text-[var(--ink-soft)]">{summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {album.tags.slice(0, 5).map((tag) => (
            <TagLinkPill key={`${album.slug}-${tag}`} tag={tag} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-[var(--ink-soft)]">
            Curated visual collection with a dedicated detail page.
          </div>
          <Link href={`/gallery/${album.slug}`} className="section-link-pill section-link-pill--compact">
            Open gallery
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
