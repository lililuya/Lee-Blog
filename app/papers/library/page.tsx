import Link from "next/link";
import { ExternalLink, FileText, NotebookPen, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  addPaperAnnotationAction,
  deletePaperAnnotationAction,
  removePaperFromLibraryAction,
  updatePaperLibraryStatusAction,
} from "@/lib/actions/paper-actions";
import { requireUser } from "@/lib/auth";
import {
  paperLibraryErrorMap,
  paperLibraryNoticeMap,
  paperReadingStatusOptions,
  formatPaperReadingStatus,
} from "@/lib/paper-library";
import { getUserPaperLibrary } from "@/lib/paper-library-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusSections = [
  { key: "READING", title: "正在阅读", description: "当前正在阅读的paper。" },
  { key: "TO_READ", title: "准备阅读", description: "为即将到来的阅读时段保存的paper。" },
  { key: "COMPLETED", title: "完成阅读", description: "你已经通读并希望保留的paper" },
  { key: "ARCHIVED", title: "归档完成", description: "较旧的paper，它们保持可搜索状态，但不在主队列中。" },
] as const;

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

  return (
    <div className="container-shell py-16">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="section-kicker">Research Library</p>
            <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
              My Paper Library
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
              从每日推送中保存论文，维护阅读状态队列，并在想法尚新鲜时添加轻量级注释。
            </p>
          </div>
          <Link href="/papers" className="btn-secondary">
            Back to Daily Papers
          </Link>
        </div>

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">论文注释</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{counts.annotations}</p>
          </div>
        </div>

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
                      {sectionItems.map((item) => (
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
                                  <div>Completed: {item.completedAt ? formatDate(item.completedAt, "yyyy-MM-dd HH:mm") : "Not completed"}</div>
                                </div>
                                <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                  <div>Digest date: {item.digestDate ? formatDate(item.digestDate, "yyyy-MM-dd") : "n/a"}</div>
                                  <div>论文注释: {item._count.annotations}</div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4 xl:w-[27rem]">
                              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                                <h4 className="font-semibold text-[var(--ink)]">当前阅读进度</h4>
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
                                  <button type="submit" className="btn-secondary">保存阅读进度</button>
                                </form>
                                <form action={removePaperFromLibraryAction} className="mt-3">
                                  <input type="hidden" name="libraryItemId" value={item.id} />
                                  <input type="hidden" name="redirectTo" value="/papers/library" />
                                  <button type="submit" className="btn-secondary text-rose-700">
                                    <Trash2 className="h-4 w-4" />
                                    从库中移除
                                  </button>
                                </form>
                              </section>

                              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                                <div className="flex items-center gap-2">
                                  <NotebookPen className="h-4 w-4 text-[var(--accent)]" />
                                  <h4 className="font-semibold text-[var(--ink)]">添加注释</h4>
                                </div>
                                <form action={addPaperAnnotationAction} className="mt-3 space-y-3">
                                  <input type="hidden" name="libraryItemId" value={item.id} />
                                  <input type="hidden" name="redirectTo" value="/papers/library" />
                                  <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                    <span>引用的文本</span>
                                    <textarea
                                      name="quote"
                                      rows={3}
                                      className="field min-h-20 resize-y"
                                      placeholder="可选：记录有价值的句子、方法或声明。"
                                    />
                                  </label>
                                  <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                    <span>注释</span>
                                    <textarea
                                      name="content"
                                      rows={5}
                                      required
                                      className="field min-h-28 resize-y"
                                      placeholder="写下你的感想、评论、实现思路或后续问题。"
                                    />
                                  </label>
                                  <SubmitButton>保存注释</SubmitButton>
                                </form>
                              </section>
                            </div>
                          </div>

                          <section className="mt-6 space-y-3 rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                            <h4 className="font-semibold text-[var(--ink)]">论文注释</h4>
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
                                          Delete Note
                                        </button>
                                      </form>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                                还没有注释。趁论文在记忆中还新鲜时添加一个。
                              </div>
                            )}
                          </section>
                        </article>
                      ))}
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