import "server-only";
import {
  getPublishedNotes,
  getPublishedPosts,
  getRecentJournalEntries,
  getSiteProfile,
  getWeeklyDigests,
} from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  content: string;
  date: Date;
  type: "post" | "note" | "journal" | "digest";
  tags: string[];
};

export type FeedPayload = {
  title: string;
  description: string;
  homePageUrl: string;
  feedUrl: string;
  jsonFeedUrl: string;
  language: string;
  author: {
    name: string;
    url?: string;
    avatar?: string;
  };
  items: FeedItem[];
};

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toDate(value: Date | string | null | undefined, fallback?: Date) {
  if (value) {
    return new Date(value);
  }

  return fallback ?? new Date();
}

export async function getFeedPayload(): Promise<FeedPayload> {
  const [profile, posts, notes, journalEntries, digests] = await Promise.all([
    getSiteProfile(),
    getPublishedPosts(),
    getPublishedNotes(),
    getRecentJournalEntries(24),
    getWeeklyDigests(24),
  ]);

  const items: FeedItem[] = [
    ...posts.map((post) => ({
      id: `post-${post.id}`,
      url: absoluteUrl(`/blog/${post.slug}`),
      title: post.title,
      summary: post.excerpt,
      content: post.content,
      date: toDate(post.publishedAt, new Date(post.updatedAt)),
      type: "post" as const,
      tags: [post.category, ...post.tags].filter(Boolean),
    })),
    ...notes.map((note) => ({
      id: `note-${note.id}`,
      url: absoluteUrl(`/notes/${note.slug}`),
      title: `Note | ${note.title}`,
      summary: note.summary,
      content: note.content,
      date: toDate(note.publishedAt, new Date(note.updatedAt)),
      type: "note" as const,
      tags: [note.noteType ?? "note", ...note.tags].filter(Boolean),
    })),
    ...journalEntries.map((entry) => ({
      id: `journal-${entry.id}`,
      url: absoluteUrl(`/journal/${entry.slug}`),
      title: `Journal | ${entry.title}`,
      summary: entry.summary,
      content: entry.content,
      date: toDate(entry.publishedAt),
      type: "journal" as const,
      tags: [entry.mood ?? "journal"],
    })),
    ...digests.map((digest) => ({
      id: `digest-${digest.id}`,
      url: absoluteUrl(`/digest/${digest.slug}`),
      title: digest.title,
      summary: digest.summary,
      content: digest.content,
      date: toDate(digest.publishedAt),
      type: "digest" as const,
      tags: digest.featuredTopics,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    title: "Lee 的博客",
    description: profile.tagline,
    homePageUrl: absoluteUrl("/"),
    feedUrl: absoluteUrl("/feed.xml"),
    jsonFeedUrl: absoluteUrl("/feed.json"),
    language: "zh-CN",
    author: {
      name: profile.fullName,
      url: profile.websiteUrl ?? undefined,
      avatar: profile.heroImageUrl || undefined,
    },
    items,
  };
}
