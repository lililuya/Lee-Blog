import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileText,
  Layers3,
  MessageSquareMore,
  MoveDownRight,
  UserRound,
} from "lucide-react";
import { CategoryLinkPill } from "@/components/site/category-link-pill";
import { CommentThread } from "@/components/site/comment-thread";
import { Markdown } from "@/components/site/markdown";
import { PostCard } from "@/components/site/post-card";
import { ReadingProgress } from "@/components/site/reading-progress";
import { ContentSeriesNav } from "@/components/site/series-nav";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { getCurrentUser } from "@/lib/auth";
import { hasCommentReplySupport } from "@/lib/prisma";
import { getPostBySlug, getPostReadingContext, getSeriesNavigation } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const [post, currentUser] = await Promise.all([getPostBySlug(slug), getCurrentUser()]);

  if (!post) {
    notFound();
  }

  const readingContext = await getPostReadingContext({
    postId: post.id,
    category: post.category,
    tags: post.tags,
  });
  const seriesNavigation = await getSeriesNavigation({
    seriesId: post.seriesId,
    contentId: post.id,
    type: "POST",
  });
  const replyEnabled = hasCommentReplySupport();
  const contentStats = getContentStats(post.content);
  const contextualRelatedPosts = readingContext.relatedPosts.filter(
    (candidate) =>
      candidate.id !== readingContext.newerPost?.id && candidate.id !== readingContext.olderPost?.id,
  );

  return (
    <>
      <ReadingProgress targetId="article-content" />

      <div className="container-shell py-12 md:py-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/blog" className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]">
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
          <div className="hidden rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] md:inline-flex">
            Long-form article
          </div>
        </div>

        <article className="space-y-10">
          <header className="glass-card rounded-[2.4rem] p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
              <CategoryLinkPill category={post.category} />
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {contentStats.estimatedMinutes} min read
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {contentStats.characterCount.toLocaleString()} chars
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
            <h1 className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{post.excerpt}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                {post.author.name}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageSquareMore className="h-4 w-4" />
                {post.comments.length} approved comments
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagLinkPill key={tag} tag={tag} />
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#article-content" className="section-link-pill section-link-pill--compact">
                <MoveDownRight className="h-4 w-4" />
                Jump to article
              </a>
              <a href="#comments" className="section-link-pill section-link-pill--compact section-link-pill--soft">
                <MessageSquareMore className="h-4 w-4" />
                Jump to comments
              </a>
            </div>
          </header>

          <section
            id="article-content"
            className="scroll-mt-28 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8"
          >
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-black/8 pb-5 text-sm text-[var(--ink-soft)]">
              <span>Structured for focused reading, search, and discussion.</span>
              <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                Approx. {contentStats.characterCount.toLocaleString()} characters
              </span>
            </div>
            <Markdown content={post.content} />
          </section>

          {seriesNavigation ? (
            <ContentSeriesNav
              series={seriesNavigation.series}
              currentIndex={seriesNavigation.currentIndex}
              previous={seriesNavigation.previous}
              next={seriesNavigation.next}
            />
          ) : null}

          {readingContext.newerPost || readingContext.olderPost ? (
            <section className="space-y-5 rounded-[2rem] border border-black/8 bg-white/72 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
              <div className="space-y-2">
                <p className="section-kicker">Article Flow</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">Keep reading</h2>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  Move to a newer or older article without dropping out of the reading flow.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {readingContext.newerPost ? (
                  <Link
                    href={`/blog/${readingContext.newerPost.slug}`}
                    className="group rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.84)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      <ArrowLeft className="h-4 w-4" />
                      Newer article
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
                ) : null}

                {readingContext.olderPost ? (
                  <Link
                    href={`/blog/${readingContext.olderPost.slug}`}
                    className="group rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.84)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                      Older article
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
                ) : null}
              </div>
            </section>
          ) : null}

          {contextualRelatedPosts.length > 0 ? (
            <section className="space-y-6">
              <div className="space-y-2">
                <p className="section-kicker">Continue Reading</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">Related writing</h2>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  More posts connected by shared topic, category, or adjacent research concerns.
                </p>
              </div>
              <div className="data-grid">
                {contextualRelatedPosts.map((relatedPost) => (
                  <PostCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </section>
          ) : null}

          <CommentThread
            postId={post.id}
            postSlug={post.slug}
            comments={post.comments}
            currentUser={currentUser}
            replyEnabled={replyEnabled}
            statusMessage={resolvedSearchParams.comment}
            sectionId="comments"
          />
        </article>
      </div>
    </>
  );
}
