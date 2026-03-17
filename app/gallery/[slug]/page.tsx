/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Images, Sparkles, UserRound } from "lucide-react";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { getGalleryAlbumBySlug } from "@/lib/gallery-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getGalleryAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  const heroImageUrl = album.coverImageUrl || album.images[0]?.imageUrl || null;
  const title = album.title || "Untitled gallery";
  const summary = album.summary || "This gallery is published without a summary yet.";
  const description = album.description || "No description has been added for this gallery yet.";

  return (
    <div className="container-shell py-12 md:py-16">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/gallery" className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]">
          <ArrowLeft className="h-4 w-4" />
          Back to gallery
        </Link>
        <div className="hidden rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] md:inline-flex">
          Visual archive
        </div>
      </div>

      <article className="space-y-10">
        <header className="glass-card overflow-hidden rounded-[2.4rem]">
          {heroImageUrl ? (
            <div
              className="min-h-[18rem] border-b border-black/8 bg-cover bg-center md:min-h-[24rem]"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(20,33,43,0.06), rgba(20,33,43,0.16)), url("${heroImageUrl}")` }}
            />
          ) : null}

          <div className="p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
              <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">
                <Images className="h-3.5 w-3.5" />
                {album.images.length} images
              </span>
              {album.featured ? (
                <span className="badge-soft bg-[rgba(27,107,99,0.1)] text-[var(--accent-strong)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {formatDate(album.publishedAt)}
              </span>
            </div>

            <h1 className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{summary}</p>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                {album.author.name}
              </span>
              <span>Standalone image-led entry with sequential browsing.</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {album.tags.map((tag) => (
                <TagLinkPill key={tag} tag={tag} />
              ))}
            </div>

            <div className="mt-8 rounded-[1.6rem] border border-black/8 bg-white/72 p-5 text-sm leading-7 text-[var(--ink-soft)]">
              {description}
            </div>
          </div>
        </header>

        {album.images.length > 0 ? (
          <section className="space-y-5 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
            <div className="space-y-2">
              <p className="section-kicker">Sequence</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Image set</h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
                Scroll through the full gallery in curator-defined order. Each image can carry its own
                caption and timestamp.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {album.images.map((image, index) => (
                <figure
                  key={image.id}
                  className="overflow-hidden rounded-[1.8rem] border border-black/8 bg-[rgba(255,255,255,0.9)]"
                >
                  <a href={image.imageUrl} target="_blank" rel="noreferrer" className="block bg-[rgba(20,33,43,0.04)]">
                    <img
                      src={image.imageUrl}
                      alt={image.alt || image.caption || title}
                      className="h-auto w-full object-cover"
                      loading={index < 2 ? "eager" : "lazy"}
                    />
                  </a>

                  <figcaption className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
                      <span className="font-semibold text-[var(--ink)]">Image {index + 1}</span>
                      <span>
                        {image.shotAt ? formatDate(image.shotAt, "yyyy-MM-dd HH:mm") : "Shot time not specified"}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">
                      {image.caption || image.alt || "No caption yet."}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            This album has no images yet. Add image rows in the admin console to populate it.
          </div>
        )}
      </article>
    </div>
  );
}
