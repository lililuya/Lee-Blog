import { absoluteUrl } from "@/lib/utils";

type PaperCitationInput = {
  arxivId: string;
  title: string;
  authors: string[];
  paperUrl: string;
  publishedAt: Date | string;
  primaryCategory?: string | null;
};

type DigestCitationInput = {
  title: string;
  slug: string;
  publishedAt: Date | string;
  periodStart: Date | string;
  periodEnd: Date | string;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function escapeBibtexValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/"/g, '\\"');
}

function sanitizeBibtexKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getLeadAuthorSurname(authors: string[]) {
  const leadAuthor = authors[0]?.trim();

  if (!leadAuthor) {
    return "unknown";
  }

  const segments = leadAuthor.split(/\s+/).filter(Boolean);
  return sanitizeBibtexKey(segments[segments.length - 1] ?? leadAuthor) || "unknown";
}

function formatIsoDate(value: Date | string) {
  return toDate(value).toISOString().slice(0, 10);
}

function formatReadableDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDate(value));
}

export function buildPaperCitation(input: PaperCitationInput) {
  const year = toDate(input.publishedAt).getUTCFullYear();
  const authorText = input.authors.join(", ");
  return `${authorText}. "${input.title}." arXiv:${input.arxivId}, ${year}. ${input.paperUrl}`;
}

export function buildPaperBibtex(input: PaperCitationInput) {
  const date = toDate(input.publishedAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const key = `${getLeadAuthorSurname(input.authors)}-${year}-${sanitizeBibtexKey(input.arxivId)}`;

  const lines = [
    `@misc{${key},`,
    `  title = {${escapeBibtexValue(input.title)}},`,
    `  author = {${input.authors.map((author) => escapeBibtexValue(author)).join(" and ")}},`,
    `  year = {${year}},`,
    `  month = {${month}},`,
    `  eprint = {${escapeBibtexValue(input.arxivId)}},`,
    "  archivePrefix = {arXiv},",
  ];

  if (input.primaryCategory?.trim()) {
    lines.push(`  primaryClass = {${escapeBibtexValue(input.primaryCategory.trim())}},`);
  }

  lines.push(`  url = {${escapeBibtexValue(input.paperUrl)}}`);
  lines.push("}");

  return lines.join("\n");
}

export function buildDigestCitation(input: DigestCitationInput) {
  const digestUrl = absoluteUrl(`/digest/${input.slug}`);
  return `Lee's daily blog. "${input.title}." Weekly digest, published ${formatReadableDate(
    input.publishedAt,
  )}. Covers ${formatReadableDate(input.periodStart)} to ${formatReadableDate(input.periodEnd)}. ${digestUrl}`;
}

export function buildDigestBibtex(input: DigestCitationInput) {
  const publishedAt = toDate(input.publishedAt);
  const year = publishedAt.getUTCFullYear();
  const month = String(publishedAt.getUTCMonth() + 1).padStart(2, "0");
  const key = `lee-digest-${year}-${sanitizeBibtexKey(input.slug)}`;

  return [
    `@online{${key},`,
    `  title = {${escapeBibtexValue(input.title)}},`,
    "  author = {{Lee's daily blog}},",
    `  year = {${year}},`,
    `  month = {${month}},`,
    `  url = {${escapeBibtexValue(absoluteUrl(`/digest/${input.slug}`))}},`,
    `  note = {Weekly digest covering ${formatIsoDate(input.periodStart)} to ${formatIsoDate(
      input.periodEnd,
    )}}`,
    "}",
  ].join("\n");
}
