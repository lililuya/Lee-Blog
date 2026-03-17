import Link from "next/link";
import { ArrowUpRight, Clock3, FileText } from "lucide-react";
import { CategoryLinkPill } from "@/components/site/category-link-pill";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { formatDate, getContentStats } from "@/lib/utils";

type PostCardProps = {
  post: {
    title: string;
    slug: string;
    excerpt: string;
    content?: string;
    category: string;
    tags: string[];
    pinned?: boolean;
    readTimeMinutes: number;
    publishedAt: Date | string | null;
  };
};

export function PostCard({ post }: PostCardProps) {
  const stats = getContentStats(post.content ?? `${post.title} ${post.excerpt}`);
  const readMinutes = Math.max(post.readTimeMinutes, stats.estimatedMinutes);

  return (
    <article className="glass-card group relative overflow-hidden rounded-[2rem] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]">
      <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,_transparent,_rgba(27,107,99,0.42),_transparent)] opacity-0 transition group-hover:opacity-100" />
      <div className="mb-5 flex items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned ? (
            <span className="rounded-full bg-[rgba(168,123,53,0.14)] px-3 py-1 text-xs font-semibold text-[var(--gold)]">
              Pinned
            </span>
          ) : null}
          <CategoryLinkPill category={post.category} />
        </div>
        <span>{formatDate(post.publishedAt)}</span>
      </div>
      <div className="space-y-4">
        <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">{post.title}</h3>
        <p className="line-clamp-3 text-sm leading-7 text-[var(--ink-soft)]">{post.excerpt}</p>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <TagLinkPill key={tag} tag={tag} />
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {readMinutes} min read
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {stats.characterCount.toLocaleString()} chars
          </span>
        </div>
        <Link href={`/blog/${post.slug}`} className="section-link-pill section-link-pill--compact">
          <span>Read article</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
