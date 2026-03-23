import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Microscope, MoreHorizontal, Network } from "lucide-react";
import { CitationPanel } from "@/components/site/citation-panel";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { getCurrentUser } from "@/lib/auth";
import { savePaperToLibraryAction, updatePaperLibraryStatusAction } from "@/lib/actions/paper-actions";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import {
  formatPaperReadingStatus,
  paperLibraryErrorMap,
  paperLibraryNoticeMap,
  paperReadingStatusOptions,
} from "@/lib/paper-library";
import { getPaperLibraryItemsForArxivIds, getUserPaperLibrary } from "@/lib/paper-library-queries";
import { getPaperAnchorId } from "@/lib/papers";
import { getPaperArchive, getPaperArchiveStats, getPublicResearchReadingList } from "@/lib/queries";
import { buildPaperBibtex, buildPaperCitation } from "@/lib/citations";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAPERS_PER_PAGE = 5;

const paperArchiveDescription =
  "按主题追踪最新 arXiv 论文，整理引用信息，并把值得继续阅读的内容推进到研究队列中。";
const paperArchiveKeywords = [
  "每日论文",
  "arxiv 追踪",
  "论文归档",
  "研究输入",
  "论文雷达",
];

export const metadata: Metadata = buildContentMetadata({
  title: "每日论文雷达",
  description: paperArchiveDescription,
  path: "/papers",
  keywords: paperArchiveKeywords,
  section: "论文",
  type: "website",
  ogEyebrow: "论文",
});

function clampPaperArchivePage(rawPage: string | undefined, totalPages: number) {
  const parsed = Number.parseInt(rawPage ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, totalPages);
}

function buildPaperArchivePageHref(page: number) {
  return page <= 1 ? "/papers" : `/papers?page=${page}`;
}

function getPaperArchivePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [currentUser, archiveStats, researchFlow] = await Promise.all([
    getCurrentUser(),
    getPaperArchiveStats(),
    getPublicResearchReadingList(),
  ]);

  const totalPages = Math.max(1, Math.ceil(archiveStats.totalCount / PAPERS_PER_PAGE));
  const currentPage = clampPaperArchivePage(params.page, totalPages);
  const currentPageHref = buildPaperArchivePageHref(currentPage);

  const [entries, userLibrary] = await Promise.all([
    getPaperArchive(PAPERS_PER_PAGE, (currentPage - 1) * PAPERS_PER_PAGE),
    currentUser ? getUserPaperLibrary(currentUser.id) : [],
  ]);

  const visibleEntryCount = entries.length;
  const firstVisibleEntry = entries.length > 0 ? (currentPage - 1) * PAPERS_PER_PAGE + 1 : 0;
  const lastVisibleEntry = entries.length > 0 ? firstVisibleEntry + entries.length - 1 : 0;
  const paginationPages = getPaperArchivePageNumbers(currentPage, totalPages);
  const promotedPreview = researchFlow.promotedPapers.slice(0, 3);

  const visibleLibraryItems = currentUser
    ? await getPaperLibraryItemsForArxivIds(
        currentUser.id,
        Array.from(new Set(entries.map((entry) => entry.arxivId))),
      )
    : [];

  const libraryMap = new Map(visibleLibraryItems.map((item) => [item.arxivId, item]));
  const readingCount = userLibrary.filter((item) => item.status === "READING").length;
  const completedCount = userLibrary.filter((item) => item.status === "COMPLETED").length;

  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客每日论文雷达",
    description: paperArchiveDescription,
    path: "/papers",
    itemCount: archiveStats.totalCount,
    keywords: paperArchiveKeywords,
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "每日论文归档",
    path: currentPageHref,
    items: entries.map((entry) => ({
      name: entry.title,
      path: `${currentPageHref}#${getPaperAnchorId({
        arxivId: entry.arxivId,
        id: entry.id,
        topicId: entry.topicId,
        digestDate: entry.digestDate,
      })}`,
    })),
  });

  const renderPaperEntryPagination = (placement: "top" | "bottom") =>
    totalPages > 1 ? (
      <div className="editorial-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="section-kicker">按论文分页</p>
            <p className="text-base font-semibold text-[var(--ink)]">
              当前显示第 {firstVisibleEntry}-{lastVisibleEntry} 篇论文
            </p>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              第 {currentPage} / {totalPages} 页，共 {archiveStats.totalCount} 篇论文，本页
              {visibleEntryCount} 篇。每页固定展示 {PAPERS_PER_PAGE} 项，不再按日期分组切页。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentPage > 1 ? (
              <Link href={buildPaperArchivePageHref(currentPage - 1)} className="btn-secondary">
                上一页
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-full border border-black/8 bg-[rgba(255,255,255,0.55)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)]">
                上一页
              </span>
            )}

            {paginationPages.map((pageNumber) => (
              <Link
                key={`${placement}-${pageNumber}`}
                href={buildPaperArchivePageHref(pageNumber)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={
                  pageNumber === currentPage
                    ? "inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[rgba(27,107,99,0.26)] bg-[rgba(27,107,99,0.12)] px-3 text-sm font-semibold text-[var(--accent-strong)]"
                    : "inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-black/8 bg-[rgba(255,255,255,0.72)] px-3 text-sm font-medium text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
                }
              >
                {pageNumber}
              </Link>
            ))}

            {currentPage < totalPages ? (
              <Link href={buildPaperArchivePageHref(currentPage + 1)} className="btn-secondary">
                下一页
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-full border border-black/8 bg-[rgba(255,255,255,0.55)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)]">
                下一页
              </span>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="每日论文"
          title="每日论文雷达"
          description="按主题追踪最新 arXiv 输入，把引用信息放在手边，并快速判断哪些论文值得继续推进到笔记或周报中。现在改成按论文顺序分页浏览，每页 5 项，阅读会轻松很多。"
          href="/papers/reading-list"
          linkLabel="打开公开阅读清单"
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

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>{archiveStats.totalCount} 篇已收录论文</span>
            <span>{archiveStats.topicCount} 个追踪主题</span>
            <span>{archiveStats.digestBatchCount} 个同步批次</span>
            <span>
              {currentUser
                ? `我的队列 ${userLibrary.length} / 在读 ${readingCount} / 已读完 ${completedCount}`
                : "登录后可把论文保存到私有研究队列"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p>建议同步时间：Asia/Shanghai 08:00</p>
            {currentUser ? (
              <Link href="/papers/library" className="btn-secondary">
                打开私有研究库
              </Link>
            ) : null}
            <Link href="/papers/reading-list" className="btn-secondary">
              查看研究流
            </Link>
          </div>
        </div>

        {entries.length > 0 ? (
          <div className="space-y-10">
            {renderPaperEntryPagination("top")}

            <div className="editorial-list">
              {entries.map((entry) => {
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
                    id={getPaperAnchorId({
                      arxivId: entry.arxivId,
                      id: entry.id,
                      topicId: entry.topicId,
                      digestDate: entry.digestDate,
                    })}
                    className="paper-radar-entry editorial-list-item scroll-mt-28"
                  >
                    <details className="paper-radar-entry__drawer">
                      <summary
                        className="paper-radar-entry__toggle"
                        aria-label="打开论文工具"
                        title="打开论文工具"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </summary>

                      <div className="paper-radar-entry__popover">
                        <div className="paper-radar-entry__popover-shell space-y-4">
                          <section className="editorial-panel p-4">
                            {currentUser ? (
                              libraryItem ? (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-[var(--ink)]">
                                      已在你的研究库中
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                                      <span className="badge-soft">已保存</span>
                                      <span>{formatPaperReadingStatus(libraryItem.status)}</span>
                                      <span>进度 {libraryItem.progressPercent}%</span>
                                      <span>{libraryItem._count.annotations} 条批注</span>
                                    </div>
                                  </div>

                                  <div className="h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                                    <div
                                      className="h-full rounded-full bg-[var(--accent)]"
                                      style={{
                                        width: `${Math.max(
                                          0,
                                          Math.min(100, libraryItem.progressPercent),
                                        )}%`,
                                      }}
                                    />
                                  </div>

                                  <form
                                    action={updatePaperLibraryStatusAction}
                                    className="flex flex-wrap items-center gap-3"
                                  >
                                    <input
                                      type="hidden"
                                      name="libraryItemId"
                                      value={libraryItem.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="redirectTo"
                                      value={currentPageHref}
                                    />
                                    <select
                                      name="status"
                                      defaultValue={libraryItem.status}
                                      className="field field--compact min-w-[11rem]"
                                    >
                                      {paperReadingStatusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button type="submit" className="btn-secondary">
                                      更新状态
                                    </button>
                                    <Link href="/papers/library" className="btn-secondary">
                                      打开研究库
                                    </Link>
                                  </form>
                                </div>
                              ) : (
                                <form action={savePaperToLibraryAction} className="space-y-3">
                                  <input type="hidden" name="redirectTo" value={currentPageHref} />
                                  <input type="hidden" name="arxivId" value={entry.arxivId} />
                                  <input type="hidden" name="title" value={entry.title} />
                                  <input type="hidden" name="summary" value={entry.summary} />
                                  <input
                                    type="hidden"
                                    name="authors"
                                    value={JSON.stringify(entry.authors)}
                                  />
                                  <input type="hidden" name="paperUrl" value={entry.paperUrl} />
                                  <input type="hidden" name="pdfUrl" value={entry.pdfUrl ?? ""} />
                                  <input
                                    type="hidden"
                                    name="primaryCategory"
                                    value={entry.primaryCategory ?? ""}
                                  />
                                  <input
                                    type="hidden"
                                    name="topicName"
                                    value={entry.topic.name}
                                  />
                                  <input
                                    type="hidden"
                                    name="digestDate"
                                    value={entry.digestDate.toISOString()}
                                  />
                                  <input
                                    type="hidden"
                                    name="publishedAt"
                                    value={entry.publishedAt.toISOString()}
                                  />
                                  <button type="submit" className="btn-primary">
                                    保存到研究库
                                  </button>
                                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                                    先保存下来，之后就能在私有研究库里继续记录进度、批注和引用。
                                  </p>
                                </form>
                              )
                            ) : (
                              <div className="space-y-3">
                                <Link
                                  href="/login?next=/papers/library"
                                  className="btn-primary"
                                >
                                  登录后保存
                                </Link>
                                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                                  登录后可使用个人队列、阅读进度、批注记录和引用导出。
                                </p>
                              </div>
                            )}
                          </section>

                          <section className="editorial-panel editorial-panel--soft p-4">
                            <CitationPanel
                              citation={citation}
                              bibtex={bibtex}
                              title="论文引用"
                              description="在把这篇论文推进到笔记、周报或阅读记录之前，先把引用文本或 BibTeX 条目复制下来。"
                              defaultOpen
                            />
                          </section>
                        </div>
                      </div>
                    </details>

                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span className="badge-soft">{entry.topic.name}</span>
                        {entry.primaryCategory ? <span>{entry.primaryCategory}</span> : null}
                        <span>{formatDate(entry.publishedAt, "yyyy-MM-dd")}</span>
                      </div>

                      <div className="space-y-3">
                        <h3 className="mx-auto max-w-4xl text-center font-serif text-[clamp(1.15rem,1.9vw,1.55rem)] font-semibold leading-[1.18] tracking-tight">
                          {entry.title}
                        </h3>
                        <p className="text-sm leading-8 text-[var(--ink-soft)]">
                          {entry.summary}
                        </p>
                      </div>

                      <p className="text-sm leading-7 text-[var(--ink-soft)]">
                        作者：{entry.authors.join(", ")}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <Link href={entry.paperUrl} className="btn-secondary">
                          <ExternalLink className="h-4 w-4" />
                          打开 arXiv 页面
                        </Link>
                        {entry.pdfUrl ? (
                          <Link href={entry.pdfUrl} className="btn-secondary">
                            <FileText className="h-4 w-4" />
                            打开 PDF
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {renderPaperEntryPagination("bottom")}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有每日论文数据。请先在后台添加一个或多个 arXiv 主题，然后触发同步来填充这里的归档。
          </div>
        )}

        {promotedPreview.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Network className="h-4 w-4" />
                研究流
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                已经进入公开写作链路的论文
              </h2>
              <p className="editorial-separator-copy">
                阅读队列现在已经和公开站点连通。下面这些论文已经被推进到笔记、周报或文章里，读者可以沿着这条链路看到它们如何从输入走向最终内容。
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {promotedPreview.map((item) => (
                <article key={item.id} className="editorial-panel p-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span className="badge-soft">{formatPaperReadingStatus(item.status)}</span>
                    <span>{item.usageCount} 次公开引用</span>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.summary}</p>
                  <div className="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
                    {item.usageReferences.slice(0, 2).map((reference) => (
                      <Link
                        key={`${item.id}-${reference.kindLabel}-${reference.id}`}
                        href={reference.href}
                        className="flex items-center justify-between gap-3 rounded-[1rem] border border-black/8 px-3 py-3 transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                            {reference.kindLabel}
                          </span>
                          <span className="mt-1 block truncate text-[var(--ink)]">
                            {reference.title}
                          </span>
                        </span>
                        <span className="text-xs text-[var(--ink-soft)]">
                          {formatDate(reference.publishedAt, "MM-dd")}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/papers/reading-list" className="btn-secondary">
                      查看完整研究流
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="editorial-section">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
              <Microscope className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">
                为什么这条论文流很重要
              </h2>
              <p className="editorial-separator-copy">
                长文和常青笔记是更下游的产物，而论文流把最新输入持续暴露出来，方便它们继续被推进成批注、笔记、周报，最后再进入文章写作。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
