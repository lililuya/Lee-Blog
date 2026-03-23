export type MarkdownHeading = {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id: string;
};

function stripFencedCodeBlocks(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/~~~[\s\S]*?~~~/g, "\n")
    .replace(/:::citation-card[\s\S]*?:::/g, "\n");
}

export function slugifyHeading(value: string, fallbackPrefix = "section") {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallbackPrefix;
}

export function extractMarkdownHeadings(content: string) {
  const safeContent = stripFencedCodeBlocks(content);
  const matches = safeContent.matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm);
  const slugCounts = new Map<string, number>();
  const headings: MarkdownHeading[] = [];

  for (const match of matches) {
    const depth = match[1].length as MarkdownHeading["depth"];
    const text = match[2].trim();

    if (!text) {
      continue;
    }

    const baseId = slugifyHeading(text);
    const nextCount = (slugCounts.get(baseId) ?? 0) + 1;
    slugCounts.set(baseId, nextCount);

    headings.push({
      depth,
      text,
      id: nextCount === 1 ? baseId : `${baseId}-${nextCount}`,
    });
  }

  return headings;
}
