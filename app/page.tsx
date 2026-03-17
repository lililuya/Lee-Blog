import Link from "next/link";
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  FileSearch,
  Github,
  Globe,
  Images,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Pin,
  ScrollText,
  Search,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react";
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
import { CategoryLinkPill } from "@/components/site/category-link-pill";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

type QuickLink = {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

type HomeUpdate = {
  href: string;
  kindLabel: string;
  title: string;
  summary: string;
  meta: string;
  date: Date;
};

const quickLinks: QuickLink[] = [
  {
    href: "/blog",
    label: "Blog essays",
    detail: "Long-form writing",
    icon: BookOpenText,
  },
  {
    href: "/notes",
    label: "Evergreen notes",
    detail: "Atomic ideas",
    icon: NotebookPen,
  },
  {
    href: "/digest",
    label: "Research digest",
    detail: "Weekly recap",
    icon: ScrollText,
  },
  {
    href: "/gallery",
    label: "Gallery",
    detail: "Visual albums",
    icon: Images,
  },
  {
    href: "/archive",
    label: "Archive",
    detail: "Browse by month",
    icon: Archive,
  },
  {
    href: "/papers",
    label: "Paper tracker",
    detail: "Research intake",
    icon: FileSearch,
  },
  {
    href: "/search",
    label: "Site search",
    detail: "Find by topic",
    icon: Search,
  },
];

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
        kindLabel: "Blog",
        title: post.title,
        summary: post.excerpt,
        meta: `${post.category} · ${getReadMinutes(post)} min read`,
        date: post.publishedAt ?? post.updatedAt,
      })),
    ...notes.map((note) => ({
      href: `/notes/${note.slug}`,
      kindLabel: "Note",
      title: note.title,
      summary: note.summary,
      meta: note.noteType ?? "Evergreen note",
      date: note.publishedAt ?? note.updatedAt,
    })),
    ...digests.map((digest) => ({
      href: `/digest/${digest.slug}`,
      kindLabel: "Digest",
      title: digest.title,
      summary: digest.summary,
      meta: `${formatDate(digest.periodStart, "MM.dd")} - ${formatDate(digest.periodEnd, "MM.dd")}`,
      date: digest.periodEnd,
    })),
    ...journals.map((entry) => ({
      href: "/journal",
      kindLabel: "Journal",
      title: entry.title,
      summary: entry.summary,
      meta: entry.mood ?? "Research journal",
      date: entry.publishedAt,
    })),
  ];

  return updates
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 8);
}

