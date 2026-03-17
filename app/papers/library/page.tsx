import Link from "next/link";
import { ExternalLink, FileText, NotebookPen, PlayCircle, Trash2 } from "lucide-react";
import { CitationPanel } from "@/components/site/citation-panel";
import { SectionHeading } from "@/components/site/section-heading";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  addPaperAnnotationAction,
  deletePaperAnnotationAction,
  removePaperFromLibraryAction,
  updatePaperLibraryProgressAction,
  updatePaperLibraryStatusAction,
} from "@/lib/actions/paper-actions";
import { requireUser } from "@/lib/auth";
import { buildPaperBibtex, buildPaperCitation } from "@/lib/citations";
import {
  formatPaperReadingStatus,
  paperLibraryErrorMap,
  paperLibraryNoticeMap,
  paperReadingStatusOptions,
} from "@/lib/paper-library";
import { getUserPaperLibrary } from "@/lib/paper-library-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusSections = [
  {
    key: "READING",
    title: "Reading now",
    description: "Papers currently active in the queue.",
  },
  {
    key: "TO_READ",
    title: "Queued next",
    description: "Saved papers waiting for a focused reading session.",
  },
  {
    key: "COMPLETED",
    title: "Completed",
    description: "Papers you finished and want to keep searchable.",
  },
  {
    key: "ARCHIVED",
    title: "Archived",
    description: "Older papers preserved for reference without cluttering the active queue.",
  },
] as const;

