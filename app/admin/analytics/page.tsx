import Link from "next/link";
import { BarChart3, FileSearch, FolderOpenDot, Search } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { getAdminSiteAnalytics } from "@/lib/site-analytics";

export const dynamic = "force-dynamic";

function TrendBars({
  items,
  label,
}: {
  items: Array<{ date: string; views: number }>;
  label: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.views), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${label}-${item.date}`} className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            <span>{item.date}</span>
            <span>{item.views}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${item.views > 0 ? Math.max(6, (item.views / maxValue) * 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminSiteAnalytics(30);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">分析</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          站点运行面板
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          查看最近 {analytics.windowDays} 天的阅读、搜索、归档行为和评论转化，判断哪些内容真正有效。
        </p>
      </section>

      <section className="data-grid">
        <StatCard
          label="页面浏览量"
          value={analytics.totals.pageViews}
          hint={`统计范围为最近 ${analytics.windowDays} 天。`}
        />
        <StatCard
          label="独立访客"
          value={analytics.totals.uniqueVisitors}
          hint="基于哈希后的访客网络信息估算。"
        />
        <StatCard
          label="搜索次数"
          value={analytics.totals.searches}
          hint="来自公开搜索页的搜索提交记录。"
        />
        <StatCard
          label="归档访问"
          value={analytics.totals.archiveVisits}
          hint="读者把归档页当作内容发现入口的频率。"
        />
        <StatCard
          label="文章访问"
          value={analytics.totals.blogViews}
          hint="落到长文博客页的访问次数。"
        />
        <StatCard
          label="已通过评论"
          value={analytics.totals.approvedComments}
          hint="同一时间窗口内审核通过的讨论数量。"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">流量趋势</h2>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">全部页面浏览量</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                最近 14 天的滚动日流量变化。
              </p>
              <div className="mt-4">
                <TrendBars items={analytics.viewsTrend} label="views" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">归档访问</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                可以作为主题浏览和长尾内容发现的一个有效代理指标。
              </p>
              <div className="mt-4">
                <TrendBars items={analytics.archiveTrend} label="archive" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">热门搜索词</h2>
          </div>

          {analytics.topSearchQueries.length > 0 ? (
            <div className="mt-6 space-y-4">
              {analytics.topSearchQueries.map((entry) => (
                <div
                  key={entry.query}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[var(--ink)]">{entry.query}</span>
                    <span className="text-sm text-[var(--ink-soft)]">{entry.count} 次搜索</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    平均每次搜索返回 {entry.averageResults.toFixed(1)} 条结果
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有记录到搜索行为。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <FolderOpenDot className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">热门页面</h2>
          </div>

          {analytics.topPages.length > 0 ? (
            <div className="mt-6 space-y-4">
              {analytics.topPages.map((page) => (
                <div
                  key={page.path}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{page.title}</p>
                      <p className="mt-1 break-all text-sm text-[var(--ink-soft)]">{page.path}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--accent-strong)]">
                      {page.views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有页面访问数据。
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">热门文章</h2>
          </div>

          {analytics.topPosts.length > 0 ? (
            <div className="mt-6 space-y-4">
              {analytics.topPosts.map((post) => (
                <div
                  key={post.slug}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        {post.views} 次访问 | {post.approvedComments} 条已通过评论 | 转化率{" "}
                        {(post.conversionRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有文章访问数据。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
