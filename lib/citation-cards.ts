export type PaperCitationCardData = {
  title: string;
  authors?: string | null;
  url?: string | null;
  quote: string;
  note?: string | null;
  year?: string | null;
  arxivId?: string | null;
};

export type MarkdownCitationSegment =
  | {
      type: "markdown";
      content: string;
    }
  | {
      type: "citation-card";
      data: PaperCitationCardData;
    };

const citationCardFieldPattern = /^(title|authors|year|arxivid|url|quote|note)\s*:\s*(.*)$/i;

function normalizeCitationCardValue(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLookupText(value: string | null | undefined) {
  return normalizeCitationCardValue(value).toLowerCase();
}

function normalizeArxivIdCandidate(value: string | null | undefined) {
  const normalized = normalizeLookupText(value);

  if (!normalized) {
    return [];
  }

  const urlMatch = normalized.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/);
  const extractedValue = urlMatch?.[1] ?? normalized.replace(/^arxiv:/, "");
  const withoutPdf = extractedValue.replace(/\.pdf$/, "");
  const withoutVersion = withoutPdf.replace(/v\d+$/, "");

  return Array.from(new Set([withoutPdf, withoutVersion].filter(Boolean)));
}

export function getCanonicalArxivId(value: string | null | undefined) {
  return normalizeArxivIdCandidate(value).slice(-1)[0] ?? null;
}

function normalizePaperUrlCandidate(value: string | null | undefined) {
  const normalized = normalizeLookupText(value);

  if (!normalized) {
    return [];
  }

  const withoutProtocol = normalized.replace(/^https?:\/\//, "");
  const withoutQuery = withoutProtocol.split(/[?#]/, 1)[0] ?? withoutProtocol;
  const normalizedArxivIds = normalizeArxivIdCandidate(normalized);
  const arxivUrls = normalizedArxivIds.map((arxivId) => `arxiv.org/abs/${arxivId}`);

  return Array.from(new Set([withoutQuery, ...arxivUrls].filter(Boolean)));
}

export function getCanonicalPaperUrl(value: string | null | undefined) {
  const normalized = normalizeLookupText(value);

  if (!normalized) {
    return null;
  }

  const canonicalArxivId = getCanonicalArxivId(normalized);

  if (canonicalArxivId && normalized.includes("arxiv.org/")) {
    return `arxiv.org/abs/${canonicalArxivId}`;
  }

  return normalizePaperUrlCandidate(normalized)[0] ?? null;
}

export function getCanonicalPaperReferenceKey(input: {
  arxivId?: string | null;
  url?: string | null;
  title?: string | null;
}) {
  const canonicalArxivId = getCanonicalArxivId(input.arxivId) ?? getCanonicalArxivId(input.url);

  if (canonicalArxivId) {
    return `arxiv:${canonicalArxivId}`;
  }

  const canonicalUrl = getCanonicalPaperUrl(input.url);

  if (canonicalUrl) {
    return `url:${canonicalUrl}`;
  }

  const title = normalizeLookupText(input.title);
  return title ? `title:${title}` : null;
}

export function buildPaperCitationCardSnippet(input: PaperCitationCardData) {
  const title = normalizeCitationCardValue(input.title);
  const authors = normalizeCitationCardValue(input.authors);
  const url = normalizeCitationCardValue(input.url);
  const quote = normalizeCitationCardValue(input.quote);
  const note = normalizeCitationCardValue(input.note);
  const year = normalizeCitationCardValue(input.year);
  const arxivId = normalizeCitationCardValue(input.arxivId);

  const lines = [
    ":::citation-card",
    `title: ${title}`,
    authors ? `authors: ${authors}` : null,
    year ? `year: ${year}` : null,
    arxivId ? `arxivId: ${arxivId}` : null,
    url ? `url: ${url}` : null,
    `quote: ${quote}`,
    note ? `note: ${note}` : null,
    ":::",
  ].filter((value): value is string => Boolean(value));

  return lines.join("\n");
}

export function getPaperCitationLookupKeys(input: {
  arxivId?: string | null;
  url?: string | null;
  title?: string | null;
}) {
  const keys = new Set<string>();

  for (const arxivId of normalizeArxivIdCandidate(input.arxivId)) {
    keys.add(`arxiv:${arxivId}`);
  }

  for (const url of normalizePaperUrlCandidate(input.url)) {
    keys.add(`url:${url}`);
  }

  const title = normalizeLookupText(input.title);

  if (title) {
    keys.add(`title:${title}`);
  }

  return Array.from(keys);
}

function parsePaperCitationCardBlock(block: string): PaperCitationCardData | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const values = new Map<string, string>();
  let currentKey = "";

  for (const line of lines) {
    const fieldMatch = line.match(citationCardFieldPattern);

    if (fieldMatch) {
      currentKey = fieldMatch[1].trim().toLowerCase();
      const value = fieldMatch[2].trim();
      values.set(currentKey, value);
      continue;
    }

    if (currentKey) {
      const previousValue = values.get(currentKey) ?? "";
      values.set(currentKey, `${previousValue} ${line}`.trim());
    }
  }

  const title = normalizeCitationCardValue(values.get("title"));
  const quote = normalizeCitationCardValue(values.get("quote"));

  if (!title || !quote) {
    return null;
  }

  return {
    title,
    authors: normalizeCitationCardValue(values.get("authors")) || null,
    url: normalizeCitationCardValue(values.get("url")) || null,
    quote,
    note: normalizeCitationCardValue(values.get("note")) || null,
    year: normalizeCitationCardValue(values.get("year")) || null,
    arxivId: normalizeCitationCardValue(values.get("arxivid")) || null,
  };
}

export function splitMarkdownCitationSegments(content: string): MarkdownCitationSegment[] {
  const segments: MarkdownCitationSegment[] = [];
  const pattern = /(^|\n):::citation-card\s*\n([\s\S]*?)\n:::(?=\n|$)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const prefixLength = match[1]?.length ?? 0;
    const start = match.index + prefixLength;
    const end = pattern.lastIndex;

    if (start > cursor) {
      segments.push({
        type: "markdown",
        content: content.slice(cursor, start),
      });
    }

    const parsed = parsePaperCitationCardBlock(match[2] ?? "");

    if (parsed) {
      segments.push({
        type: "citation-card",
        data: parsed,
      });
    } else {
      segments.push({
        type: "markdown",
        content: content.slice(start, end),
      });
    }

    cursor = end;
  }

  if (cursor < content.length) {
    segments.push({
      type: "markdown",
      content: content.slice(cursor),
    });
  }

  return segments.length > 0 ? segments : [{ type: "markdown", content }];
}

export function extractMarkdownCitationCards(content: string) {
  return splitMarkdownCitationSegments(content)
    .filter(
      (
        segment,
      ): segment is Extract<MarkdownCitationSegment, { type: "citation-card" }> =>
        segment.type === "citation-card",
    )
    .map((segment) => segment.data);
}
