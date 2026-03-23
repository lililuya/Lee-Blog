import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileText,
  Globe2,
  Layers3,
  MessageSquareMore,
  MoveDownRight,
  Network,
  UserRound,
} from "lucide-react";
import { ArticleOutline } from "@/components/site/article-outline";
import { CategoryLinkPill } from "@/components/site/category-link-pill";
import { CommentThread } from "@/components/site/comment-thread";
import { JsonLd } from "@/components/site/json-ld";
import { Markdown } from "@/components/site/markdown";
import { PostCard } from "@/components/site/post-card";
import { ReadingProgress } from "@/components/site/reading-progress";
import { ContentSeriesNav } from "@/components/site/series-nav";
import { SubscribeCallout } from "@/components/site/subscribe-callout";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { getCurrentUser } from "@/lib/auth";
import { getPublicCommentHumanCheckConfig } from "@/lib/comment-human-check";
import {
  formatContentLanguageLabel,
  formatContentLanguageShortLabel,
} from "@/lib/content-language";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildContentMetadata,
} from "@/lib/content-seo";
import { extractMarkdownHeadings } from "@/lib/markdown";
import { hasCommentReplySupport } from "@/lib/prisma";
import {
  getPostBySlug,
  getPostKnowledgeNetwork,
  getPostLanguageAlternates,
  getPostReadingContext,
  getSeriesNavigation,
  getSiteProfile,
} from "@/lib/queries";
import { getPaperReadingListAnchorId } from "@/lib/papers";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedPost = cache(getPostBySlug);
const getCachedSiteProfile = cache(getSiteProfile);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, siteProfile] = await Promise.all([getCachedPost(slug), getCachedSiteProfile()]);

  if (!post) {
    return {
      title: "Post not found",
    };
  }

  const languageAlternates = await getPostLanguageAlternates(post.id, post.translationOfId);
  const alternateLanguages = Object.fromEntries(
    languageAlternates.map((alternate) => [alternate.language, `/blog/${alternate.slug}`]),
  );

  return buildContentMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImageUrl ?? siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    imageAlt: post.title,
    keywords: [post.category, ...post.tags],
    authorName: post.author.name,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    section: post.category,
    languageCode: post.language,
    alternateLanguages,
    type: "article",
  });
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const [post, currentUser, siteProfile] = await Promise.all([
    getCachedPost(slug),
    getCurrentUser(),
    getCachedSiteProfile(),
  ]);

  if (!post) {
    notFound();
  }

  const [readingContext, seriesNavigation, languageAlternates, knowledgeNetwork] = await Promise.all([
    getPostReadingContext({
      postId: post.id,
      category: post.category,
      tags: post.tags,
      translationRootId: post.translationOfId ?? post.id,
    }),
    getSeriesNavigation({
      seriesId: post.seriesId,
      contentId: post.id,
      type: "POST",
    }),
    getPostLanguageAlternates(post.id, post.translationOfId),
    getPostKnowledgeNetwork(post.content),
  ]);
  const replyEnabled = hasCommentReplySupport();
  const humanCheckConfig = getPublicCommentHumanCheckConfig();
  const contentStats = getContentStats(post.content);
  const headings = extractMarkdownHeadings(post.content);
  const outlineHeadings = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);
  const contextualRelatedPosts = readingContext.relatedPosts.filter(
    (candidate) =>
      candidate.id !== readingContext.newerPost?.id && candidate.id !== readingContext.olderPost?.id,
  );
  const articleJsonLd = buildArticleJsonLd({
    type: "BlogPosting",
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImageUrl ?? siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    authorName: post.author.name,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    keywords: [post.category, ...post.tags],
    section: post.category,
    languageCode: post.language,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首页", path: "/" },
    { name: "文章", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ReadingProgress targetId="article-content" />

      <div className="container-shell py-12 md:py-16">
        <article className="editorial-shell space-y-10">
          <header className="editorial-hero space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/blog"
                className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]"
              >
                <ArrowLeft className="h-4 w-4" />
                返回文章列表
              </Link>
              <div className="text-sm font-semibold text-[var(--ink-soft)]">长文文章</div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                <CategoryLinkPill category={post.category} />
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {contentStats.estimatedMinutes} 分钟阅读
                </span>
                <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                  {formatContentLanguageShortLabel(post.language)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {contentStats.characterCount.toLocaleString("zh-CN")} 字
                </span>
                <span>{formatDate(post.publishedAt)}</span>
                {post.series ? (
                  <Link
                    href={`/series/${post.series.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-1 font-semibold text-[var(--accent-strong)]"
                  >
                    <Layers3 className="h-3.5 w-3.5" />
                    {post.series.title}
                  </Link>
                ) : null}
              </div>

              <h1 className="content-detail-title max-w-5xl font-serif font-semibold">
                {post.title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{post.excerpt}</p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                {post.author.name}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageSquareMore className="h-4 w-4" />
                {post.comments.length} 条已通过评论
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagLinkPill key={tag} tag={tag} />
              ))}
            </div>

            {languageAlternates.length > 1 ? (
              <div className="rounded-[1.4rem] border border-black/8 bg-[var(--panel-soft)] px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <Globe2 className="h-4 w-4" />
                  可用语言版本
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {languageAlternates.map((alternate) =>
                    alternate.id === post.id ? (
                      <span
                        key={alternate.id}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                      >
                        {formatContentLanguageLabel(alternate.language)}
                        <span className="text-[var(--ink-soft)]">当前</span>
                      </span>
                    ) : (
                      <Link
                        key={alternate.id}
                        href={`/blog/${alternate.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-black/8 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)]"
                      >
                        {formatContentLanguageLabel(alternate.language)}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <a href="#article-content" className="section-link-pill section-link-pill--compact">
                <MoveDownRight className="h-4 w-4" />
                跳到正文
              </a>
              <a
                href="#comments"
                className="section-link-pill section-link-pill--compact section-link-pill--soft"
              >
                <MessageSquareMore className="h-4 w-4" />
                跳到评论
              </a>
            </div>
          </header>

          <section
            id="article-content"
            className={outlineHeadings.length > 0 ? "grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]" : ""}
          >
            {outlineHeadings.length > 0 ? (
              <ArticleOutline headings={outlineHeadings} contentLabel="文章目录" />
            ) : null}

            <div className="min-w-0">
              <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-black/8 py-4 text-sm text-[var(--ink-soft)]">
                <span>适合专注阅读、检索和讨论的结构化文章。</span>
                <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                  约 {contentStats.characterCount.toLocaleString("zh-CN")} 字
                </span>
                {outlineHeadings.length > 0 ? (
                  <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                    {outlineHeadings.length} 个小节
                  </span>
                ) : null}
              </div>

              <Markdown content={post.content} headings={headings} />
            </div>
          </section>

          {knowledgeNetwork.notes.length > 0 || knowledgeNetwork.papers.length > 0 ? (
            <section className="editorial-section space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <Network className="h-4 w-4" />
                  知识网络
                </div>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  关联笔记与论文
                </h2>
                <p className="editorial-separator-copy">
                  这篇文章已经接入整张研究知识图谱，读者可以从正文继续跳转到相关笔记与论文来源。
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {knowledgeNetwork.notes.length > 0 ? (
                  <section className="space-y-4">
                    <h3 className="font-serif text-2xl font-semibold tracking-tight">
                      关联笔记
                    </h3>
                    <div className="space-y-3">
                      {knowledgeNetwork.notes.map((note) => (
                        <Link
                          key={note.id}
                          href={`/notes/${note.slug}`}
                          className="block rounded-[1.3rem] border border-black/8 bg-[var(--panel-soft)] px-4 py-4 transition hover:border-[var(--accent)]"
                        >
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                            {note.noteType ? <span>{note.noteType}</span> : null}
                            {note.publishedAt ? (
                              <span>{formatDate(note.publishedAt, "yyyy-MM-dd")}</span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 font-serif text-xl font-semibold tracking-tight text-[var(--ink)]">
                            {note.title}
                          </h4>
                          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                            {note.summary}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {knowledgeNetwork.papers.length > 0 ? (
                  <section className="space-y-4">
                    <h3 className="font-serif text-2xl font-semibold tracking-tight">
                      引用论文
                    </h3>
                    <div className="space-y-3">
                      {knowledgeNetwork.papers.map((paper) => (
                        <article
                          key={paper.key}
                          className="rounded-[1.3rem] border border-black/8 bg-[var(--panel-soft)] px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                            {paper.arxivId ? <span>{paper.arxivId}</span> : null}
                            {paper.year ? <span>{paper.year}</span> : null}
                          </div>
                          <h4 className="mt-3 font-serif text-xl font-semibold tracking-tight text-[var(--ink)]">
                            {paper.title}
                          </h4>
                          {paper.authors.length > 0 ? (
                            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                              {paper.authors.join(", ")}
                            </p>
                          ) : null}
                          {paper.note ? (
                            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                              {paper.note}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-3">
                            {paper.url ? (
                              <Link href={paper.url} className="btn-secondary">
                                <FileText className="h-4 w-4" />
                                打开论文
                              </Link>
                            ) : null}
                            {paper.arxivId ? (
                              <Link
                                href={`/papers/reading-list#${getPaperReadingListAnchorId(paper.arxivId)}`}
                                className="btn-secondary"
                              >
                                <ArrowRight className="h-4 w-4" />
                                查看研究流
                              </Link>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
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

          {readingContext.newerPost || readingContext.olderPost ? (
            <section className="editorial-section space-y-6">
              <div className="space-y-2">
                <p className="section-kicker">阅读路径</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">继续阅读</h2>
                <p className="editorial-separator-copy">
                  你可以继续阅读更新或更早的相关文章，而不用中断当前的阅读路径。
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {readingContext.newerPost ? (
                  <Link
                    href={`/blog/${readingContext.newerPost.slug}`}
                    className="editorial-panel group p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      <ArrowLeft className="h-4 w-4" />
                      更新的文章
                    </div>
                    <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
                      {readingContext.newerPost.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                      {readingContext.newerPost.excerpt}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                      <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                        {readingContext.newerPost.category}
                      </span>
                      <span>{formatDate(readingContext.newerPost.publishedAt)}</span>
                    </div>
                  </Link>
                ) : (
                  <div className="editorial-panel editorial-panel--soft rounded-[1.6rem] border-dashed p-5 text-sm leading-7 text-[var(--ink-soft)]">
                    当前已经是这条阅读路径里最新的一篇。
                  </div>
                )}

                {readingContext.olderPost ? (
                  <Link
                    href={`/blog/${readingContext.olderPost.slug}`}
                    className="editorial-panel group p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      更早的文章
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
                      {readingContext.olderPost.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                      {readingContext.olderPost.excerpt}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                      <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                        {readingContext.olderPost.category}
                      </span>
                      <span>{formatDate(readingContext.olderPost.publishedAt)}</span>
                    </div>
                  </Link>
                ) : (
                  <div className="editorial-panel editorial-panel--soft rounded-[1.6rem] border-dashed p-5 text-sm leading-7 text-[var(--ink-soft)]">
                    当前这篇已经是这条阅读路径里最早发布的一篇。
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {contextualRelatedPosts.length > 0 ? (
            <section className="editorial-section space-y-6">
              <div className="space-y-2">
                <p className="section-kicker">继续阅读</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">相关文章</h2>
                <p className="editorial-separator-copy">
                  这些内容和当前文章共享主题、分类，或处在相邻的研究脉络中。
                </p>
              </div>
              <div className="data-grid">
                {contextualRelatedPosts.map((relatedPost) => (
                  <PostCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </section>
          ) : null}

          <SubscribeCallout
            title="订阅这个主题下的后续文章"
            description="如果这篇文章正好命中你关注的方向，可以直接带入当前分类和最相关的标签，后续相关内容发布时会更容易送达到你的邮箱。"
            categories={[post.category]}
            tags={post.tags.slice(0, 4)}
            source="post"
          />

          <CommentThread
            postId={post.id}
            postSlug={post.slug}
            comments={post.comments}
            currentUser={currentUser}
            replyEnabled={replyEnabled}
            statusMessage={resolvedSearchParams.comment}
            sectionId="comments"
            humanCheckConfig={humanCheckConfig}
          />
        </article>
      </div>
    </>
  );
}
