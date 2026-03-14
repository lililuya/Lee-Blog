import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { JournalStatus, PostStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { estimateReadingTime, getContentStats, slugify } from "../lib/utils";

type FrontmatterValue = string | boolean | string[];
type Frontmatter = Record<string, FrontmatterValue>;

type ParsedMarkdownFile = {
  frontmatter: Frontmatter;
  content: string;
};

export type SyncSummary = {
  blogProcessed: number;
  notesProcessed: number;
  journalProcessed: number;
};

export const CONTENT_DIRECTORIES = {
  root: path.join(process.cwd(), "content"),
  blog: path.join(process.cwd(), "content", "blog"),
  notes: path.join(process.cwd(), "content", "notes"),
  journal: path.join(process.cwd(), "content", "journal"),
} as const;

function isTruthy(value: FrontmatterValue | undefined) {
  return value === true || value === "true" || value === "1";
}

function asString(value: FrontmatterValue | undefined) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value?.trim() ?? "";
}

function asStringArray(value: FrontmatterValue | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return asString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asDate(value: FrontmatterValue | undefined) {
  const normalized = asString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseFrontmatterValue(rawValue: string): FrontmatterValue {
  const value = rawValue.trim();

  if (!value) {
    return "";
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  return value;
}

function parseMarkdownFile(source: string): ParsedMarkdownFile {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return {
      frontmatter: {},
      content: source.trim(),
    };
  }

  const [, block, content] = match;
  const frontmatter: Frontmatter = {};
  let activeKey = "";

  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);

    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      activeKey = key;
      frontmatter[key] = parseFrontmatterValue(rawValue);
      continue;
    }

    if (activeKey && trimmed.startsWith("- ")) {
      const currentValue = frontmatter[activeKey];
      const nextItem = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, "");
      const nextList = Array.isArray(currentValue)
        ? [...currentValue, nextItem]
        : [asString(currentValue), nextItem].filter(Boolean);
      frontmatter[activeKey] = nextList;
    }
  }

  return {
    frontmatter,
    content: content.trim(),
  };
}

async function getMarkdownFiles(directory: string) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .filter((entry) => entry.name.toLowerCase().endsWith(".md"))
      .filter((entry) => !entry.name.startsWith("_"))
      .filter((entry) => entry.name.toLowerCase() !== "readme.md")
      .map((entry) => path.join(directory, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function buildExcerptFromContent(markdown: string, maxLength: number) {
  const plainText = getContentStats(markdown).plainText;
  return plainText.length > maxLength ? `${plainText.slice(0, maxLength - 3).trim()}...` : plainText;
}

function normalizePostStatus(value: FrontmatterValue | undefined) {
  const normalized = asString(value).toUpperCase();
  return normalized === PostStatus.PUBLISHED || normalized === PostStatus.ARCHIVED ? normalized : PostStatus.DRAFT;
}

function normalizeJournalStatus(value: FrontmatterValue | undefined) {
  const normalized = asString(value).toUpperCase();
  return normalized === JournalStatus.DRAFT ? JournalStatus.DRAFT : JournalStatus.PUBLISHED;
}

async function getAdminAuthor() {
  const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });

  if (!admin) {
    throw new Error("An admin user is required before syncing Markdown content.");
  }

  return admin;
}

async function syncBlogContent() {
  const files = await getMarkdownFiles(CONTENT_DIRECTORIES.blog);

  if (files.length === 0) {
    return { processed: 0 };
  }

  const admin = await getAdminAuthor();

  for (const filePath of files) {
    const fileName = path.basename(filePath, ".md");
    const source = await fs.readFile(filePath, "utf8");
    const { frontmatter, content } = parseMarkdownFile(source);
    const title = asString(frontmatter.title) || fileName;
    const slug = slugify(asString(frontmatter.slug) || fileName || title);
    const status = normalizePostStatus(frontmatter.status);
    const publishedAt = asDate(frontmatter.publishedAt);

    await prisma.post.upsert({
      where: { slug },
      update: {
        title,
        excerpt: asString(frontmatter.excerpt) || buildExcerptFromContent(content, 220),
        content,
        category: asString(frontmatter.category) || "Notes",
        tags: asStringArray(frontmatter.tags).slice(0, 12),
        status,
        featured: isTruthy(frontmatter.featured),
        coverImageUrl: asString(frontmatter.coverImageUrl) || null,
        publishedAt: status === PostStatus.PUBLISHED ? publishedAt ?? new Date() : null,
        readTimeMinutes: estimateReadingTime(content),
      },
      create: {
        title,
        slug,
        excerpt: asString(frontmatter.excerpt) || buildExcerptFromContent(content, 220),
        content,
        category: asString(frontmatter.category) || "Notes",
        tags: asStringArray(frontmatter.tags).slice(0, 12),
        status,
        featured: isTruthy(frontmatter.featured),
        coverImageUrl: asString(frontmatter.coverImageUrl) || null,
        publishedAt: status === PostStatus.PUBLISHED ? publishedAt ?? new Date() : null,
        readTimeMinutes: estimateReadingTime(content),
        authorId: admin.id,
      },
    });
  }

  return { processed: files.length };
}

