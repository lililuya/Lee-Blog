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
        <p className="section-kicker">Analytics</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          Site operations panel
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          Review the last {analytics.windowDays} days of reading, search, archive behavior, and comment conversion to see what content is actually working.
        </p>
      </section>

      <section className="data-grid">
        <StatCard label="Page Views" value={analytics.totals.pageViews} hint={`Tracked in the last ${analytics.windowDays} days.`} />
        <StatCard label="Unique Visitors" value={analytics.totals.uniqueVisitors} hint="Estimated from hashed visitor networks." />
        <StatCard label="Searches" value={analytics.totals.searches} hint="Search submissions recorded from the public search page." />
        <StatCard label="Archive Visits" value={analytics.totals.archiveVisits} hint="How often readers open the archive as a discovery surface." />
        <StatCard label="Blog Views" value={analytics.totals.blogViews} hint="Visits that landed on long-form blog posts." />
        <StatCard label="Approved Comments" value={analytics.totals.approvedComments} hint="Approved discussion volume in the same time window." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Traffic trends</h2>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">All tracked page views</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                Rolling daily traffic over the last 14 days.
              </p>
              <div className="mt-4">
                <TrendBars items={analytics.viewsTrend} label="views" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Archive visits</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                A good proxy for topic browsing and long-tail content discovery.
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
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Top search terms</h2>
          </div>

          {analytics.topSearchQueries.length > 0 ? (
            <div className="mt-6 space-y-4">
              {analytics.topSearchQueries.map((entry) => (
                <div key={entry.query} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[var(--ink)]">{entry.query}</span>
                    <span className="text-sm text-[var(--ink-soft)]">{entry.count} searches</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    Avg. {entry.averageResults.toFixed(1)} results per search
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              No recorded searches yet.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <FolderOpenDot className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Top pages</h2>
          </div>

          {analytics.topPages.length > 0 ? (
            <div className="mt-6 space-y-4">
              {analytics.topPages.map((page) => (
                <div key={page.path} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{page.title}</p>
                      <p className="mt-1 break-all text-sm text-[var(--ink-soft)]">{page.path}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--accent-strong)]">{page.views}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              No page view data yet.
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Top blog posts</h2>
          </div>

          {analytics.topPosts.length > 0 ? (
            <div className="mt-6 space-y-4">
              {analytics.topPosts.map((post) => (
                <div key={post.slug} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/blog/${post.slug}`} className="font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]">
                        {post.title}
                      </Link>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        {post.views} views · {post.approvedComments} approved comments · conversion {(post.conversionRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              No blog view data yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
