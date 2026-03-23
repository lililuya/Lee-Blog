import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/utils";

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  keywords?: string[];
  authorName?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  section?: string | null;
  languageCode?: string | null;
  alternateLanguages?: Record<string, string> | null;
  type?: "website" | "article";
  ogEyebrow?: string | null;
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

type ItemListEntry = {
  name: string;
  path: string;
};

type ArticleJsonLdInput = {
  type: "Article" | "BlogPosting";
  title: string;
  description: string;
  path: string;
  image?: string | null;
  authorName?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  keywords?: string[];
  section?: string | null;
  languageCode?: string | null;
};

type CollectionJsonLdInput = {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  keywords?: string[];
  itemCount?: number;
  type?: "CollectionPage" | "ItemList" | "ImageGallery" | "WebPage";
};

type ImageGalleryJsonLdInput = {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  authorName?: string | null;
  publishedAt?: Date | string | null;
  images: Array<{
    imageUrl: string;
    alt?: string | null;
    caption?: string | null;
  }>;
};

type WebsiteJsonLdInput = {
  name: string;
  path: string;
  description?: string;
  searchPathTemplate?: string | null;
};

type PersonJsonLdInput = {
  name: string;
  description?: string | null;
  image?: string | null;
  url?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  affiliation?: string | null;
  location?: string | null;
  sameAs?: string[];
};

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const nextDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(nextDate.getTime()) ? undefined : nextDate.toISOString();
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const suffix = "...";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= suffix.length) {
    return normalized.slice(0, maxLength);
  }

  return `${normalized.slice(0, Math.max(0, maxLength - suffix.length)).trim()}${suffix}`;
}

export function normalizeSeoImageUrl(imageUrl: string | null | undefined) {
  const normalized = imageUrl?.trim();

  if (!normalized) {
    return undefined;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return absoluteUrl(normalized.startsWith("/") ? normalized : `/${normalized}`);
}

export function buildOgImageUrl(input: {
  title: string;
  description?: string | null;
  eyebrow?: string | null;
}) {
  const searchParams = new URLSearchParams({
    title: truncateText(input.title, 72),
  });

  const description = input.description ? truncateText(input.description, 180) : "";
  const eyebrow = input.eyebrow ? truncateText(input.eyebrow, 36) : "";

  if (eyebrow) {
    searchParams.set("eyebrow", eyebrow);
  }

  if (description) {
    searchParams.set("description", description);
  }

  return absoluteUrl(`/api/og?${searchParams.toString()}`);
}

export function buildContentMetadata(input: SeoMetadataInput): Metadata {
  const canonicalUrl = absoluteUrl(input.path);
  const generatedImageUrl = buildOgImageUrl({
    title: input.title,
    description: input.description,
    eyebrow: input.ogEyebrow ?? input.section ?? "Lee Blog",
  });
  const imageUrl = normalizeSeoImageUrl(input.image) ?? generatedImageUrl;
  const keywords = Array.from(
    new Set((input.keywords ?? []).map((item) => item.trim()).filter(Boolean)),
  );
  const publishedTime = normalizeDate(input.publishedAt);
  const modifiedTime = normalizeDate(input.updatedAt);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
      languages: input.alternateLanguages ?? undefined,
    },
    keywords,
    authors: input.authorName ? [{ name: input.authorName }] : undefined,
    openGraph: {
      type: input.type ?? "article",
      url: canonicalUrl,
      title: input.title,
      description: input.description,
      siteName: "Lee Blog",
      ...(input.type !== "website"
        ? {
            publishedTime,
            modifiedTime,
            authors: input.authorName ? [input.authorName] : undefined,
            section: input.section ?? undefined,
            tags: keywords,
          }
        : {}),
      images: [
        {
          url: imageUrl,
          alt: input.imageAlt ?? input.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [imageUrl],
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildItemListJsonLd(input: {
  name: string;
  path: string;
  items: ItemListEntry[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: absoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function buildCollectionPageJsonLd(input: CollectionJsonLdInput) {
  const imageUrl = normalizeSeoImageUrl(input.image);

  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    image: imageUrl ? [imageUrl] : undefined,
    inLanguage: "en",
    isAccessibleForFree: true,
    numberOfItems: input.itemCount,
    keywords:
      input.keywords && input.keywords.length > 0 ? input.keywords.join(", ") : undefined,
  };
}

export function buildArticleJsonLd(input: ArticleJsonLdInput) {
  const imageUrl =
    normalizeSeoImageUrl(input.image) ??
    buildOgImageUrl({
      title: input.title,
      description: input.description,
      eyebrow: input.section ?? "Lee Blog",
    });

  return {
    "@context": "https://schema.org",
    "@type": input.type,
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    url: absoluteUrl(input.path),
    image: imageUrl ? [imageUrl] : undefined,
    author: input.authorName
      ? {
          "@type": "Person",
          name: input.authorName,
        }
      : undefined,
    datePublished: normalizeDate(input.publishedAt),
    dateModified: normalizeDate(input.updatedAt) ?? normalizeDate(input.publishedAt),
    articleSection: input.section ?? undefined,
    keywords:
      input.keywords && input.keywords.length > 0 ? input.keywords.join(", ") : undefined,
    inLanguage: input.languageCode ?? "en",
    isAccessibleForFree: true,
  };
}

export function buildImageGalleryJsonLd(input: ImageGalleryJsonLdInput) {
  const coverImage =
    normalizeSeoImageUrl(input.image) ??
    input.images.map((entry) => normalizeSeoImageUrl(entry.imageUrl)).find(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    image: coverImage ? [coverImage] : undefined,
    author: input.authorName
      ? {
          "@type": "Person",
          name: input.authorName,
        }
      : undefined,
    datePublished: normalizeDate(input.publishedAt),
    associatedMedia: input.images
      .map((entry) => {
        const imageUrl = normalizeSeoImageUrl(entry.imageUrl);

        if (!imageUrl) {
          return null;
        }

        return {
          "@type": "ImageObject",
          contentUrl: imageUrl,
          name: entry.alt ?? entry.caption ?? undefined,
          caption: entry.caption ?? undefined,
        };
      })
      .filter(Boolean),
    inLanguage: "en",
    isAccessibleForFree: true,
  };
}

export function buildWebsiteJsonLd(input: WebsiteJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: absoluteUrl(input.path),
    description: input.description,
    inLanguage: "en",
    potentialAction: input.searchPathTemplate
      ? {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: absoluteUrl(input.searchPathTemplate),
          },
          "query-input": "required name=search_term_string",
        }
      : undefined,
  };
}

export function buildPersonJsonLd(input: PersonJsonLdInput) {
  const sameAs = Array.from(
    new Set((input.sameAs ?? []).map((item) => item.trim()).filter(Boolean)),
  );
  const imageUrl = normalizeSeoImageUrl(input.image);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    description: input.description ?? undefined,
    image: imageUrl ? [imageUrl] : undefined,
    url: input.url ?? undefined,
    email: input.email ? `mailto:${input.email}` : undefined,
    jobTitle: input.jobTitle ?? undefined,
    affiliation: input.affiliation
      ? {
          "@type": "Organization",
          name: input.affiliation,
        }
      : undefined,
    homeLocation: input.location
      ? {
          "@type": "Place",
          name: input.location,
        }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}
