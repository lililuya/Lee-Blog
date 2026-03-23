/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, CalendarDays, Images, Sparkles, UserRound } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import {
  buildBreadcrumbJsonLd,
  buildContentMetadata,
  buildImageGalleryJsonLd,
} from "@/lib/content-seo";
import { getGalleryAlbumBySlug } from "@/lib/gallery-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedGalleryAlbum = cache(getGalleryAlbumBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = await getCachedGalleryAlbum(slug);

  if (!album) {
    return {
      title: "Gallery not found",
    };
  }

  const heroImageUrl = album.coverImageUrl || album.images[0]?.imageUrl || null;
  const title = album.title || "Untitled gallery";
  const summary = album.summary || "This gallery is published without a summary yet.";

  return buildContentMetadata({
    title,
    description: summary,
    path: `/gallery/${album.slug}`,
    image: heroImageUrl,
    imageAlt: title,
    keywords: ["gallery", ...album.tags],
    authorName: album.author.name,
    publishedAt: album.publishedAt,
    updatedAt: album.updatedAt,
    section: "Gallery",
    type: "article",
    ogEyebrow: "Gallery",
  });
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getCachedGalleryAlbum(slug);

  if (!album) {
    notFound();
  }

  const heroImageUrl = album.coverImageUrl || album.images[0]?.imageUrl || null;
  const title = album.title || "Untitled gallery";
  const summary = album.summary || "This gallery is published without a summary yet.";
  const description = album.description || "No description has been added for this gallery yet.";
  const imageGalleryJsonLd = buildImageGalleryJsonLd({
    name: title,
    description,
    path: `/gallery/${album.slug}`,
    image: heroImageUrl,
    authorName: album.author.name,
    publishedAt: album.publishedAt,
    images: album.images.map((image) => ({
      imageUrl: image.imageUrl,
      alt: image.alt,
      caption: image.caption,
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Gallery", path: "/gallery" },
    { name: title, path: `/gallery/${album.slug}` },
  ]);

  return (
    <div className="container-shell py-12 md:py-16">
      <JsonLd data={imageGalleryJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="editorial-shell space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/gallery"
            className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to gallery
          </Link>
          <div className="text-sm font-semibold text-[var(--ink-soft)]">Visual archive</div>
        </div>

        <article className="space-y-10">
          <header className="editorial-hero space-y-6 pb-8">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">
                <Images className="h-3.5 w-3.5" />
                {album.images.length} images
              </span>
              {album.featured ? (
                <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-3 py-1 text-[0.72rem] text-[var(--accent-strong)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Featured
                  </span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {formatDate(album.publishedAt, "yyyy-MM-dd")}
              </span>
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                {album.author.name}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="content-detail-title max-w-5xl font-serif font-semibold">
                {title}
              </h1>
              <p className="max-w-4xl text-lg leading-8 text-[var(--ink-soft)]">{summary}</p>
            </div>

            <p className="editorial-separator-copy">{description}</p>

            {album.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {album.tags.map((tag) => (
                  <TagLinkPill key={tag} tag={tag} />
                ))}
              </div>
            ) : null}

            {heroImageUrl ? (
              <div className="editorial-thumb mt-2 overflow-hidden rounded-[1.8rem]">
                <img
                  src={heroImageUrl}
                  alt={title}
                  className="h-auto max-h-[38rem] w-full object-cover"
                />
              </div>
            ) : null}
          </header>

          {album.images.length > 0 ? (
            <section className="editorial-section space-y-6 pt-0 border-t-0">
              <div className="space-y-2">
                <p className="section-kicker">Sequence</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">Image set</h2>
                <p className="editorial-separator-copy">
                  Scroll through the full sequence in curator-defined order. Each image can carry
                  its own caption, alternate text, and shooting time.
                </p>
              </div>

              <div className="editorial-list">
                {album.images.map((image, index) => (
                  <figure key={image.id} className="editorial-list-item">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
                      <a
                        href={image.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="editorial-thumb block overflow-hidden"
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.alt || image.caption || title}
                          className="h-auto w-full object-cover"
                          loading={index < 2 ? "eager" : "lazy"}
                        />
                      </a>

                      <figcaption className="space-y-4 lg:pt-2">
                        <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          <div>Image {index + 1}</div>
                          <div>
                            {image.shotAt
                              ? formatDate(image.shotAt, "yyyy-MM-dd HH:mm")
                              : "Shot time not specified"}
                          </div>
                        </div>
                        <p className="text-sm leading-8 text-[var(--ink-soft)]">
                          {image.caption || image.alt || "No caption yet."}
                        </p>
                      </figcaption>
                    </div>
                  </figure>
                ))}
              </div>
            </section>
          ) : (
            <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
              This album has no images yet. Add image rows in the admin console to populate it.
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
