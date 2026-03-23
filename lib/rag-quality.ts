import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

type RagQueryMode = "CHAT" | "PREVIEW";

type RagQuerySource = {
  title: string;
  href: string;
  kindLabel: string;
  visibility: "public" | "private";
  score?: number | null;
};

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function recordRagQueryEvent(input: {
  query: string;
  mode: RagQueryMode;
  pathname?: string | null;
  usedPageContext?: boolean;
  sources: RagQuerySource[];
}) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const query = input.query.trim();
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return;
  }

  const sortedSources = [...input.sources].sort(
    (left, right) => (right.score ?? 0) - (left.score ?? 0),
  );
  const publicSourceCount = sortedSources.filter((source) => source.visibility === "public").length;
  const privateSourceCount = sortedSources.length - publicSourceCount;
  const topSource = sortedSources[0] ?? null;

  try {
    await prisma.ragQueryLog.create({
      data: {
        query,
        normalizedQuery,
        mode: input.mode,
        pathname: input.pathname?.trim() || null,
        sourceCount: sortedSources.length,
        publicSourceCount,
        privateSourceCount,
        usedPageContext: Boolean(input.usedPageContext),
        topScore:
          typeof topSource?.score === "number" && Number.isFinite(topSource.score)
            ? Math.round(topSource.score)
            : null,
        topSourceTitle: topSource?.title ?? null,
        topSourceKindLabel: topSource?.kindLabel ?? null,
        topSourceHref: topSource?.href ?? null,
        topSourceTitles: sortedSources.slice(0, 3).map((source) => source.title),
      },
    });
  } catch (error) {
    console.error("[rag query log]", error);
  }
}
