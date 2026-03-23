import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  Mail,
  MapPin,
  MessageCircle,
  Pin,
  Tag,
  UserRound,
} from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import {
  HomeHeroCarousel,
  type HomeHeroSlide,
} from "@/components/site/home-hero-carousel";
import { CategoryLinkPill } from "@/components/site/category-link-pill";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
  buildPersonJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/content-seo";
import {
  getContentArchive,
  getPinnedPosts,
  getPopularTags,
  getPublishedNotes,
  getPublishedPosts,
  getRecentApprovedComments,
  getRecentJournalEntries,
  getSiteOwnerIdentity,
  getSiteProfile,
  getWeeklyDigests,
} from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Lee 博客",
  description:
    "把长文、常青笔记、每周周报、图集和公开讨论整合到一起的个人研究型博客。",
  path: "/",
  keywords: ["个人博客", "研究笔记", "每周周报", "常青笔记", "图集"],
  section: "首页",
  type: "website",
  ogEyebrow: "Lee 博客",
});

type HomeUpdate = {
  href: string;
  kindLabel: string;
  title: string;
  summary: string;
  meta: string;
  date: Date;
};

type PublishedPost = Awaited<ReturnType<typeof getPublishedPosts>>[number];

function getReadMinutes(post: PublishedPost) {
  const stats = getContentStats(post.content ?? `${post.title} ${post.excerpt}`);
  return Math.max(post.readTimeMinutes, stats.estimatedMinutes);
}

function buildRecentUpdates(args: {
  posts: Awaited<ReturnType<typeof getPublishedPosts>>;
  notes: Awaited<ReturnType<typeof getPublishedNotes>>;
  digests: Awaited<ReturnType<typeof getWeeklyDigests>>;
  journals: Awaited<ReturnType<typeof getRecentJournalEntries>>;
  pinnedSlug?: string | null;
}) {
  const { posts, notes, digests, journals, pinnedSlug } = args;

  const updates: HomeUpdate[] = [
    ...posts
      .filter((post) => post.slug !== pinnedSlug)
      .map((post) => ({
        href: `/blog/${post.slug}`,
        kindLabel: "文章",
        title: post.title,
        summary: post.excerpt,
        meta: `${post.category} / ${getReadMinutes(post)} 分钟阅读`,
        date: post.publishedAt ?? post.updatedAt,
      })),
    ...notes.map((note) => ({
      href: `/notes/${note.slug}`,
      kindLabel: "笔记",
      title: note.title,
      summary: note.summary,
      meta: note.noteType ?? "常青笔记",
      date: note.publishedAt ?? note.updatedAt,
    })),
    ...digests.map((digest) => ({
      href: `/digest/${digest.slug}`,
      kindLabel: "周报",
      title: digest.title,
      summary: digest.summary,
      meta: `${formatDate(digest.periodStart, "MM.dd")} - ${formatDate(digest.periodEnd, "MM.dd")}`,
      date: digest.periodEnd,
    })),
    ...journals.map((entry) => ({
      href: `/journal/${entry.slug}`,
      kindLabel: "日志",
      title: entry.title,
      summary: entry.summary,
      meta: entry.mood ?? "研究日志",
      date: entry.publishedAt,
    })),
  ];

  return updates
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 8);
}

