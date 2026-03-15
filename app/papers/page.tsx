import Link from "next/link";
import { Clock3, ExternalLink, FileText, Microscope } from "lucide-react";
import { CitationPanel } from "@/components/site/citation-panel";
import { SectionHeading } from "@/components/site/section-heading";
import { getCurrentUser } from "@/lib/auth";
import { savePaperToLibraryAction, updatePaperLibraryStatusAction } from "@/lib/actions/paper-actions";
import {
  formatPaperReadingStatus,
  paperLibraryErrorMap,
  paperLibraryNoticeMap,
  paperReadingStatusOptions,
} from "@/lib/paper-library";
import { getPaperLibraryItemsForArxivIds, getUserPaperLibrary } from "@/lib/paper-library-queries";
import { getPaperArchive } from "@/lib/queries";
import { buildPaperBibtex, buildPaperCitation } from "@/lib/citations";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function groupByDigestDate(entries: Awaited<ReturnType<typeof getPaperArchive>>) {
  const groups = new Map<string, typeof entries>();

  for (const entry of entries) {
    const key = new Date(entry.digestDate).toISOString();
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [currentUser, entries] = await Promise.all([getCurrentUser(), getPaperArchive(80)]);
  const groups = groupByDigestDate(entries);
  const topicCount = new Set(entries.map((entry) => entry.topic.name)).size;

  const userLibrary = currentUser ? await getUserPaperLibrary(currentUser.id) : [];
  const visibleLibraryItems = currentUser
    ? await getPaperLibraryItemsForArxivIds(
        currentUser.id,
        Array.from(new Set(entries.map((entry) => entry.arxivId))),
      )
    : [];

  const libraryMap = new Map(visibleLibraryItems.map((item) => [item.arxivId, item]));
  const readingCount = userLibrary.filter((item) => item.status === "READING").length;
  const completedCount = userLibrary.filter((item) => item.status === "COMPLETED").length;

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Daily Papers"
          title="Daily paper radar"
          description="Track fresh arXiv inputs by topic, save the ones worth keeping, and move them into a personal research queue with progress, notes, and citation export."
          href={currentUser ? "/papers/library" : "/login?next=/papers/library"}
          linkLabel={currentUser ? "Open my library" : "Sign in to save papers"}
        />

        {params.notice && paperLibraryNoticeMap[params.notice] ? (
          <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
            {paperLibraryNoticeMap[params.notice]}
          </div>
        ) : null}

        {params.error && paperLibraryErrorMap[params.error] ? (
          <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
            {paperLibraryErrorMap[params.error]}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Indexed Papers</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{entries.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Fresh paper cards are grouped by digest date so you can revisit recent research inputs without losing chronology.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Tracked Topics</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{topicCount}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              These topics come from the admin-managed arXiv queries that feed the site.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">My Queue</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{userLibrary.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {currentUser
                ? `${readingCount} currently reading, ${completedCount} completed.`
                : "Sign in to keep a private reading queue, notes, and citation exports."}
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Suggested Sync Time</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">08:00</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              The current workflow assumes a daily morning pass in the Asia/Shanghai publication window.
            </p>
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">
                    {formatDate(group.date, "yyyy-MM-dd")}
                  </h2>
                </div>

                <div className="grid gap-4">
                  {group.items.map((entry) => {
                    const libraryItem = libraryMap.get(entry.arxivId);
                    const citation = buildPaperCitation({
                      arxivId: entry.arxivId,
                      title: entry.title,
                      authors: entry.authors,
                      paperUrl: entry.paperUrl,
                      publishedAt: entry.publishedAt,
                      primaryCategory: entry.primaryCategory,
                    });
                    const bibtex = buildPaperBibtex({
                      arxivId: entry.arxivId,
                      title: entry.title,
                      authors: entry.authors,
                      paperUrl: entry.paperUrl,
                      publishedAt: entry.publishedAt,
                      primaryCategory: entry.primaryCategory,
                    });

                    return (
                      <article
                        key={`${entry.topicId}-${entry.arxivId}`}
                        className="glass-card rounded-[2rem] p-6"
                      >
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                          <span className="badge-soft">{entry.topic.name}</span>
                          {entry.primaryCategory ? <span>{entry.primaryCategory}</span> : null}
                          <span>{entry.authors.join(", ")}</span>
                        </div>
                        <h3 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
                          {entry.title}
                        </h3>
                        <p className="mt-4 text-sm leading-8 text-[var(--ink-soft)]">{entry.summary}</p>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <Link href={entry.paperUrl} className="btn-secondary">
                            <ExternalLink className="h-4 w-4" />
                            Open arXiv Page
                          </Link>
                          {entry.pdfUrl ? (
                            <Link href={entry.pdfUrl} className="btn-secondary">
                              <FileText className="h-4 w-4" />
                              Open PDF
                            </Link>
                          ) : null}
                        </div>

                        <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                          <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                            {currentUser ? (
                              libraryItem ? (
                                <div className="space-y-4">
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                                    <span className="badge-soft">Saved</span>
                                    <span>{formatPaperReadingStatus(libraryItem.status)}</span>
                                    <span>{libraryItem.progressPercent}% progress</span>
                                    <span>{libraryItem._count.annotations} annotation(s)</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                                    <div
                                      className="h-full rounded-full bg-[var(--accent)]"
                                      style={{ width: `${Math.max(0, Math.min(100, libraryItem.progressPercent))}%` }}
                                    />
                                  </div>
                                  <form action={updatePaperLibraryStatusAction} className="flex flex-wrap items-center gap-3">
                                    <input type="hidden" name="libraryItemId" value={libraryItem.id} />
                                    <input type="hidden" name="redirectTo" value="/papers" />
                                    <select
                                      name="status"
                                      defaultValue={libraryItem.status}
                                      className="field min-w-[11rem]"
                                    >
                                      {paperReadingStatusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button type="submit" className="btn-secondary">
                                      Update Status
                                    </button>
                                    <Link href="/papers/library" className="btn-secondary">
                                      Open Library
                                    </Link>
                                  </form>
                                </div>
                              ) : (
                                <form action={savePaperToLibraryAction} className="flex flex-wrap items-center gap-3">
                                  <input type="hidden" name="redirectTo" value="/papers" />
                                  <input type="hidden" name="arxivId" value={entry.arxivId} />
                                  <input type="hidden" name="title" value={entry.title} />
                                  <input type="hidden" name="summary" value={entry.summary} />
                                  <input type="hidden" name="authors" value={JSON.stringify(entry.authors)} />
                                  <input type="hidden" name="paperUrl" value={entry.paperUrl} />
                                  <input type="hidden" name="pdfUrl" value={entry.pdfUrl ?? ""} />
                                  <input type="hidden" name="primaryCategory" value={entry.primaryCategory ?? ""} />
                                  <input type="hidden" name="topicName" value={entry.topic.name} />
                                  <input type="hidden" name="digestDate" value={entry.digestDate.toISOString()} />
                                  <input type="hidden" name="publishedAt" value={entry.publishedAt.toISOString()} />
                                  <button type="submit" className="btn-primary">
                                    Save to Library
                                  </button>
                                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                                    Save now, then track progress, notes, and citations inside your private research library.
                                  </p>
                                </form>
                              )
                            ) : (
                              <div className="flex flex-wrap items-center gap-3">
                                <Link href="/login?next=/papers/library" className="btn-primary">
                                  Sign In to Save
                                </Link>
                                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                                  Signing in unlocks a personal queue, reading progress, annotations, and citation export.
                                </p>
                              </div>
                            )}
                          </div>

                          <CitationPanel
                            citation={citation}
                            bibtex={bibtex}
                            title="Paper citation"
                            description="Copy a quick reference or BibTeX entry for this paper before it moves into a note, digest, or reading log."
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            No daily paper data is available yet. Add one or more arXiv topics in the admin panel and trigger a sync to populate this archive.
          </div>
        )}

        <div className="glass-card rounded-[2rem] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
              <Microscope className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Why this stream matters</h2>
              <p className="text-sm leading-8 text-[var(--ink-soft)]">
                Long-form writing and evergreen notes are downstream artifacts. The paper stream keeps fresh inputs visible so they can be promoted into annotations, notes, digests, and eventually essays.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
