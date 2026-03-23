import Link from "next/link";
import {
  ArrowRightLeft,
  FolderTree,
  Library,
  Mail,
} from "lucide-react";
import { renamePostCategoryAction } from "@/lib/actions/category-actions";
import { getAdminPostCategories } from "@/lib/queries";
import { formatPostStatusLabel } from "@/lib/ui-labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function resolveFeedback(state: string | undefined) {
  switch (state) {
    case "updated":
      return {
        tone: "success" as const,
        message: "分类名称已成功更新。",
      };
    case "updated-subscribers":
      return {
        tone: "success" as const,
        message: "分类名称已成功更新，关联的邮件订阅筛选条件也已经同步修改。",
      };
    case "merged":
      return {
        tone: "success" as const,
        message: "分类已成功合并。现有文章和订阅筛选条件都会统一使用同一个分类名称。",
      };
    case "unchanged":
      return {
        tone: "warning" as const,
        message: "没有执行任何修改，因为分类名称没有变化。",
      };
    case "invalid":
      return {
        tone: "error" as const,
        message: "请输入 2 到 60 个字符之间的有效分类名称。",
      };
    case "missing":
      return {
        tone: "error" as const,
        message: "这个分类已经没有被任何文章使用了。",
      };
    default:
      return null;
  }
}

function toneClassName(tone: "success" | "warning" | "error") {
  if (tone === "success") {
    return "rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700";
  }

  if (tone === "warning") {
    return "rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700";
  }

  return "rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700";
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [categories, resolvedSearchParams] = await Promise.all([
    getAdminPostCategories(),
    searchParams,
  ]);
  const feedback = resolveFeedback(resolvedSearchParams.state);
  const totalPosts = categories.reduce((sum, category) => sum + category.totalPosts, 0);
  const totalSubscribers = categories.reduce((sum, category) => sum + category.subscriberCount, 0);
  const publishedCategories = categories.filter((category) => category.publishedPosts > 0).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="section-kicker">分类</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">文章分类管理</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          文章编辑器里依然可以自由创建分类。这个页面用于统一大类名称、合并重复分类，并保留基于分类的订阅筛选。
        </p>
      </div>

      {feedback ? <div className={toneClassName(feedback.tone)}>{feedback.message}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.8rem] border border-black/8 bg-white/80 p-5 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            当前分类数
          </p>
          <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[var(--ink)]">
            {categories.length}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            草稿和已发布文章中，当前正在使用的不同分类数量。
          </p>
        </article>

        <article className="rounded-[1.8rem] border border-black/8 bg-white/80 p-5 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            关联文章数
          </p>
          <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[var(--ink)]">
            {totalPosts}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            已有 {publishedCategories} 个分类在公开站点上拥有已发布内容。
          </p>
        </article>

        <article className="rounded-[1.8rem] border border-black/8 bg-white/80 p-5 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            订阅筛选项
          </p>
          <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[var(--ink)]">
            {totalSubscribers}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            当前依赖这些大类名称的分类筛选订阅数量。
          </p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              分类自定义方式
            </h2>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              你可以直接在文章编辑器里输入新的分类。之后再回到这里统一改名、规范写法，
              或把重叠分类合并成一个更清晰的大类标签。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/posts/new" className="btn-secondary">
                新建文章
              </Link>
              <Link href="/admin/posts" className="btn-secondary">
                查看文章
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="section-kicker">规范化</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              重命名或合并现有分类
            </h2>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map((category) => (
              <article
                key={category.normalizedCategory}
                className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,107,99,0.08)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                        <FolderTree className="h-4 w-4" />
                        {category.category}
                      </span>
                      <span className="badge-soft">{category.totalPosts} 篇文章</span>
                      <span className="badge-soft">{category.publishedPosts} 篇已发布</span>
                      <span className="badge-soft">{category.subscriberCount} 个订阅筛选</span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.58)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          最近发布
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                          {category.latestPublishedAt
                            ? formatDate(category.latestPublishedAt, "yyyy-MM-dd")
                            : "还没有已发布文章"}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.58)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          最近更新
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                          {category.latestUpdatedAt
                            ? formatDate(category.latestUpdatedAt, "yyyy-MM-dd HH:mm")
                            : "未记录"}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.58)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          公开分类页
                        </p>
                        <Link
                          href={`/categories/${encodeURIComponent(category.category)}`}
                          className="mt-2 inline-flex text-sm font-semibold text-[var(--accent-strong)]"
                        >
                          打开分类页
                        </Link>
                      </div>
                    </div>

                    {category.recentPosts.length > 0 ? (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                          <Library className="h-4 w-4" />
                          该分类下的最近文章
                        </div>
                        <div className="space-y-3">
                          {category.recentPosts.map((post) => (
                            <Link
                              key={post.id}
                              href={`/admin/posts/${post.id}`}
                              className="block rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.58)] px-4 py-4 transition hover:-translate-y-0.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="font-semibold text-[var(--ink)]">{post.title}</span>
                                <span className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                                  {formatPostStatusLabel(post.status)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                                {post.publishedAt
                                  ? `发布于 ${formatDate(post.publishedAt, "yyyy-MM-dd")}`
                                  : "草稿或未发布"}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <form
                    action={renamePostCategoryAction}
                    data-confirm-message={`确认重命名或合并分类“${category.category}”吗？关联文章和订阅筛选会一起更新。`}
                    className="w-full max-w-xl space-y-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.7)] p-5"
                  >
                    <input type="hidden" name="previousCategory" value={category.category} />

                    <div className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">重命名为</span>
                      <input
                        name="nextCategory"
                        defaultValue={category.category}
                        required
                        className="field"
                        placeholder="例如：AI 系统"
                      />
                    </div>

                    <p className="text-xs leading-6 text-[var(--ink-soft)]">
                      保存新名称后，所有使用这个分类的文章都会同步更新。如果新名称本身已经存在，
                      这两个分类会自动合并成一个。
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <Mail className="h-3.5 w-3.5" />
                        订阅筛选会同步更新
                      </div>
                      <button type="submit" className="btn-primary">
                        保存分类名称
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/55 p-6 text-sm leading-7 text-[var(--ink-soft)]">
            还没有任何文章分类。先创建一篇文章，之后这个页面就能帮助你逐步规范和合并分类名称。
          </div>
        )}
      </section>
    </div>
  );
}
