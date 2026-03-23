import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, ArrowRight, Clock3, FileText, Layers3, Network, UserRound } from "lucide-react";
import { ArticleOutline } from "@/components/site/article-outline";
import { JsonLd } from "@/components/site/json-ld";
import { Markdown } from "@/components/site/markdown";
import { ContentSeriesNav } from "@/components/site/series-nav";
import { SubscribeCallout } from "@/components/site/subscribe-callout";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildContentMetadata,
} from "@/lib/content-seo";
import { extractMarkdownHeadings } from "@/lib/markdown";
import {
  getNoteBacklinks,
  getNoteBySlug,
  getSeriesNavigation,
  getSiteProfile,
} from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedNote = cache(getNoteBySlug);
const getCachedSiteProfile = cache(getSiteProfile);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [note, siteProfile] = await Promise.all([getCachedNote(slug), getCachedSiteProfile()]);

  if (!note) {
    return {
      title: "Note not found",
    };
  }

  return buildContentMetadata({
    title: note.title,
    description: note.summary,
    path: `/notes/${note.slug}`,
    image: siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    imageAlt: note.title,
    keywords: [note.noteType ?? "Knowledge Note", ...note.tags],
    authorName: note.author.name,
    publishedAt: note.publishedAt,
    updatedAt: note.updatedAt,
    section: note.noteType ?? "Knowledge Note",
    type: "article",
  });
}

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [note, siteProfile] = await Promise.all([getCachedNote(slug), getCachedSiteProfile()]);

  if (!note) {
    notFound();
  }

  const contentStats = getContentStats(note.content);
  const headings = extractMarkdownHeadings(note.content);
  const outlineHeadings = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);
  const seriesNavigation = await getSeriesNavigation({
    seriesId: note.seriesId,
    contentId: note.id,
    type: "NOTE",
  });
  const backlinks = await getNoteBacklinks(note.slug);
  const articleJsonLd = buildArticleJsonLd({
    type: "Article",
    title: note.title,
    description: note.summary,
    path: `/notes/${note.slug}`,
    image: siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    authorName: note.author.name,
    publishedAt: note.publishedAt,
    updatedAt: note.updatedAt,
    keywords: [note.noteType ?? "Knowledge Note", ...note.tags],
    section: note.noteType ?? "Knowledge Note",
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Notes", path: "/notes" },
    { name: note.title, path: `/notes/${note.slug}` },
  ]);

  return (
    <div className="container-shell py-12 md:py-16">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <article className="editorial-shell space-y-10">
        <header className="editorial-hero space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/notes"
              className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to notes
            </Link>
            <div className="text-sm font-semibold text-[var(--ink-soft)]">Evergreen reference</div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
              <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">
                {note.noteType ?? "Knowledge Note"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {contentStats.estimatedMinutes} min read
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {contentStats.characterCount.toLocaleString()} chars
              </span>
              <span>{formatDate(note.publishedAt)}</span>
              {note.series ? (
                <Link
                  href={`/series/${note.series.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-1 font-semibold text-[var(--accent-strong)]"
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  {note.series.title}
                </Link>
              ) : null}
            </div>

            <h1 className="content-detail-title max-w-5xl font-serif font-semibold">
              {note.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{note.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              {note.author.name}
            </span>
            <span>Designed for longer-term reuse and internal cross-linking.</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <TagLinkPill key={tag} tag={tag} />
            ))}
          </div>
        </header>

        <section
          id="note-content"
          className={outlineHeadings.length > 0 ? "grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]" : ""}
        >
          {outlineHeadings.length > 0 ? (
            <ArticleOutline headings={outlineHeadings} contentLabel="Note outline" />
          ) : null}
          <div className="min-w-0">
            <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-black/8 py-4 text-sm text-[var(--ink-soft)]">
              <span>Evergreen notes are optimized for reuse, linking, and gradual refinement.</span>
              <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                Approx. {contentStats.characterCount.toLocaleString()} characters
              </span>
              {outlineHeadings.length > 0 ? (
                <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                  {outlineHeadings.length} sections
                </span>
              ) : null}
            </div>
            <Markdown content={note.content} headings={headings} />
          </div>
        </section>

        {backlinks.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Network className="h-4 w-4" />
                Knowledge network
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Referenced in other writing</h2>
              <p className="editorial-separator-copy">
                This note is already cited by other public entries, which makes it easier to follow
                how one idea propagates across essays, digests, and working notes.
              </p>
            </div>
            <div className="editorial-list">
              {backlinks.map((backlink) => (
                <Link key={`${backlink.kindLabel}-${backlink.id}`} href={backlink.href} className="editorial-list-item block">
                  <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)_2.5rem] md:items-start">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      <div>{backlink.kindLabel}</div>
                      <div className="mt-2">{formatDate(backlink.publishedAt, "yyyy-MM-dd")}</div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                        {backlink.title}
                      </h3>
                      <p className="max-w-4xl text-sm leading-7 text-[var(--ink-soft)]">
                        {backlink.summary}
                      </p>
                    </div>
                    <div className="hidden md:flex md:justify-end">
                      <ArrowRight className="h-4 w-4 text-[var(--accent-strong)]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {seriesNavigation ? (
          <ContentSeriesNav
            series={seriesNavigation.series}
            currentIndex={seriesNavigation.currentIndex}
            previous={seriesNavigation.previous}
            next={seriesNavigation.next}
          />
        ) : null}

        <SubscribeCallout
          title="Subscribe to future posts around this note"
          description="Notes often become future essays. Prefill a subscription with the same topic tags so new public posts on this theme can land in your inbox automatically."
          tags={note.tags.slice(0, 5)}
          source="note"
        />
      </article>
    </div>
  );
}