export default async function HomePage() {
  const [
    currentUser,
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
    getCurrentUser(),
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

  return (
    <div className="container-shell py-10 lg:py-14">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_22rem]">
        <div className="space-y-6 lg:space-y-8">
          <section className="glass-card rounded-[2.2rem] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Quick Links</p>
                <h1 className="mt-2 font-serif text-[clamp(2rem,3.5vw,3rem)] font-semibold tracking-tight">
                  Browse clearly, start here.
                </h1>
              </div>
              <Link href="/archive" className="section-link-pill section-link-pill--compact">
                Open archive
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              {quickLinks.map(({ href, label, detail, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="home-quick-link min-w-[10.8rem] flex-1 rounded-[1.5rem] px-4 py-4"
                >
                  <span className="home-quick-link__icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="mt-3 block font-semibold text-[var(--ink)]">{label}</span>
                  <span className="mt-1 block text-sm text-[var(--ink-soft)]">{detail}</span>
                </Link>
              ))}
            </div>
          </section>

          {pinnedPost ? (
            <section className="home-pinned-panel rounded-[2.6rem] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(168,123,53,0.14)] px-4 py-2 text-sm font-semibold text-[var(--gold)]">
                  <Pin className="h-4 w-4" />
                  Pinned
                </span>
                <span className="text-sm text-[var(--ink-soft)]">
                  {formatDate(pinnedPost.publishedAt, "yyyy-MM-dd")}
                </span>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_17rem]">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                      Featured Story
                    </p>
                    <h2 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
                      {pinnedPost.title}
                    </h2>
                    <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                      {pinnedPost.excerpt}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pinnedPost.tags.slice(0, 6).map((tag) => (
                      <TagLinkPill
                        key={tag}
                        tag={tag}
                        className="border-black/8 bg-white/72 px-3 py-1.5"
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/blog/${pinnedPost.slug}`} className="btn-primary">
                      Read featured post
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link href="/blog" className="btn-secondary">
                      Browse all posts
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3">
                  <article className="home-sidebar-card rounded-[1.7rem] p-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      Category
                    </p>
                    <div className="mt-2">
                      <CategoryLinkPill
                        category={pinnedPost.category}
                        className="bg-white/72 text-base font-semibold"
                      />
                    </div>
                  </article>

                  <article className="home-sidebar-card rounded-[1.7rem] p-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      Reading time
                    </p>
                    <p className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                      {getReadMinutes(pinnedPost)} min
                    </p>
                  </article>

                  <article className="home-sidebar-card rounded-[1.7rem] p-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      Why it matters
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      This piece represents the strongest current thread on the site and stays on
                      the homepage as the main editorial entry point.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          ) : null}

          <section className="home-browse-band rounded-[2.4rem] p-6 md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="section-kicker">Recent Updates</p>
                <h2 className="font-serif text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight">
                  Latest from the site
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                  Inspired by the continuous reading flow on `jiming.site`, the center column now
                  works as a true stream of updates instead of a stack of competing modules.
                </p>
              </div>
              <Link href="/archive" className="btn-secondary">
                Browse full archive
              </Link>
            </div>

            <div className="mt-6 divide-y divide-black/10">
              {recentUpdates.map((item) => (
                <Link
                  key={`${item.kindLabel}-${item.href}-${item.title}`}
                  href={item.href}
                  className="group home-feed-item block py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span className="rounded-full bg-[rgba(27,107,99,0.08)] px-3 py-1 text-[0.72rem] tracking-[0.08em] text-[var(--accent-strong)]">
                      {item.kindLabel}
                    </span>
                    <span>{formatDate(item.date, "yyyy-MM-dd")}</span>
                    <span>{item.meta}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-[1.75rem] font-semibold tracking-tight text-[var(--ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
                    {item.summary}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                    Continue reading
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <section className="glass-card rounded-[2rem] p-5">
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
                  <p className="section-kicker">Profile</p>
                </div>
                <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                  {profile.fullName}
                </h3>
                <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">
                  {profile.headline}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{profile.shortBio}</p>

            {profile.institution || profile.department ? (
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
            ) : null}

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

            <div className="mt-5 flex flex-wrap gap-3">
              {currentUser ? (
                <Link href="/account" className="btn-secondary">
                  <UserRound className="h-4 w-4" />
                  Account
                </Link>
              ) : null}
              {profile.websiteUrl ? (
                <Link
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </Link>
              ) : null}
              {profile.githubUrl ? (
                <Link
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </Link>
              ) : null}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Archive</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                  Recent archive
                </h3>
              </div>
              <Archive className="h-5 w-5 text-[var(--accent)]" />
            </div>

            <div className="mt-4 space-y-3">
              {archiveTimeline.map((group) => (
                <Link
                  key={group.key}
                  href={`/archive#${group.key}`}
                  className="home-archive-row flex items-center justify-between rounded-[1.25rem] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[var(--ink)]">{group.label}</span>
                  <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                    {group.total}
                  </span>
                </Link>
              ))}
            </div>

            <Link href="/archive" className="section-link-pill section-link-pill--compact mt-5">
              View full archive
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--gold)]" />
              <h3 className="font-serif text-2xl font-semibold tracking-tight">Popular Tags</h3>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Link
                  key={tag.tag}
                  href={`/tags/${encodeURIComponent(tag.tag)}`}
                  className="rounded-full border border-black/8 bg-white/72 px-3 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                >
                  #{tag.tag} · {tag.count}
                </Link>
              ))}
            </div>
            <Link href="/tags" className="section-link-pill section-link-pill--compact mt-5">
              Browse all tags
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="font-serif text-2xl font-semibold tracking-tight">Recent Comments</h3>
            </div>

            <div className="mt-4 space-y-4">
              {recentComments.length > 0 ? (
                recentComments.map((comment) => (
                  <article
                    key={comment.id}
                    className="home-sidebar-card rounded-[1.35rem] p-4"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-soft)]">
                      <span className="font-semibold text-[var(--ink)]">{comment.author.name}</span>
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
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.62)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
                  Approved comments will appear here so visitors can quickly catch the latest
                  conversations on the site.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
