import { XMLParser } from "fast-xml-parser";
import { getCanonicalArxivId } from "@/lib/citation-cards";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

const ARXIV_API_ENDPOINT = "https://export.arxiv.org/api/query";
const SHANGHAI_TIMEZONE = "Asia/Shanghai";
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

type PaperTopicShape = {
  id: string;
  name: string;
  query: string;
  maxResults: number;
};

type ArxivFeedEntry = {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  updated?: string;
  author?: { name?: string } | Array<{ name?: string }>;
  link?: { href?: string; title?: string; type?: string; rel?: string } | Array<{ href?: string; title?: string; type?: string; rel?: string }>;
  [key: string]: unknown;
};

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function compactWhitespace(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function extractArxivId(idUrl: string) {
  const match = idUrl.match(/\/abs\/([^/?#]+)$/);
  return match?.[1] ?? idUrl;
}

function normalizeAnchorPart(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDigestDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getDigestDate(now = new Date()) {
  return new Date(`${toDigestDateString(now)}T00:00:00+08:00`);
}

export function getPaperAnchorId(input: {
  arxivId: string;
  id?: string | null;
  topicId?: string | null;
  digestDate?: Date | string | null;
}) {
  const arxivPart = normalizeAnchorPart(input.arxivId) || "entry";
  const idPart = normalizeAnchorPart(input.id);
  const topicPart = normalizeAnchorPart(input.topicId);
  const digestPart = input.digestDate
    ? normalizeAnchorPart(
        input.digestDate instanceof Date
          ? input.digestDate.toISOString().slice(0, 10)
          : String(input.digestDate).slice(0, 10),
      )
    : "";
  const suffix = idPart || [topicPart, digestPart].filter(Boolean).join("-");

  return suffix ? `paper-${arxivPart}-${suffix}` : `paper-${arxivPart}`;
}

export function getPaperReadingListAnchorId(arxivId: string) {
  const arxivPart = normalizeAnchorPart(getCanonicalArxivId(arxivId) ?? arxivId) || "paper";
  return `reading-paper-${arxivPart}`;
}

export async function fetchArxivPapersForTopic(topic: PaperTopicShape) {
  const params = new URLSearchParams({
    search_query: topic.query,
    start: "0",
    max_results: String(topic.maxResults),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  const response = await fetch(`${ARXIV_API_ENDPOINT}?${params.toString()}`, {
    headers: {
      "User-Agent": "ScholarBlogStudio/1.0 (daily papers module)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`arXiv request failed with status ${response.status}.`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml) as {
    feed?: {
      entry?: ArxivFeedEntry | ArxivFeedEntry[];
    };
  };

  const entries = ensureArray(parsed.feed?.entry);

  return entries.map((entry) => {
    const id = String(entry.id ?? "");
    const links = ensureArray(entry.link);
    const pdfLink = links.find((link) => link.title === "pdf" || link.type === "application/pdf");
    const authors = ensureArray(entry.author)
      .map((author) => compactWhitespace(author.name))
      .filter(Boolean);
    const primaryCategory = (entry["arxiv:primary_category"] as { term?: string } | undefined)?.term;

    return {
      arxivId: extractArxivId(id),
      title: compactWhitespace(String(entry.title ?? "Untitled arXiv paper")),
      summary: compactWhitespace(String(entry.summary ?? "")),
      authors,
      paperUrl: id,
      pdfUrl: pdfLink?.href ?? null,
      primaryCategory: primaryCategory ? String(primaryCategory) : null,
      publishedAt: new Date(String(entry.published ?? new Date().toISOString())),
      updatedAt: new Date(String(entry.updated ?? entry.published ?? new Date().toISOString())),
    };
  });
}

export async function syncPaperTopic(topicId: string) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const topic = await prisma.paperTopic.findUnique({ where: { id: topicId } });

  if (!topic) {
    throw new Error("Paper topic not found.");
  }

  const digestDate = getDigestDate();
  const papers = await fetchArxivPapersForTopic(topic);
  const arxivIds = papers.map((paper) => paper.arxivId);

  await prisma.$transaction(async (tx) => {
    await tx.dailyPaperEntry.deleteMany({
      where: {
        topicId: topic.id,
        digestDate,
        ...(arxivIds.length > 0 ? { arxivId: { notIn: arxivIds } } : {}),
      },
    });

    for (const paper of papers) {
      await tx.dailyPaperEntry.upsert({
        where: {
          digestDate_topicId_arxivId: {
            digestDate,
            topicId: topic.id,
            arxivId: paper.arxivId,
          },
        },
        update: {
          title: paper.title,
          summary: paper.summary,
          authors: paper.authors,
          paperUrl: paper.paperUrl,
          pdfUrl: paper.pdfUrl,
          primaryCategory: paper.primaryCategory,
          publishedAt: paper.publishedAt,
          updatedAt: paper.updatedAt,
        },
        create: {
          digestDate,
          topicId: topic.id,
          arxivId: paper.arxivId,
          title: paper.title,
          summary: paper.summary,
          authors: paper.authors,
          paperUrl: paper.paperUrl,
          pdfUrl: paper.pdfUrl,
          primaryCategory: paper.primaryCategory,
          publishedAt: paper.publishedAt,
          updatedAt: paper.updatedAt,
        },
      });
    }
  });

  return {
    topicId: topic.id,
    topicName: topic.name,
    count: papers.length,
    digestDate,
  };
}

export async function syncAllPaperTopics() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const topics = await prisma.paperTopic.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
  });

  const results = [] as Array<{ topicId: string; topicName: string; count: number; digestDate: Date }>;

  for (const topic of topics) {
    results.push(await syncPaperTopic(topic.id));
  }

  return {
    topicCount: topics.length,
    paperCount: results.reduce((sum, item) => sum + item.count, 0),
    results,
  };
}