async function syncNotesContent() {
  const files = await getMarkdownFiles(CONTENT_DIRECTORIES.notes);

  if (files.length === 0) {
    return { processed: 0 };
  }

  const admin = await getAdminAuthor();

  for (const filePath of files) {
    const fileName = path.basename(filePath, ".md");
    const source = await fs.readFile(filePath, "utf8");
    const { frontmatter, content } = parseMarkdownFile(source);
    const title = asString(frontmatter.title) || fileName;
    const slug = slugify(asString(frontmatter.slug) || fileName || title);
    const status = normalizePostStatus(frontmatter.status);
    const publishedAt = asDate(frontmatter.publishedAt);

    await prisma.note.upsert({
      where: { slug },
      update: {
        title,
        summary: asString(frontmatter.summary) || buildExcerptFromContent(content, 220),
        content,
        noteType: asString(frontmatter.noteType) || "Knowledge Note",
        tags: asStringArray(frontmatter.tags).slice(0, 12),
        status,
        featured: isTruthy(frontmatter.featured),
        publishedAt: status === PostStatus.PUBLISHED ? publishedAt ?? new Date() : null,
      },
      create: {
        title,
        slug,
        summary: asString(frontmatter.summary) || buildExcerptFromContent(content, 220),
        content,
        noteType: asString(frontmatter.noteType) || "Knowledge Note",
        tags: asStringArray(frontmatter.tags).slice(0, 12),
        status,
        featured: isTruthy(frontmatter.featured),
        publishedAt: status === PostStatus.PUBLISHED ? publishedAt ?? new Date() : null,
        authorId: admin.id,
      },
    });
  }

  return { processed: files.length };
}

async function syncJournalContent() {
  const files = await getMarkdownFiles(CONTENT_DIRECTORIES.journal);

  if (files.length === 0) {
    return { processed: 0 };
  }

  for (const filePath of files) {
    const fileName = path.basename(filePath, ".md");
    const source = await fs.readFile(filePath, "utf8");
    const { frontmatter, content } = parseMarkdownFile(source);
    const title = asString(frontmatter.title) || fileName;
    const slug = slugify(asString(frontmatter.slug) || fileName || title);
    const status = normalizeJournalStatus(frontmatter.status);

    await prisma.journalEntry.upsert({
      where: { slug },
      update: {
        title,
        summary: asString(frontmatter.summary) || buildExcerptFromContent(content, 220),
        content,
        mood: asString(frontmatter.mood) || null,
        status,
        publishedAt: asDate(frontmatter.publishedAt) ?? new Date(),
      },
      create: {
        title,
        slug,
        summary: asString(frontmatter.summary) || buildExcerptFromContent(content, 220),
        content,
        mood: asString(frontmatter.mood) || null,
        status,
        publishedAt: asDate(frontmatter.publishedAt) ?? new Date(),
      },
    });
  }

  return { processed: files.length };
}

export async function syncMarkdownContent(): Promise<SyncSummary> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [blogResult, notesResult, journalResult] = await Promise.all([
    syncBlogContent(),
    syncNotesContent(),
    syncJournalContent(),
  ]);

  return {
    blogProcessed: blogResult.processed,
    notesProcessed: notesResult.processed,
    journalProcessed: journalResult.processed,
  };
}

export async function disconnectContentSync() {
  await prisma.$disconnect();
}
