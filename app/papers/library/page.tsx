import Link from "next/link";
import { ExternalLink, FileText, NotebookPen, Trash2 } from "lucide-react";
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
    title: "正在阅读",
    description: "当前正在跟进的论文。",
  },
  {
    key: "TO_READ",
    title: "待读",
    description: "已经保存，等待专门安排时间阅读的论文。",
  },
  {
    key: "COMPLETED",
    title: "已完成",
    description: "已经读完，并希望继续保留可检索记录的论文。",
  },
  {
    key: "ARCHIVED",
    title: "已归档",
    description: "保留作参考的旧论文，不占用当前阅读队列。",
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

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell space-y-8">
        <SectionHeading
          kicker="论文库"
          title="我的论文库"
          description="把已保存论文放进私有队列，跟踪阅读进度，记录高亮片段，并在灵感成熟时直接导出引用。"
          href="/papers"
          linkLabel="返回每日论文"
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
          <div className="editorial-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              已保存论文
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{counts.total}</p>
          </div>
          <div className="editorial-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              正在阅读
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">
              {counts.reading}
            </p>
          </div>
          <div className="editorial-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              已完成
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">
              {counts.completed}
            </p>
          </div>
          <div className="editorial-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              批注
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">
              {counts.annotations}
            </p>
          </div>
        </div>

        {items.length ? (
          <div className="space-y-8">
            {statusSections.map((section) => {
              const sectionItems = items.filter((item) => item.status === section.key);

              return (
                <section key={section.key} className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="font-serif text-3xl font-semibold tracking-tight">
                      {section.title}
                    </h2>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">
                      {section.description}
                    </p>
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
                        const highlightAnnotations = item.annotations.filter((annotation) =>
                          Boolean(annotation.quote),
                        );

                        return (
                          <article key={item.id} className="editorial-panel p-6">
                            <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
                              <div className="space-y-4 xl:max-w-3xl">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                                  <span className="badge-soft">
                                    {formatPaperReadingStatus(item.status)}
                                  </span>
                                  {item.topicName ? <span>{item.topicName}</span> : null}
                                  {item.primaryCategory ? (
                                    <span>{item.primaryCategory}</span>
                                  ) : null}
                                  <span>{item.authors.join(", ")}</span>
                                </div>

                                <h3 className="font-serif text-3xl font-semibold tracking-tight">
                                  {item.title}
                                </h3>

                                <p className="text-sm leading-8 text-[var(--ink-soft)]">
                                  {item.summary}
                                </p>

                                <div className="flex flex-wrap gap-3">
                                  <Link href={item.paperUrl} className="btn-secondary">
                                    <ExternalLink className="h-4 w-4" />
                                    打开 arXiv 页面
                                  </Link>
                                  {item.pdfUrl ? (
                                    <Link href={item.pdfUrl} className="btn-secondary">
                                      <FileText className="h-4 w-4" />
                                      打开 PDF
                                    </Link>
                                  ) : null}
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="editorial-note-box p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                    <div>
                                      保存时间：{formatDate(item.createdAt, "yyyy-MM-dd HH:mm")}
                                    </div>
                                    <div>
                                      更新时间：{formatDate(item.updatedAt, "yyyy-MM-dd HH:mm")}
                                    </div>
                                  </div>

                                  <div className="editorial-note-box p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                    <div>
                                      开始阅读：
                                      {item.startedAt
                                        ? formatDate(item.startedAt, "yyyy-MM-dd HH:mm")
                                        : "尚未开始"}
                                    </div>
                                    <div>
                                      上次阅读：
                                      {item.lastReadAt
                                        ? formatDate(item.lastReadAt, "yyyy-MM-dd HH:mm")
                                        : "尚未同步"}
                                    </div>
                                  </div>

                                  <div className="editorial-note-box p-4 text-sm leading-7 text-[var(--ink-soft)]">
                                    <div>
                                      完成时间：
                                      {item.completedAt
                                        ? formatDate(item.completedAt, "yyyy-MM-dd HH:mm")
                                        : "尚未完成"}
                                    </div>
                                    <div>阅读进度：{item.progressPercent}%</div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 xl:w-[27rem]">
                                <section className="editorial-note-box p-4">
                                  <h4 className="font-semibold text-[var(--ink)]">阅读流程</h4>

                                  <form
                                    action={updatePaperLibraryStatusAction}
                                    className="mt-3 flex flex-wrap items-center gap-3"
                                  >
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input
                                      type="hidden"
                                      name="redirectTo"
                                      value="/papers/library"
                                    />
                                    <select
                                      name="status"
                                      defaultValue={item.status}
                                      className="field field--compact min-w-[11rem]"
                                    >
                                      {paperReadingStatusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button type="submit" className="btn-secondary">
                                      保存状态
                                    </button>
                                  </form>

                                  <form
                                    action={updatePaperLibraryProgressAction}
                                    className="mt-4 space-y-3"
                                  >
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input
                                      type="hidden"
                                      name="redirectTo"
                                      value="/papers/library"
                                    />
                                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                      <span>进度百分比</span>
                                      <input
                                        type="number"
                                        name="progressPercent"
                                        min={0}
                                        max={100}
                                        defaultValue={item.progressPercent}
                                        className="field field--compact"
                                      />
                                    </label>
                                    <button type="submit" className="btn-secondary">
                                      同步进度
                                    </button>
                                  </form>

                                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                                    <div
                                      className="h-full rounded-full bg-[var(--accent)]"
                                      style={{ width: getProgressWidth(item.progressPercent) }}
                                    />
                                  </div>

                                  <form action={removePaperFromLibraryAction} className="mt-4">
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input
                                      type="hidden"
                                      name="redirectTo"
                                      value="/papers/library"
                                    />
                                    <button type="submit" className="btn-secondary text-rose-700">
                                      <Trash2 className="h-4 w-4" />
                                      从论文库移除
                                    </button>
                                  </form>
                                </section>

                                <section className="editorial-note-box p-4">
                                  <div className="flex items-center gap-2">
                                    <NotebookPen className="h-4 w-4 text-[var(--accent)]" />
                                    <h4 className="font-semibold text-[var(--ink)]">
                                      笔记与高亮
                                    </h4>
                                  </div>

                                  <form action={addPaperAnnotationAction} className="mt-3 space-y-3">
                                    <input type="hidden" name="libraryItemId" value={item.id} />
                                    <input
                                      type="hidden"
                                      name="redirectTo"
                                      value="/papers/library"
                                    />
                                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                      <span>高亮片段</span>
                                      <textarea
                                        name="quote"
                                        rows={3}
                                        className="field min-h-20 resize-y"
                                        placeholder="可选：记录一句值得保留的结论、方法或论断。"
                                      />
                                    </label>
                                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                                      <span>批注</span>
                                      <textarea
                                        name="content"
                                        rows={5}
                                        required
                                        className="field min-h-28 resize-y"
                                        placeholder="写下这篇论文为什么重要、之后要回看什么，或者它和哪篇笔记、草稿有关。"
                                      />
                                    </label>
                                    <SubmitButton>保存批注</SubmitButton>
                                  </form>
                                </section>
                              </div>
                            </div>

                            <div className="mt-6">
                              <CitationPanel
                                citation={citation}
                                bibtex={bibtex}
                                title="论文库引用"
                                description="直接从当前保存记录导出干净引用，无需离开阅读流程。"
                              />
                            </div>

                            <section className="editorial-note-box mt-6 space-y-4 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <h4 className="font-semibold text-[var(--ink)]">批注</h4>
                                <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                                  {item._count.annotations} 条
                                </span>
                              </div>

                              {highlightAnnotations.length > 0 ? (
                                <div className="space-y-3">
                                  <p className="text-sm font-semibold text-[var(--ink)]">
                                    高亮摘录
                                  </p>
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
                                    <article key={annotation.id} className="editorial-note-box p-4">
                                      {annotation.quote ? (
                                        <blockquote className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                                          {annotation.quote}
                                        </blockquote>
                                      ) : null}
                                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                                        {annotation.content}
                                      </p>
                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                                        <span>
                                          {formatDate(annotation.createdAt, "yyyy-MM-dd HH:mm")}
                                        </span>
                                        <form action={deletePaperAnnotationAction}>
                                          <input
                                            type="hidden"
                                            name="annotationId"
                                            value={annotation.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="redirectTo"
                                            value="/papers/library"
                                          />
                                          <button
                                            type="submit"
                                            className="btn-secondary text-rose-700"
                                          >
                                            删除批注
                                          </button>
                                        </form>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                                  还没有批注。趁这篇论文还在脑海里，先记下一段高亮或一条简短阅读笔记。
                                </div>
                              )}
                            </section>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/60 px-5 py-6 text-sm leading-7 text-[var(--ink-soft)]">
                      这个分组里暂时还没有论文。
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            你的论文库还是空的。先去每日论文页，把想重点跟进的论文保存进来吧。
          </div>
        )}
      </div>
    </div>
  );
}
