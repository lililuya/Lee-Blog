import { PostStatus } from "@prisma/client";
import { getPublishingCutoff } from "@/lib/content-visibility";
import { hasGalleryAlbumSupport, prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

function galleryPublicWhere(cutoff: Date) {
  return {
    status: PostStatus.PUBLISHED,
    publishedAt: {
      lte: cutoff,
    },
  };
}

export async function getPublishedGalleryAlbums(limit?: number) {
  if (!isDatabaseConfigured() || !hasGalleryAlbumSupport()) {
    return [];
  }

  const cutoff = getPublishingCutoff();

  return prisma.galleryAlbum.findMany({
    where: galleryPublicWhere(cutoff),
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          images: true,
        },
      },
      images: {
        select: {
          id: true,
          imageUrl: true,
          alt: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
    ...(typeof limit === "number" ? { take: limit } : {}),
  });
}

export async function getGalleryAlbumBySlug(slug: string) {
  if (!isDatabaseConfigured() || !hasGalleryAlbumSupport()) {
    return null;
  }

  const cutoff = getPublishingCutoff();

  return prisma.galleryAlbum.findFirst({
    where: {
      slug,
      ...galleryPublicWhere(cutoff),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function getAdminGalleryAlbums() {
  if (!isDatabaseConfigured() || !hasGalleryAlbumSupport()) {
    return [];
  }

  return prisma.galleryAlbum.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          images: true,
        },
      },
      images: {
        select: {
          id: true,
          imageUrl: true,
          alt: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getAdminGalleryAlbumById(id: string) {
  if (!isDatabaseConfigured() || !hasGalleryAlbumSupport()) {
    return null;
  }

  return prisma.galleryAlbum.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getGalleryOverviewStats() {
  if (!isDatabaseConfigured() || !hasGalleryAlbumSupport()) {
    return {
      totalAlbums: 0,
      featuredAlbums: 0,
      publishedAlbums: 0,
      totalImages: 0,
    };
  }

  const [totalAlbums, featuredAlbums, publishedAlbums, totalImages] = await Promise.all([
    prisma.galleryAlbum.count(),
    prisma.galleryAlbum.count({ where: { featured: true } }),
    prisma.galleryAlbum.count({ where: { status: PostStatus.PUBLISHED } }),
    prisma.galleryImage.count(),
  ]);

  return {
    totalAlbums,
    featuredAlbums,
    publishedAlbums,
    totalImages,
  };
}
