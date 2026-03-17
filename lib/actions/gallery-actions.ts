"use server";

import { randomUUID } from "node:crypto";
import { PostStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { hasGalleryAlbumSupport, prisma } from "@/lib/prisma";
import { deleteLocalSiteAsset } from "@/lib/site-assets";
import { galleryDeleteSchema, gallerySchema } from "@/lib/validators";
import { isDatabaseConfigured, parseCsv, slugify } from "@/lib/utils";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getDateOrNull(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? new Date(value) : null;
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function ensureGallerySupport(redirectTarget = "/admin/gallery?error=client") {
  if (!hasGalleryAlbumSupport()) {
    redirect(redirectTarget);
  }
}

type GalleryImageInput = {
  imageUrl?: string | null;
  thumbUrl?: string | null;
  alt?: string | null;
  caption?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  shotAt?: string | null;
};

function parseGalleryImages(imagesJson: string) {
  if (!imagesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(imagesJson) as GalleryImageInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isBlankGalleryImageRow(image: {
  imageUrl: string;
  thumbUrl: string | null;
  alt: string;
  caption?: string;
  width: number | null;
  height: number | null;
  shotAt: Date | null;
}) {
  return (
    !image.imageUrl &&
    !image.thumbUrl &&
    !image.alt &&
    !image.caption &&
    image.width === null &&
    image.height === null &&
    image.shotAt === null
  );
}

function buildGallerySlug(rawSlug: string, rawTitle: string, fallback?: string | null) {
  const normalizedSlug = slugify(rawSlug);

  if (normalizedSlug) {
    return normalizedSlug;
  }

  const normalizedTitleSlug = slugify(rawTitle);

  if (normalizedTitleSlug) {
    return normalizedTitleSlug;
  }

  if (fallback?.trim()) {
    return fallback.trim();
  }

  return `gallery-${randomUUID().slice(0, 8)}`;
}

function buildGalleryPayload(formData: FormData, options?: { fallbackSlug?: string | null }) {
  const rawTitle = getString(formData, "title");
  const rawSlug = getString(formData, "slug");
  const imagesJson = getString(formData, "imagesJson");
  const parsedImages = parseGalleryImages(imagesJson)
    .map((image) => ({
      imageUrl: String(image.imageUrl ?? "").trim(),
      thumbUrl: String(image.thumbUrl ?? "").trim() || null,
      alt: String(image.alt ?? "").trim(),
      caption: String(image.caption ?? "").trim() || undefined,
      width:
        image.width === null || image.width === undefined || String(image.width).trim() === ""
          ? null
          : Number(image.width),
      height:
        image.height === null || image.height === undefined || String(image.height).trim() === ""
          ? null
          : Number(image.height),
      shotAt: image.shotAt ? new Date(image.shotAt) : null,
    }))
    .filter((image) => !isBlankGalleryImageRow(image));

  return gallerySchema.parse({
    title: rawTitle,
    slug: buildGallerySlug(rawSlug, rawTitle, options?.fallbackSlug),
    summary: getString(formData, "summary"),
    description: getString(formData, "description"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    tags: parseCsv(getString(formData, "tags")),
    status: getString(formData, "status"),
    featured: getBoolean(formData, "featured"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
    images: parsedImages,
  });
}

function normalizeGalleryImagesForStorage(images: ReturnType<typeof gallerySchema.parse>["images"]) {
  return images.map((image, index) => ({
    imageUrl: String(image.imageUrl ?? "").trim(),
    thumbUrl: image.thumbUrl ? String(image.thumbUrl).trim() : null,
    alt: image.alt.trim(),
    caption: image.caption?.trim() || null,
    width: image.width ?? null,
    height: image.height ?? null,
    shotAt: image.shotAt ?? null,
    sortOrder: index + 1,
  }));
}

function resolvePublishedAt(status: PostStatus, publishedAt: Date | null, fallback?: Date | null) {
  if (status !== PostStatus.PUBLISHED) {
    return null;
  }

  return publishedAt ?? fallback ?? new Date();
}

function revalidateGalleryPaths(slugs: Array<string | null | undefined>) {
  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");

  for (const slug of slugs) {
    if (slug) {
      revalidatePath(`/gallery/${slug}`);
    }
  }
}

function dedupeUrls(urls: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      urls
        .map((url) => url?.trim() || null)
        .filter((url): url is string => Boolean(url)),
    ),
  );
}

async function cleanupRemovedGalleryAssets(previousUrls: string[], nextUrls: string[]) {
  const nextUrlSet = new Set(nextUrls);
  const removedUrls = previousUrls.filter((url) => !nextUrlSet.has(url));

  await Promise.all(removedUrls.map((url) => deleteLocalSiteAsset(url)));
}

export async function createGalleryAlbumAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();
  ensureGallerySupport("/admin/gallery/new?error=client");

  const parsed = buildGalleryPayload(formData);
  const images = normalizeGalleryImagesForStorage(parsed.images);
  const coverImageUrl = parsed.coverImageUrl || images[0]?.imageUrl || null;

  const album = await prisma.galleryAlbum.create({
    data: {
      title: parsed.title,
      slug: parsed.slug,
      summary: parsed.summary,
      description: parsed.description,
      coverImageUrl,
      tags: parsed.tags,
      status: parsed.status,
      featured: parsed.featured,
      publishedAt: resolvePublishedAt(parsed.status, parsed.publishedAt),
      authorId: admin.id,
      images: {
        create: images,
      },
    },
  });

  revalidateGalleryPaths([album.slug]);
  redirect(`/admin/gallery/${album.id}?created=1`);
}

export async function updateGalleryAlbumAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();
  ensureGallerySupport();

  const galleryId = getString(formData, "galleryId");
  const existingAlbum = await prisma.galleryAlbum.findUnique({
    where: { id: galleryId },
    select: {
      id: true,
      slug: true,
      publishedAt: true,
      coverImageUrl: true,
      images: {
        select: {
          imageUrl: true,
          thumbUrl: true,
        },
      },
    },
  });

  if (!existingAlbum) {
    redirect("/admin/gallery");
  }

  const parsed = buildGalleryPayload(formData, { fallbackSlug: existingAlbum.slug });
  const images = normalizeGalleryImagesForStorage(parsed.images);
  const coverImageUrl = parsed.coverImageUrl || images[0]?.imageUrl || null;

  const album = await prisma.$transaction(async (tx) => {
    await tx.galleryImage.deleteMany({
      where: {
        albumId: existingAlbum.id,
      },
    });

    return tx.galleryAlbum.update({
      where: { id: existingAlbum.id },
      data: {
        title: parsed.title,
        slug: parsed.slug,
        summary: parsed.summary,
        description: parsed.description,
        coverImageUrl,
        tags: parsed.tags,
        status: parsed.status,
        featured: parsed.featured,
        publishedAt: resolvePublishedAt(parsed.status, parsed.publishedAt, existingAlbum.publishedAt),
        images: {
          create: images,
        },
      },
    });
  });

  await cleanupRemovedGalleryAssets(
    dedupeUrls([
      existingAlbum.coverImageUrl,
      ...existingAlbum.images.map((image) => image.imageUrl),
      ...existingAlbum.images.map((image) => image.thumbUrl),
    ]),
    dedupeUrls([
      coverImageUrl,
      ...images.map((image) => image.imageUrl),
      ...images.map((image) => image.thumbUrl),
    ]),
  );

  revalidateGalleryPaths([existingAlbum.slug, album.slug]);
  redirect(`/admin/gallery/${album.id}?saved=1`);
}

export async function deleteGalleryAlbumAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();
  ensureGallerySupport();

  const parsed = galleryDeleteSchema.parse({
    galleryId: getString(formData, "galleryId"),
  });

  const existingAlbum = await prisma.galleryAlbum.findUnique({
    where: { id: parsed.galleryId },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      images: {
        select: {
          imageUrl: true,
          thumbUrl: true,
        },
      },
    },
  });

  if (!existingAlbum) {
    redirect("/admin/gallery");
  }

  await prisma.galleryAlbum.delete({
    where: { id: existingAlbum.id },
  });

  await cleanupRemovedGalleryAssets(
    dedupeUrls([
      existingAlbum.coverImageUrl,
      ...existingAlbum.images.map((image) => image.imageUrl),
      ...existingAlbum.images.map((image) => image.thumbUrl),
    ]),
    [],
  );

  revalidateGalleryPaths([existingAlbum.slug]);
  redirect("/admin/gallery?deleted=1");
}
