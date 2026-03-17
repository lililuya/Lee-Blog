import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();

  return [
    ...entries.staticPages.map((path) => ({ url: absoluteUrl(path) })),
    ...entries.posts.map((slug) => ({ url: absoluteUrl(`/blog/${slug}`) })),
    ...entries.notes.map((slug) => ({ url: absoluteUrl(`/notes/${slug}`) })),
    ...entries.journal.map((slug) => ({ url: absoluteUrl(`/journal#${slug}`) })),
    ...entries.digests.map((slug) => ({ url: absoluteUrl(`/digest/${slug}`) })),
    ...entries.series.map((slug) => ({ url: absoluteUrl(`/series/${slug}`) })),
    ...entries.tags.map((tag) => ({ url: absoluteUrl(`/tags/${encodeURIComponent(tag)}`) })),
    ...entries.categories.map((category) => ({
      url: absoluteUrl(`/categories/${encodeURIComponent(category)}`),
    })),
  ];
}
