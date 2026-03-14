import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  FileText,
  MessageSquareMore,
  MoveDownRight,
  UserRound,
} from "lucide-react";
import { CommentThread } from "@/components/site/comment-thread";
import { Markdown } from "@/components/site/markdown";
import { ReadingProgress } from "@/components/site/reading-progress";
import { getCurrentUser } from "@/lib/auth";
import { getPostBySlug } from "@/lib/queries";
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

  const contentStats = getContentStats(post.content);

  return (
    <div className="container-shell py-12 md:py-16">
      <ReadingProgress targetId="article-content" label={`Reading progress for ${post.title}`} />

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
            <span className="badge-soft">{post.category}</span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {contentStats.estimatedMinutes} min read
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {contentStats.characterCount.toLocaleString()} chars
            </span>
            <span>{formatDate(post.publishedAt)}</span>
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
              <span key={tag} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-[var(--ink-soft)]">
                #{tag}
              </span>
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

        <CommentThread
          postId={post.id}
          postSlug={post.slug}
          comments={post.comments}
          currentUser={currentUser}
          statusMessage={resolvedSearchParams.comment}
          sectionId="comments"
        />
      </article>
    </div>
  );
}