function getProgressWidth(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

export default async function PaperLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const items = await getUserPaperLibrary(user.id);

  const counts = {
    total: items.length,
    reading: items.filter((item) => item.status === "READING").length,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    annotations: items.reduce((sum, item) => sum + item._count.annotations, 0),
  };

  const continueReadingItems = [...items]
    .filter((item) => item.status === "READING" || (item.progressPercent > 0 && item.progressPercent < 100))
    .sort((left, right) => {
      const rightTime = new Date(right.lastReadAt ?? right.updatedAt).getTime();
      const leftTime = new Date(left.lastReadAt ?? left.updatedAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 3);

  return (
    <div className="container-shell py-16">
      <div className="space-y-8">
        <SectionHeading
          kicker="Research Library"
          title="My Paper Library"
          description="Keep saved papers in a private queue, sync reading progress, capture highlighted passages, and export clean citations when an idea graduates into a note or digest."
          href="/papers"
          linkLabel="Back to Daily Papers"
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Saved Papers</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{counts.total}</p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Reading Now</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{counts.reading}</p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Completed</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{counts.completed}</p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Annotations</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{counts.annotations}</p>
          </div>
        </div>

        {continueReadingItems.length > 0 ? (
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Continue reading</h2>
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                The most recently active papers are surfaced here so you can jump back in without searching through the whole queue.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {continueReadingItems.map((item) => (
                <article key={item.id} className="glass-card rounded-[2rem] p-5">
                  <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                    <PlayCircle className="h-4 w-4 text-[var(--accent)]" />
                    <span>{formatPaperReadingStatus(item.status)}</span>
                    <span>{item.progressPercent}%</span>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.summary}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: getProgressWidth(item.progressPercent) }} />
                  </div>
                  <div className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                    Last read: {item.lastReadAt ? formatDate(item.lastReadAt, "yyyy-MM-dd HH:mm") : "Not synced yet"}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={item.pdfUrl ?? item.paperUrl} className="btn-secondary">
                      <FileText className="h-4 w-4" />
                      Continue
                    </Link>
                    <Link href="/papers/library" className="btn-secondary">
                      Open card
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {items.length ? (
          <div className="space-y-8">
            {statusSections.map((section) => {
              const sectionItems = items.filter((item) => item.status === section.key);

              return (
                <section key={section.key} className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="font-serif text-3xl font-semibold tracking-tight">{section.title}</h2>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">{section.description}</p>
                  </div>

                  {sectionItems.length ? (
                    <div className="grid gap-4">
                      {sectionItems.map((item) => {
                        const citation = buildPaperCitation({
                          arxivId: item.arxivId,
                          title: item.title,
                          authors: item.authors,
                          paperUrl: item.paperUrl,
                          publishedAt: item.publishedAt ?? item.digestDate ?? item.createdAt,
                          primaryCategory: item.primaryCategory,
                        });
                        const bibtex = buildPaperBibtex({
                          arxivId: item.arxivId,
                          title: item.title,
                          authors: item.authors,
                          paperUrl: item.paperUrl,
                          publishedAt: item.publishedAt ?? item.digestDate ?? item.createdAt,
                          primaryCategory: item.primaryCategory,
                        });
                        const highlightAnnotations = item.annotations.filter((annotation) => Boolean(annotation.quote));

                        return (
                          <article key={item.id} className="glass-card rounded-[2rem] p-6">
                            <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
                              <div className="space-y-4 xl:max-w-3xl">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                                  <span className="badge-soft">{formatPaperReadingStatus(item.status)}</span>
                                  {item.topicName ? <span>{item.topicName}</span> : null}
                                  {item.primaryCategory ? <span>{item.primaryCategory}</span> : null}
                                  <span>{item.authors.join(", ")}</span>
                                </div>
                                <h3 className="font-serif text-3xl font-semibold tracking-tight">{item.title}</h3>
                                <p className="text-sm leading-8 text-[var(--ink-soft)]">{item.summary}</p>
                                <div className="flex flex-wrap gap-3">
                                  <Link href={item.paperUrl} className="btn-secondary">
                                    <ExternalLink className="h-4 w-4" />
                                    Open arXiv Page
                                  </Link>
                                  {item.pdfUrl ? (
                                    <Link href={item.pdfUrl} className="btn-secondary">
                                      <FileText className="h-4 w-4" />
                                      Open PDF
                                    </Link>
                                  ) : null}
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                    <div>Saved: {formatDate(item.createdAt, "yyyy-MM-dd HH:mm")}</div>
                                    <div>Updated: {formatDate(item.updatedAt, "yyyy-MM-dd HH:mm")}</div>
                                  </div>
                                  <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                    <div>Started: {item.startedAt ? formatDate(item.startedAt, "yyyy-MM-dd HH:mm") : "Not started"}</div>
                                    <div>Last read: {item.lastReadAt ? formatDate(item.lastReadAt, "yyyy-MM-dd HH:mm") : "Not synced"}</div>
                                  </div>
                                  <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                    <div>Completed: {item.completedAt ? formatDate(item.completedAt, "yyyy-MM-dd HH:mm") : "Not completed"}</div>
                                    <div>Progress: {item.progressPercent}%</div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 xl:w-[27rem]">
                                <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                                  <h4 className="font-semibold text-[var(--ink)]">Reading workflow</h4>
                                  <form action={updatePaperLibraryStatusAction} className="mt-3 flex flex-wrap items-center gap-3">
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input type="hidden" name="redirectTo" value="/papers/library" />
                                    <select name="status" defaultValue={item.status} className="field min-w-[11rem]">
                                      {paperReadingStatusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button type="submit" className="btn-secondary">
                                      Save status
                                    </button>
                                  </form>

                                  <form action={updatePaperLibraryProgressAction} className="mt-4 space-y-3">
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input type="hidden" name="redirectTo" value="/papers/library" />
                                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                      <span>Progress percent</span>
                                      <input
                                        type="number"
                                        name="progressPercent"
                                        min={0}
                                        max={100}
                                        defaultValue={item.progressPercent}
                                        className="field"
                                      />
                                    </label>
                                    <button type="submit" className="btn-secondary">
                                      Sync progress
                                    </button>
                                  </form>

                                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: getProgressWidth(item.progressPercent) }} />
                                  </div>

                                  <form action={removePaperFromLibraryAction} className="mt-4">
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input type="hidden" name="redirectTo" value="/papers/library" />
                                    <button type="submit" className="btn-secondary text-rose-700">
                                      <Trash2 className="h-4 w-4" />
                                      Remove from library
                                    </button>
                                  </form>
                                </section>

                                <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                                  <div className="flex items-center gap-2">
                                    <NotebookPen className="h-4 w-4 text-[var(--accent)]" />
                                    <h4 className="font-semibold text-[var(--ink)]">Notes and highlights</h4>
                                  </div>
                                  <form action={addPaperAnnotationAction} className="mt-3 space-y-3">
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input type="hidden" name="redirectTo" value="/papers/library" />
                                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                      <span>Highlighted passage</span>
                                      <textarea
                                        name="quote"
                                        rows={3}
                                        className="field min-h-20 resize-y"
                                        placeholder="Optional: capture a sentence, claim, or method worth keeping visible."
                                      />
                                    </label>
                                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                      <span>Annotation</span>
                                      <textarea
                                        name="content"
                                        rows={5}
                                        required
                                        className="field min-h-28 resize-y"
                                        placeholder="Write down why this paper matters, what to revisit, or how it connects to a note or draft."
                                      />
                                    </label>
                                    <SubmitButton>Save annotation</SubmitButton>
                                  </form>
                                </section>
                              </div>
                            </div>

                            <div className="mt-6">
                              <CitationPanel
                                citation={citation}
                                bibtex={bibtex}
                                title="Library citation"
                                description="Export a clean citation directly from your saved library record without leaving the reading workflow."
                              />
                            </div>

                            <section className="mt-6 space-y-4 rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <h4 className="font-semibold text-[var(--ink)]">Annotations</h4>
                                <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                                  {item._count.annotations} saved
                                </span>
                              </div>

                              {highlightAnnotations.length > 0 ? (
                                <div className="space-y-3">
                                  <p className="text-sm font-semibold text-[var(--ink)]">Highlighted passages</p>
                                  {highlightAnnotations.map((annotation) => (
                                    <blockquote
                                      key={`highlight-${annotation.id}`}
                                      className="rounded-[1.2rem] border border-[rgba(168,123,53,0.18)] bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]"
                                    >
                                      {annotation.quote}
                                    </blockquote>
                                  ))}
                                </div>
                              ) : null}

                              {item.annotations.length ? (
                                <div className="space-y-3">
                                  {item.annotations.map((annotation) => (
                                    <article key={annotation.id} className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
                                      {annotation.quote ? (
                                        <blockquote className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                                          {annotation.quote}
                                        </blockquote>
                                      ) : null}
                                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{annotation.content}</p>
                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                                        <span>{formatDate(annotation.createdAt, "yyyy-MM-dd HH:mm")}</span>
                                        <form action={deletePaperAnnotationAction}>
                                          <input type="hidden" name="annotationId" value={annotation.id} />
                                          <input type="hidden" name="redirectTo" value="/papers/library" />
                                          <button type="submit" className="btn-secondary text-rose-700">
                                            Delete note
                                          </button>
                                        </form>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                                  No annotations yet. Add a highlighted passage or a short reading note while the paper is still fresh.
                                </div>
                              )}
                            </section>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/60 px-5 py-6 text-sm leading-7 text-[var(--ink-soft)]">
                      No papers in this section yet.
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            Your library is empty. Visit the daily papers feed and save the papers you want to track more carefully.
          </div>
        )}
      </div>
    </div>
  );
}
