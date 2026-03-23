import Link from "next/link";
import { Pin, Plus, Sparkles, SquarePen } from "lucide-react";
import { getAdminPosts } from "@/lib/queries";
import { formatContentLanguageShortLabel } from "@/lib/content-language";
import { isLivePublishedAt } from "@/lib/content-visibility";
import { formatPostStatusLabel } from "@/lib/ui-labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getAdminPosts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">文章</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">文章管理</h1>
        </div>
        <Link href="/admin/posts/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          新建文章
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">标题</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">分类</th>
              <th className="px-6 py-4 font-semibold">评论数</th>
              <th className="px-6 py-4 font-semibold">更新时间</th>
              <th className="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const isScheduled =
                post.status === "PUBLISHED" &&
                post.publishedAt &&
                !isLivePublishedAt(post.publishedAt);

              return (
                <tr key={post.id} className="border-t border-black/6">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-[var(--ink)]">{post.title}</div>
                      {post.pinned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(168,123,53,0.14)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--gold)]">
                          <Pin className="h-3 w-3" />
                          置顶
                        </span>
                      ) : null}
                      {post.featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(27,107,99,0.1)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-strong)]">
                          <Sparkles className="h-3 w-3" />
                          精选
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(20,33,43,0.08)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--ink-soft)]">
                        {formatContentLanguageShortLabel(post.language)}
                      </span>
                      {post.translationOfId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(27,107,99,0.08)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-strong)]">
                          译文
                        </span>
                      ) : null}
                      {isScheduled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(20,33,43,0.08)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--ink-soft)]">
                          定时发布
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)]">/{post.slug}</div>
                    {post.publishedAt ? (
                      <div className="mt-1 text-xs text-[var(--ink-soft)]">
                        发布时间：{formatDate(post.publishedAt, "yyyy-MM-dd HH:mm")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {formatPostStatusLabel(post.status)}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{post.category}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{post._count.comments}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {formatDate(post.updatedAt, "yyyy-MM-dd HH:mm")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
                    >
                      <SquarePen className="h-4 w-4" />
                      编辑
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
