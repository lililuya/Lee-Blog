import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  GraduationCap,
  Mail,
  MapPin,
  Newspaper,
  ScrollText,
  Search,
  Wrench,
} from "lucide-react";
import { PostCard } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { HomeFooterPanels } from "@/components/site/site-footer";
import {
  getFeaturedPosts,
  getLatestWeeklyDigest,
  getPaperArchive,
  getRecentJournalEntries,
  getSiteProfile,
} from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatProfileFacts(profile: Awaited<ReturnType<typeof getSiteProfile>>) {
  return [
    {
      label: "研究机构",
      value: profile.institution ?? "可在后台补充研究机构信息",
      icon: GraduationCap,
    },
    {
      label: "所在地区",
      value: profile.location ?? "可在后台补充所在城市或地区",
      icon: MapPin,
    },
    {
      label: "联系邮箱",
      value: profile.email ?? "可在后台补充联系邮箱",
      icon: Mail,
    },
  ];
}

export default async function HomePage() {
  const [profile, featuredPosts, journalEntries, paperEntries, latestDigest] = await Promise.all([
    getSiteProfile(),
    getFeaturedPosts(2),
    getRecentJournalEntries(3),
    getPaperArchive(8),
    getLatestWeeklyDigest(),
  ]);

  const profileFacts = formatProfileFacts(profile);
  const latestDigestDate =
    paperEntries.length > 0 ? new Date(paperEntries[0].digestDate).toISOString() : null;
  const latestPapers = latestDigestDate
    ? paperEntries.filter((entry) => new Date(entry.digestDate).toISOString() === latestDigestDate)
    : [];

  return (
    <div className="container-shell py-10 lg:py-14">
      <div className="space-y-14">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-8 rounded-[2.4rem] border border-black/8 bg-white/82 p-7 shadow-[0_30px_80px_rgba(20,33,43,0.08)] md:p-9">
            <div className="space-y-4">
              <p className="section-kicker">Lee Blog Studio</p>
              <h1 className="font-serif text-[clamp(2.9rem,6vw,5.4rem)] font-semibold leading-[0.92] tracking-[-0.055em]">
                {profile.fullName}
              </h1>
              <p className="max-w-3xl text-xl font-medium text-[var(--accent-strong)]">
                {profile.headline}
              </p>
              <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                {profile.tagline}
              </p>
            </div>

            <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
              {profile.shortBio}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/blog" className="btn-primary">
                阅读博客文章
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/papers" className="btn-secondary">
                查看每日论文
              </Link>
              <Link href="/digest" className="btn-secondary">
                阅读每周简报
              </Link>
              <Link href="/search" className="btn-secondary">
                站内搜索
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {profileFacts.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-[1.6rem] border border-black/8 bg-[rgba(20,33,43,0.03)] p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <Icon className="h-4 w-4 text-[var(--accent)]" />
                    {label}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="glass-card rounded-[2.2rem] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    Academic Profile
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
                    研究方向概览
                  </h2>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.researchAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm text-[var(--ink-soft)]"
                  >
                    {area}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)]">{profile.longBio}</p>
            </div>

            <div className="glass-card rounded-[2.2rem] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                TODO
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <BookMarked className="mt-1 h-4 w-4 text-[var(--accent)]" />
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    博客、日志、评论、登录、后台管理和未来工具模块都在同一套系统里持续演化。
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ScrollText className="mt-1 h-4 w-4 text-[var(--accent)]" />
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    论文日报与每周简报把“持续输入”和“阶段总结”串联起来，让站点真正成为研究工作台。
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Wrench className="mt-1 h-4 w-4 text-[var(--accent)]" />
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    右下角对话入口已支持多模型配置，后续可以继续扩展为站内 AI 工具台。
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="space-y-6">
          <SectionHeading
            kicker="Featured Writing"
            title="精选文章"
            description="用较完整的长文沉淀方法论、项目复盘、研究思考和系统设计经验。"
            href="/blog"
            linkLabel="查看全部文章"
          />
          <div className="data-grid">
            {featuredPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <SectionHeading
              kicker="Research Journal"
              title="最近日志"
              description="日志适合记录推进节奏、实验观察和每周工作切片，让博客更像真实的研究工作台。"
              href="/journal"
              linkLabel="进入日志模块"
            />
            <div className="space-y-4">
              {journalEntries.map((entry) => (
                <article key={entry.slug} className="glass-card rounded-[2rem] p-6">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                    <span className="badge-soft">{entry.mood ?? "steady"}</span>
                    <span>{formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
                    {entry.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {entry.summary}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <SectionHeading
              kicker="Daily Papers"
              title="每日学术论文"
              description="每天按主题自动抓取 arXiv 最新论文摘要，形成可回看、可配置、可管理的研究输入流。"
              href="/papers"
              linkLabel="查看论文归档"
            />
            <div className="glass-card rounded-[2rem] p-6">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">
                  {latestPapers.length > 0 ? "今日摘要" : "等待同步"}
                </span>
                <span>
                  {latestPapers.length > 0
                    ? formatDate(latestPapers[0].digestDate, "yyyy-MM-dd")
                    : "尚未同步任何论文"}
                </span>
              </div>
              {latestPapers.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {latestPapers.slice(0, 4).map((entry) => (
                    <article
                      key={`${entry.topicId}-${entry.arxivId}`}
                      className="rounded-[1.6rem] border border-black/8 bg-white/72 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                        <span className="badge-soft">{entry.topic.name}</span>
                        {entry.primaryCategory ? <span>{entry.primaryCategory}</span> : null}
                      </div>
                      <h3 className="mt-3 font-serif text-xl font-semibold tracking-tight">
                        {entry.title}
                      </h3>
                      <p className="mt-3 line-clamp-4 text-sm leading-7 text-[var(--ink-soft)]">
                        {entry.summary}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)]">
                  你可以先在后台创建论文主题，然后通过手动同步或每天早上 8 点的定时任务拉取最新内容。
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="glass-card rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                <Newspaper className="h-5 w-5" />
              </div>
              <div>
                <p className="section-kicker">Weekly Digest</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  最近一份研究简报
                </h2>
              </div>
            </div>
            {latestDigest ? (
              <>
                <p className="mt-5 text-sm text-[var(--ink-soft)]">
                  {formatDate(latestDigest.periodStart, "yyyy-MM-dd")} - {formatDate(latestDigest.periodEnd, "yyyy-MM-dd")}
                </p>
                <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
                  {latestDigest.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {latestDigest.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {latestDigest.highlights.slice(0, 3).map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-black/8 bg-white/70 px-3 py-2 text-xs text-[var(--ink-soft)]"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
                <Link href={`/digest/${latestDigest.slug}`} className="btn-secondary mt-6">
                  阅读完整周报
                </Link>
              </>
            ) : (
              <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)]">
                目前还没有生成周报。你可以在后台手动生成，或者配置每周自动任务。
              </p>
            )}
          </article>

          <article className="glass-card rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="section-kicker">Search Layer</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  站内搜索已上线
                </h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)]">
              现在你可以直接搜索文章、日志、论文和周报，整站内容会逐步从“展示页”升级为“可检索知识系统”。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "LLM agent", href: "/search?q=LLM%20agent" },
                { label: "RAG", href: "/search?q=RAG" },
                { label: "workflow", href: "/search?q=workflow" },
                { label: "weekly digest", href: "/search?q=weekly%20digest" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full border border-black/8 bg-white/70 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <Link href="/search" className="btn-secondary mt-6">
              进入搜索页
            </Link>
          </article>
        </section>

        <HomeFooterPanels />
      </div>
    </div>
  );
}