export default async function HomePage() {
  const [
    profile,
    siteOwner,
    pinnedPosts,
    posts,
    notes,
    digests,
    journals,
    archiveTimeline,
    popularTags,
    recentComments,
  ] = await Promise.all([
    getSiteProfile(),
    getSiteOwnerIdentity(),
    getPinnedPosts(1),
    getPublishedPosts(6),
    getPublishedNotes(4),
    getWeeklyDigests(4),
    getRecentJournalEntries(4),
    getContentArchive(6),
    getPopularTags(12),
    getRecentApprovedComments(5),
  ]);

  const pinnedPost = pinnedPosts[0] ?? posts[0] ?? null;
  const profileAvatarName = profile.fullName || siteOwner.name;
  const profileAvatarSrc = siteOwner.avatarUrl || profile.heroImageUrl;
  const recentUpdates = buildRecentUpdates({
    posts,
    notes,
    digests,
    journals,
    pinnedSlug: pinnedPost?.slug,
  });
  const featuredArticle = posts.find((post) => post.slug !== pinnedPost?.slug) ?? posts[0] ?? null;
  const featuredNote = notes[0] ?? null;
  const featuredDigest = digests[0] ?? null;
  const featuredJournal = journals[0] ?? null;
  const heroSlides: HomeHeroSlide[] = [];

  if (featuredArticle) {
    heroSlides.push({
      id: `article-${featuredArticle.id}`,
      eyebrow: "最新文章",
      title: featuredArticle.title,
      summary: featuredArticle.excerpt,
      meta: [
        featuredArticle.category,
        `${getReadMinutes(featuredArticle)} 分钟阅读`,
        formatDate(featuredArticle.publishedAt ?? featuredArticle.updatedAt, "yyyy-MM-dd"),
      ],
      href: `/blog/${featuredArticle.slug}`,
      ctaLabel: "阅读文章",
      secondaryHref: "/blog",
      secondaryLabel: "浏览全部文章",
      tone: "teal",
    });
  }

  if (featuredNote) {
    heroSlides.push({
      id: `note-${featuredNote.id}`,
      eyebrow: "常青笔记",
      title: featuredNote.title,
      summary: featuredNote.summary,
      meta: [
        featuredNote.noteType ?? "笔记",
        formatDate(featuredNote.publishedAt ?? featuredNote.updatedAt, "yyyy-MM-dd"),
      ],
      href: `/notes/${featuredNote.slug}`,
      ctaLabel: "查看笔记",
      secondaryHref: "/notes",
      secondaryLabel: "浏览全部笔记",
      tone: "gold",
    });
  }

  if (featuredDigest) {
    heroSlides.push({
      id: `digest-${featuredDigest.id}`,
      eyebrow: "每周周报",
      title: featuredDigest.title,
      summary: featuredDigest.summary,
      meta: [
        `${formatDate(featuredDigest.periodStart, "MM.dd")} - ${formatDate(
          featuredDigest.periodEnd,
          "MM.dd",
        )}`,
        "研究回顾",
      ],
      href: `/digest/${featuredDigest.slug}`,
      ctaLabel: "阅读周报",
      secondaryHref: "/digest",
      secondaryLabel: "查看周报列表",
      tone: "ink",
    });
  } else if (featuredJournal) {
    heroSlides.push({
      id: `journal-${featuredJournal.id}`,
      eyebrow: "研究日志",
      title: featuredJournal.title,
      summary: featuredJournal.summary,
      meta: [
        featuredJournal.mood ?? "研究更新",
        formatDate(featuredJournal.publishedAt, "yyyy-MM-dd"),
      ],
      href: `/journal/${featuredJournal.slug}`,
      ctaLabel: "打开日志",
      secondaryHref: "/journal",
      secondaryLabel: "查看全部日志",
      tone: "ink",
    });
  }

  if (heroSlides.length < 3) {
    heroSlides.push({
      id: "archive",
      eyebrow: "内容地图",
      title: "从归档、分类和标签里继续浏览整个站点",
      summary:
        "如果你不想只按首页时间线继续阅读，也可以直接切到归档、分类和标签入口，按主题重新组织自己的阅读顺序。",
      meta: ["归档", "分类", "标签"],
      href: "/archive",
      ctaLabel: "打开归档",
      secondaryHref: "/categories",
      secondaryLabel: "浏览分类",
      tone: "teal",
    });
  }
  const personJsonLd = buildPersonJsonLd({
    name: profile.fullName,
    description: profile.shortBio,
    image: profileAvatarSrc,
    url: profile.websiteUrl,
    email: profile.email,
    jobTitle: profile.headline,
    affiliation: profile.institution,
    location: profile.location,
    sameAs: [
      profile.websiteUrl ?? "",
      profile.githubUrl ?? "",
      profile.linkedinUrl ?? "",
      profile.scholarUrl ?? "",
      profile.cvUrl ?? "",
    ],
  });
  const websiteJsonLd = buildWebsiteJsonLd({
    name: "Lee 博客",
    path: "/",
    description:
      "把长文、常青笔记、每周周报、图集和公开讨论整合到一起的个人研究型博客。",
    searchPathTemplate: "/search?q={search_term_string}",
  });
  const homeCollectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客首页",
    description:
      "Lee 博客首页，连接文章、笔记、周报、图集、归档与最近讨论。",
    path: "/",
    keywords: ["个人博客", "研究笔记", "每周周报", "常青笔记", "图集"],
    itemCount: recentUpdates.length,
  });
  const updateItemListJsonLd = buildItemListJsonLd({
    name: "站点最新更新",
    path: "/",
    items: recentUpdates.map((item) => ({
      name: item.title,
      path: item.href,
    })),
  });

  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={personJsonLd} />
      <JsonLd data={homeCollectionJsonLd} />
      <JsonLd data={updateItemListJsonLd} />

      <div className="container-shell py-8 sm:py-10 lg:py-14">
        <div className="grid gap-8 sm:gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
          <div className="editorial-shell space-y-8 xl:w-full sm:space-y-10">
            <section className="editorial-hero space-y-6 sm:space-y-8">
              <HomeHeroCarousel slides={heroSlides} />
            </section>

            {pinnedPost ? (
              <section className="editorial-section">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="section-kicker">精选内容</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                      置顶文章
                    </h2>
                  </div>
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
                  >
                    查看全部文章
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <article className="mt-6 space-y-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span className="rounded-full bg-[rgba(168,123,53,0.14)] px-3 py-1 text-[0.72rem] text-[var(--gold)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Pin className="h-3.5 w-3.5" />
                        置顶
                      </span>
                    </span>
                    <CategoryLinkPill category={pinnedPost.category} />
                    <span>{formatDate(pinnedPost.publishedAt, "yyyy-MM-dd")}</span>
                    <span>{getReadMinutes(pinnedPost)} 分钟阅读</span>
                  </div>

                  <div className="space-y-4">
                    <h3 className="max-w-5xl font-serif text-[clamp(1.55rem,4.6vw,2.7rem)] font-semibold leading-[1.02] tracking-[-0.03em] sm:leading-[0.99]">
                      {pinnedPost.title}
                    </h3>
                    <p className="max-w-4xl text-base leading-8 text-[var(--ink-soft)]">
                      {pinnedPost.excerpt}
                    </p>
                  </div>

                  {pinnedPost.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pinnedPost.tags.slice(0, 6).map((tag) => (
                        <TagLinkPill key={tag} tag={tag} />
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/blog/${pinnedPost.slug}`} className="btn-primary">
                      阅读置顶文章
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/categories" className="btn-secondary">
                      浏览分类
                    </Link>
                  </div>
                </article>
              </section>
            ) : null}

            <section className="editorial-section">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="section-kicker">最新更新</p>
                  <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                    站点最新内容
                  </h2>
                  {/* <p className="editorial-separator-copy">
                    中间主栏被整理成连续阅读流，所以新文章、笔记、周报和日志不再像彼此割裂的首页模块，而是更像一条自然展开的编辑流。
                  </p> */}
                </div>
                <Link href="/archive" className="btn-secondary">
                  查看完整归档
                </Link>
              </div>

              <div className="mt-6 editorial-list">
                {recentUpdates.map((item, index) => (
                  <Link
                    key={`${item.kindLabel}-${item.href}-${item.title}`}
                    href={item.href}
                    className="editorial-list-item group"
                  >
                  <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-end">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          <span className="rounded-full bg-[rgba(27,107,99,0.08)] px-3 py-1 text-[0.72rem] tracking-[0.08em] text-[var(--accent-strong)]">
                            {item.kindLabel}
                          </span>
                          <span>{formatDate(item.date, "yyyy-MM-dd")}</span>
                          <span>{item.meta}</span>
                        </div>
                        <h3
                          className={`font-serif font-semibold tracking-tight text-[var(--ink)] ${
                            index === 0
                              ? "text-[clamp(1.45rem,4vw,2.35rem)] leading-[1.04]"
                              : "text-[clamp(1.18rem,2.9vw,1.8rem)] leading-[1.08]"
                          }`}
                        >
                          {item.title}
                        </h3>
                        <p className="max-w-3xl text-sm leading-8 text-[var(--ink-soft)]">
                          {item.summary}
                        </p>
                      </div>

                      <div className="flex items-end lg:justify-end">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                          继续阅读
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 sm:space-y-6 xl:sticky xl:top-28 xl:self-start">
            <section className="editorial-panel p-5">
              <div className="flex items-start gap-4">
                <AvatarBadge
                  name={profileAvatarName}
                  src={profileAvatarSrc}
                  className="h-16 w-16 border-white/45 bg-white/72 text-lg"
                  fallbackLabel={profileAvatarName}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-[var(--accent)]" />
                    <p className="section-kicker">作者</p>
                  </div>
                  <h2 className="mt-2 font-serif text-[1.55rem] font-semibold tracking-tight sm:text-2xl">
                    {profile.fullName}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">
                    {profile.headline}
                  </p>
                </div>
              </div>

              {(profile.institution || profile.department) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.institution ? (
                    <span className="rounded-full bg-[rgba(27,107,99,0.08)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      {profile.institution}
                    </span>
                  ) : null}
                  {profile.department ? (
                    <span className="rounded-full bg-[rgba(168,123,53,0.12)] px-3 py-1 text-xs font-semibold text-[var(--gold)]">
                      {profile.department}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
                {profile.location ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                    <span>{profile.location}</span>
                  </div>
                ) : null}
                {profile.email ? (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                    <a href={`mailto:${profile.email}`} className="hover:text-[var(--ink)]">
                      {profile.email}
                    </a>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="editorial-panel p-5">
              <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker">归档</p>
                    <h3 className="mt-2 font-serif text-[1.55rem] font-semibold tracking-tight sm:text-2xl">
                      最近归档
                    </h3>
                  </div>
                <Archive className="h-5 w-5 text-[var(--accent)]" />
              </div>

              <div className="mt-4 space-y-3">
                {archiveTimeline.map((group) => (
                  <Link
                    key={group.key}
                    href={`/archive#${group.key}`}
                    className="flex items-center justify-between gap-4 border-b border-black/8 py-3 last:border-b-0 last:pb-0 first:pt-0"
                  >
                    <span className="text-sm font-medium text-[var(--ink)]">{group.label}</span>
                    <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      {group.total}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="editorial-panel editorial-panel--soft p-5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[var(--gold)]" />
                <h3 className="font-serif text-[1.55rem] font-semibold tracking-tight sm:text-2xl">
                  热门标签
                </h3>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Link
                    key={tag.tag}
                    href={`/tags/${encodeURIComponent(tag.tag)}`}
                    className="home-tag-chip"
                  >
                    <span className="home-tag-chip__label">
                      <span className="home-tag-chip__hash" aria-hidden="true">
                        #
                      </span>
                      {tag.tag}
                    </span>
                    <span className="home-tag-chip__count">{tag.count} 篇</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="editorial-panel editorial-panel--soft p-5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="font-serif text-[1.55rem] font-semibold tracking-tight sm:text-2xl">
                  最新评论
                </h3>
              </div>

              {recentComments.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {recentComments.map((comment) => (
                    <article
                      key={comment.id}
                      className="border-b border-black/8 pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-soft)]">
                        <span className="font-semibold text-[var(--ink)]">
                          {comment.author.name}
                          <span className="ml-2 text-[var(--ink-soft)]">
                            {comment.author.isAdmin
                              ? "管理员"
                              : comment.author.isGuest
                                ? "访客"
                                : "成员"}
                          </span>
                        </span>
                        <span>{formatDate(comment.createdAt, "MM-dd")}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--ink-soft)]">
                        {comment.content}
                      </p>
                      <Link
                        href={`/blog/${comment.post.slug}`}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
                      >
                        {comment.post.title}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                  评论自动审核
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
