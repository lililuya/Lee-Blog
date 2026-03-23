import Link from "next/link";
import { format } from "date-fns";
import { BellRing, Mail, Send, Tags } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { getAdminSubscriptionOverview } from "@/lib/queries";
import { formatSubscriberStatusLabel } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null) {
  if (!value) {
    return "从未";
  }

  return format(value, "yyyy-MM-dd HH:mm");
}

function formatFilterSummary(categories: string[], tags: string[]) {
  const parts = [
    categories.length > 0 ? `分类：${categories.join(", ")}` : null,
    tags.length > 0 ? `标签：${tags.join(", ")}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "全部新文章";
}

function formatDeliverySummary(subscriber: {
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
}) {
  const parts = [
    subscriber.postNotificationsEnabled
      ? `文章：${formatFilterSummary(subscriber.categories, subscriber.tags)}`
      : "文章：关闭",
    subscriber.digestNotificationsEnabled ? "摘要：开启" : "摘要：关闭",
  ];

  return parts.join(" | ");
}

function statusBadge(status: "active" | "pending" | "expired" | "unsubscribed") {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "expired") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-rose-100 text-rose-700";
}

function statusLabel(status: "active" | "pending" | "expired" | "unsubscribed") {
  return formatSubscriberStatusLabel(status);
}

export default async function AdminSubscriptionsPage() {
  const overview = await getAdminSubscriptionOverview();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">订阅</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          邮件订阅与通知覆盖情况
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          在这里查看订阅增长、主题偏好、退订压力，以及邮件更新对文章提醒和每周摘要订阅者的触达情况。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/subscribe" className="btn-secondary">
            <Mail className="h-4 w-4" />
            打开公开订阅页
          </Link>
          <Link href="/admin/analytics" className="btn-secondary">
            <BellRing className="h-4 w-4" />
            对比分析数据
          </Link>
        </div>
      </section>

      <section className="data-grid">
        <StatCard
          label="总订阅数"
          value={overview.totals.totalSubscribers}
          hint="通过公开订阅流程收集到的全部记录。"
        />
        <StatCard
          label="活跃订阅者"
          value={overview.totals.activeSubscribers}
          hint="已确认、当前可以接收邮件更新的读者。"
        />
        <StatCard
          label="文章提醒订阅数"
          value={overview.coverage.postEnabledSubscribers}
          hint="当前会收到新文章提醒的活跃订阅者。"
        />
        <StatCard
          label="每周摘要订阅数"
          value={overview.coverage.digestEnabledSubscribers}
          hint="当前会收到每周摘要邮件的活跃订阅者。"
        />
        <StatCard
          label="待确认订阅"
          value={overview.totals.pendingSubscribers}
          hint="已经提交表单，但还没有完成邮箱确认的读者。"
        />
        <StatCard
          label="退订率"
          value={`${(overview.totals.unsubscribeRate * 100).toFixed(1)}%`}
          hint="所有订阅记录里，已经退订的占比。"
        />
        <StatCard
          label="全量文章覆盖"
          value={overview.coverage.allPostsSubscribers}
          hint="不设分类和标签筛选、直接接收全部新文章的活跃订阅者。"
        />
        <StatCard
          label="平均文章通知数"
          value={overview.totals.averageNotificationCount.toFixed(1)}
          hint="文章提醒订阅者的人均新文章邮件数量。"
        />
        <StatCard
          label="平均摘要通知数"
          value={overview.totals.averageDigestNotificationCount.toFixed(1)}
          hint="每周摘要订阅者的人均摘要邮件数量。"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">覆盖结构</h2>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--ink)]">已开启文章提醒</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--accent-strong)]">
                {overview.coverage.postEnabledSubscribers}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--ink)]">接收全部文章的订阅者</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--accent-strong)]">
                {overview.coverage.allPostsSubscribers}
              </div>
              <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                会接收所有新发布文章的读者。
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--ink)]">带筛选条件的文章提醒</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--accent-strong)]">
                {overview.coverage.filteredSubscribers}
              </div>
              <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                分类筛选：{overview.coverage.categoryTargetedSubscribers} | 标签筛选：
                {overview.coverage.tagTargetedSubscribers}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--ink)]">已开启每周摘要</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--accent-strong)]">
                {overview.coverage.digestEnabledSubscribers}
              </div>
              <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                至少收到过一次摘要通知：{overview.coverage.digestNotifiedSubscribers}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">热门分类</h2>
          </div>
          {overview.topCategories.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.topCategories.map((item) => (
                <div
                  key={`category-${item.label}`}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[var(--ink)]">{item.label}</span>
                    <span className="text-sm font-semibold text-[var(--accent-strong)]">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              目前还没有分类筛选。当前订阅者都在接收全部新文章。
            </div>
          )}
        </article>

        <article className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">热门标签</h2>
          </div>
          {overview.topTags.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.topTags.map((item) => (
                <div
                  key={`tag-${item.label}`}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[var(--ink)]">{item.label}</span>
                    <span className="text-sm font-semibold text-[var(--accent-strong)]">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              目前还没有按标签筛选的订阅。
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">最近订阅者</h2>
          </div>

          {overview.recentSubscribers.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.recentSubscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--ink)]">
                        {subscriber.name || subscriber.email}
                      </div>
                      <div className="text-sm text-[var(--ink-soft)]">{subscriber.email}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${statusBadge(
                        subscriber.status,
                      )}`}
                    >
                      {statusLabel(subscriber.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {formatDeliverySummary(subscriber)}
                  </p>
                  <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    创建于：{formatDateTime(subscriber.createdAt)} | 确认于：
                    {formatDateTime(subscriber.confirmedAt)} | 退订于：
                    {formatDateTime(subscriber.unsubscribedAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有任何订阅记录。
            </div>
          )}
        </article>

        <article className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">最近通知活动</h2>
          </div>

          {overview.recentNotifications.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.recentNotifications.map((subscriber) => (
                <div
                  key={`notification-${subscriber.id}`}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--ink)]">
                        {subscriber.name || subscriber.email}
                      </div>
                      <div className="text-sm text-[var(--ink-soft)]">{subscriber.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[var(--accent-strong)]">
                        文章 {subscriber.notificationCount} | 摘要 {subscriber.digestNotificationCount}
                      </div>
                      <div className="text-xs text-[var(--ink-soft)]">
                        文章：{formatDateTime(subscriber.lastNotifiedAt)} | 摘要：
                        {formatDateTime(subscriber.lastDigestNotifiedAt)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {formatDeliverySummary(subscriber)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有邮件通知历史。
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
