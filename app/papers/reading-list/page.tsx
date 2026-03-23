import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookMarked,
  BookOpenCheck,
  Clock3,
  ExternalLink,
  FileText,
  Network,
  Quote,
} from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { formatPaperReadingStatus } from "@/lib/paper-library";
import { getPaperReadingListAnchorId } from "@/lib/papers";
import { getPublicResearchReadingList } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const pageDescription =
  "Follow the public reading queue behind the blog, from active papers and highlighted passages to the essays, notes, and digests they eventually shape.";

export const metadata: Metadata = buildContentMetadata({
  title: "Public Reading List",
  description: pageDescription,
  path: "/papers/reading-list",
  keywords: [
    "public reading list",
    "research workflow",
    "paper highlights",
    "paper to post flow",
    "reading queue",
  ],
  section: "Papers",
  type: "website",
  ogEyebrow: "Research Flow",
});

function getProgressWidth(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

export default async function PublicReadingListPage() {
  const researchFlow = await getPublicResearchReadingList();
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: `${researchFlow.owner.name} public reading list`,
    description: pageDescription,
    path: "/papers/reading-list",
    itemCount: researchFlow.counts.saved,
    keywords: [
      "public reading list",
      "research workflow",
      "paper highlights",
      "paper to content flow",
    ],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "Promoted papers and current research queue",
    path: "/papers/reading-list",
    items: researchFlow.promotedPapers.map((item) => ({
      name: item.title,
      path: `/papers/reading-list#${getPaperReadingListAnchorId(item.arxivId)}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="Research Flow"
          title="Public reading list"
          description="This page exposes the paper intake behind the blog: what is being read now, which highlights were captured, and which papers have already graduated into public notes, digests, or long-form essays."
          href="/papers"
          linkLabel="Back to daily papers"
        />

        <section className="editorial-panel p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <AvatarBadge
                  name={researchFlow.owner.name}
                  src={researchFlow.owner.avatarUrl}
                  className="h-16 w-16 border-white/40 bg-white/75 text-lg"
                  fallbackLabel={researchFlow.owner.name}
                />
                <div className="space-y-2">
                  <p className="section-kicker">Maintained by {researchFlow.owner.name}</p>
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">
                    Reading queue to published output
                  </h2>
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    Readers can now trace how a paper moves from the queue into highlights and then
                    into durable writing on the site.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <div className="editorial-note-box p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  Saved
                </p>
                <p className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                  {researchFlow.counts.saved}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  Papers currently visible in the public queue
                </p>
              </div>
              <div className="editorial-note-box p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  Reading
                </p>
                <p className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                  {researchFlow.counts.reading}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  Active papers with synced progress
                </p>
              </div>
              <div className="editorial-note-box p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  Highlights
                </p>
                <p className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                  {researchFlow.counts.highlights}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  Quoted passages captured from the queue
                </p>
              </div>
              <div className="editorial-note-box p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  Promoted
                </p>
                <p className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                  {researchFlow.counts.promotedPapers}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  Papers already referenced in published writing
                </p>
              </div>
            </div>
          </div>
        </section>

        {researchFlow.continueReading.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <p className="section-kicker">Continue Reading</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                Active papers in the queue
              </h2>
              <p className="editorial-separator-copy">
                These are the papers currently being read or revisited, with progress synced so the
                research trail stays visible.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {researchFlow.continueReading.map((item) => (
                <article key={item.id} className="editorial-panel p-5">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                    <span className="badge-soft">{formatPaperReadingStatus(item.status)}</span>
                    {item.topicName ? <span>{item.topicName}</span> : null}
                    {item.primaryCategory ? <span>{item.primaryCategory}</span> : null}
                  </div>

                  <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {item.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
                    <span>{item.authors.join(", ")}</span>
                    <span>{item.progressPercent}% progress</span>
                    <span>
                      Last read:{" "}
                      {item.lastReadAt ? formatDate(item.lastReadAt, "yyyy-MM-dd HH:mm") : "Not synced"}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: getProgressWidth(item.progressPercent) }}
                    />
                  </div>

                  {item.latestQuote ? (
                    <blockquote className="mt-5 border-l-4 border-[var(--accent)] pl-4 text-sm leading-7 text-[var(--ink)]">
                      {item.latestQuote}
                    </blockquote>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={item.paperUrl} className="btn-secondary">
                      <ExternalLink className="h-4 w-4" />
                      Open paper
                    </Link>
                    {item.pdfUrl ? (
                      <Link href={item.pdfUrl} className="btn-secondary">
                        <FileText className="h-4 w-4" />
                        Open PDF
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {researchFlow.promotedPapers.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Network className="h-4 w-4" />
                Paper to content flow
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                Papers already used in published writing
              </h2>
              <p className="editorial-separator-copy">
                Every item below has already crossed the bridge from reading queue to site content,
                making the research lineage visible to readers.
              </p>
            </div>

            <div className="editorial-list">
              {researchFlow.promotedPapers.map((item) => (
                <article
                  key={item.id}
                  id={getPaperReadingListAnchorId(item.arxivId)}
                  className="editorial-list-item scroll-mt-28"
                >
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span className="badge-soft">{formatPaperReadingStatus(item.status)}</span>
                        {item.topicName ? <span>{item.topicName}</span> : null}
                        {item.primaryCategory ? <span>{item.primaryCategory}</span> : null}
                        <span>{item.arxivId}</span>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-serif text-[clamp(1.8rem,3vw,2.7rem)] font-semibold tracking-tight">
                          {item.title}
                        </h3>
                        <p className="text-sm leading-8 text-[var(--ink-soft)]">{item.summary}</p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
                        <span>{item.authors.join(", ")}</span>
                        <span>{item.usageCount} published reference(s)</span>
                        <span>{item.annotationCount} annotation(s)</span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link href={item.paperUrl} className="btn-secondary">
                          <ExternalLink className="h-4 w-4" />
                          Open paper
                        </Link>
                        {item.pdfUrl ? (
                          <Link href={item.pdfUrl} className="btn-secondary">
                            <FileText className="h-4 w-4" />
                            Open PDF
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <aside className="space-y-3 rounded-[1.5rem] border border-black/8 bg-[var(--panel-soft)] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                        <BookMarked className="h-4 w-4" />
                        Used in
                      </div>
                      <div className="space-y-3">
                        {item.usageReferences.map((reference) => (
                          <Link
                            key={`${item.id}-${reference.kindLabel}-${reference.id}`}
                            href={reference.href}
                            className="block rounded-[1.1rem] border border-black/8 px-4 py-3 transition hover:border-[var(--accent)]"
                          >
                            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                              <span>{reference.kindLabel}</span>
                              <span>{formatDate(reference.publishedAt, "yyyy-MM-dd")}</span>
                            </div>
                            <h4 className="mt-2 font-semibold text-[var(--ink)]">{reference.title}</h4>
                            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                              {reference.summary}
                            </p>
                            <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                              {reference.matchedCards > 1
                                ? `${reference.matchedCards} highlight cards`
                                : "Open reference"}
                              <ArrowUpRight className="h-4 w-4" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </aside>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {researchFlow.recentHighlights.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Quote className="h-4 w-4" />
                Captured highlights
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                Recent passages worth carrying forward
              </h2>
              <p className="editorial-separator-copy">
                These are the quoted fragments that were strong enough to be kept visible in the
                reading workflow.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {researchFlow.recentHighlights.map((highlight) => (
                <article key={highlight.id} className="editorial-panel p-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span>{formatDate(highlight.createdAt, "yyyy-MM-dd")}</span>
                    <span>{highlight.usageCount} published reference(s)</span>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
                    {highlight.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {highlight.authors.join(", ")}
                  </p>
                  <blockquote className="mt-4 border-l-4 border-[var(--accent)] pl-4 text-base leading-8 text-[var(--ink)]">
                    {highlight.quote}
                  </blockquote>
                  {highlight.note ? (
                    <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{highlight.note}</p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={highlight.paperUrl} className="btn-secondary">
                      <ExternalLink className="h-4 w-4" />
                      Open paper
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {researchFlow.queuedPapers.length > 0 || researchFlow.completedPapers.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <p className="section-kicker">Queue Shape</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                What is queued next and what is already done
              </h2>
              <p className="editorial-separator-copy">
                The public queue stays useful when readers can see both the near-term intake and the
                papers that have already been fully processed.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="space-y-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <Clock3 className="h-4 w-4" />
                  Queued next
                </div>
                <div className="space-y-3">
                  {researchFlow.queuedPapers.map((item) => (
                    <article key={item.id} className="editorial-note-box p-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span>{item.topicName ?? "Research queue"}</span>
                        {item.primaryCategory ? <span>{item.primaryCategory}</span> : null}
                      </div>
                      <h3 className="mt-3 font-serif text-xl font-semibold tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                        {item.summary}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <BookOpenCheck className="h-4 w-4" />
                  Completed recently
                </div>
                <div className="space-y-3">
                  {researchFlow.completedPapers.map((item) => (
                    <article key={item.id} className="editorial-note-box p-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span>{item.topicName ?? "Research queue"}</span>
                        <span>
                          Finished{" "}
                          {item.completedAt
                            ? formatDate(item.completedAt, "yyyy-MM-dd")
                            : formatDate(item.updatedAt, "yyyy-MM-dd")}
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-xl font-semibold tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                        {item.summary}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {researchFlow.counts.saved === 0 ? (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            The public reading list is still empty. Save papers into the private library first, and
            the public research flow will start filling in automatically once items and highlights
            are available.
          </div>
        ) : null}
      </div>
    </div>
  );
}
