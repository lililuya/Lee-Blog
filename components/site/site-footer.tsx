import Link from "next/link";
import {
  Activity,
  Clock3,
  ExternalLink,
  FileText,
  Github,
  Globe2,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  RadioTower,
  Rss,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { getFooterAnalytics, getSiteProfile } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

type ContactTile = {
  label: string;
  detail: string;
  href?: string;
  icon: LucideIcon;
};

type FooterAnalytics = Awaited<ReturnType<typeof getFooterAnalytics>>;
type FooterProfile = Awaited<ReturnType<typeof getSiteProfile>>;

const mapLandmarks = [
  "footer-atlas__land footer-atlas__land--north-america",
  "footer-atlas__land footer-atlas__land--south-america",
  "footer-atlas__land footer-atlas__land--europe",
  "footer-atlas__land footer-atlas__land--africa",
  "footer-atlas__land footer-atlas__land--asia",
  "footer-atlas__land footer-atlas__land--oceania",
];

function buildStats(footerAnalytics: FooterAnalytics) {
  return [
    {
      label: "运行时间",
      value: `${footerAnalytics.daysOnline}`,
      detail: `从 ${formatDate(footerAnalytics.launchedAt, "yyyy-MM-dd")}始`,
      icon: Clock3,
    },
    {
      label: "IPs统计",
      value: footerAnalytics.uniqueVisitors.toLocaleString("en-US"),
      detail: "统计访问站点的所有IP",
      icon: Activity,
    },
    {
      label: "访客记录",
      value: footerAnalytics.totalVisits.toLocaleString("en-US"),
      detail: "简单的访客记录",
      icon: RadioTower,
    },
    {
      label: "活跃的区域",
      value: footerAnalytics.activeRegions.toLocaleString("en-US"),
      detail: "根据IP统计活跃地区",
      icon: Globe2,
    },
  ];
}

function buildOverviewCards(footerAnalytics: FooterAnalytics) {
  const topRegion = footerAnalytics.nodes[0] ?? null;
  const latestRegion =
    footerAnalytics.nodes.length > 0
      ? footerAnalytics.nodes.reduce((latest, node) =>
          node.lastSeenAt > latest.lastSeenAt ? node : latest,
        )
      : null;
  const averageVisitsPerVisitor =
    footerAnalytics.uniqueVisitors > 0
      ? (footerAnalytics.totalVisits / footerAnalytics.uniqueVisitors).toFixed(1)
      : "0.0";

  return [
    {
      label: "最活跃区域",
      value: topRegion?.label ?? "等待数据",
      detail: topRegion
        ? `${topRegion.uniqueVisitors.toLocaleString("en-US")} IPs / ${topRegion.totalVisits.toLocaleString("en-US")} 次访问`
        : "有访客之后会自动显示",
    },
    {
      label: "最近访问记录",
      value: latestRegion?.label ?? "暂无记录",
      detail: latestRegion
        ? `${formatDate(latestRegion.lastSeenAt, "MM-dd")} 最近一次活跃`
        : "等待新的访问数据",
    },
    {
      label: "平均访问深度",
      value: `${averageVisitsPerVisitor} 次`,
      detail: "总访问次数除以去重访客数",
    },
  ];
}

function buildContactTiles(profile: FooterProfile): ContactTile[] {
  return [
    {
      label: "RSS Feed",
      detail: "Subscribe to the XML feed",
      href: "/feed.xml",
      icon: Rss,
    },
    {
      label: "JSON Feed",
      detail: "Structured updates for readers",
      href: "/feed.json",
      icon: Waves,
    },
    ...(profile.email
      ? [
          {
            label: "Email",
            detail: profile.email,
            href: `mailto:${profile.email}`,
            icon: Mail,
          },
        ]
      : []),
    ...(profile.githubUrl
      ? [
          {
            label: "GitHub",
            detail: "Code, drafts, and experiments",
            href: profile.githubUrl,
            icon: Github,
          },
        ]
      : []),
    ...(profile.linkedinUrl
      ? [
          {
            label: "LinkedIn",
            detail: "Professional profile",
            href: profile.linkedinUrl,
            icon: Linkedin,
          },
        ]
      : []),
    ...(profile.scholarUrl
      ? [
          {
            label: "Scholar",
            detail: "Publications and citations",
            href: profile.scholarUrl,
            icon: GraduationCap,
          },
        ]
      : []),
    ...(profile.cvUrl
      ? [
          {
            label: "Curriculum Vitae",
            detail: "Open the current CV",
            href: profile.cvUrl,
            icon: FileText,
          },
        ]
      : []),
    ...(profile.location
      ? [
          {
            label: "Location",
            detail: profile.location,
            icon: MapPin,
          },
        ]
      : []),
  ];
}

export async function HomeFooterPanels() {
  const [profile, footerAnalytics] = await Promise.all([getSiteProfile(), getFooterAnalytics()]);
  const stats = buildStats(footerAnalytics);
  const overviewCards = buildOverviewCards(footerAnalytics);
  const contactTiles = buildContactTiles(profile);

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2.2rem] p-6 md:p-7">
        <div className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="section-kicker">Site Pulse</p>
            <h3 className="font-serif text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight">
              站点运行概览
            </h3>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              把底部真正有用的状态信息集中在这里：站点运行时长、访问规模和最近活跃区域，一眼就能看出这个站点是否在持续更新与持续被阅读。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {overviewCards.map(({ label, value, detail }) => (
              <article
                key={label}
                className="footer-overview-card rounded-[1.45rem] border border-black/8 p-4"
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  {label}
                </p>
                <p className="mt-3 font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  {value}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{detail}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, detail, icon: Icon }) => (
              <article
                key={label}
                className="footer-stat-card rounded-[1.6rem] border border-black/8 p-4"
              >
                <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                  {label}
                </div>
                <p className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
                  {value}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{detail}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.92fr]">
            <div className="footer-atlas rounded-[2rem] p-5">
              <div className="footer-atlas__mesh" />
              {mapLandmarks.map((className) => (
                <div key={className} className={className} />
              ))}

              <div className="relative z-[2] flex h-full flex-col justify-between gap-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                      Visitor Atlas
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      访问踪迹
                    </p>
                  </div>
                  <div className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
                    live footprint
                  </div>
                </div>

                <div className="relative min-h-[16rem] flex-1 overflow-hidden rounded-[1.7rem] border border-black/6 bg-[rgba(255,255,255,0.36)]">
                  {footerAnalytics.nodes.slice(0, 6).map((node) => (
                    <div
                      key={node.key}
                      className="footer-atlas__node"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <span className="footer-atlas__pulse" />
                      <div className="footer-atlas__label">
                        <span className="footer-atlas__title">{node.label}</span>
                        <span className="footer-atlas__meta">
                          {node.uniqueVisitors.toLocaleString("en-US")} IPs / {node.totalVisits.toLocaleString("en-US")} hits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {footerAnalytics.nodes.slice(0, 4).map((node, index) => (
                <article
                  key={node.key}
                  className="rounded-[1.6rem] border border-black/8 bg-white/72 p-4 shadow-[0_18px_38px_rgba(20,33,43,0.05)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                        访问热点区域 {String(index + 1).padStart(2, "0")}
                      </p>
                      <h4 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                        {node.label}
                      </h4>
                    </div>
                    <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      {node.uniqueVisitors.toLocaleString("en-US")} IPs
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--ink-soft)]">
                    <div className="rounded-2xl border border-black/6 bg-white/55 px-3 py-2">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                        Visits
                      </div>
                      <div className="mt-1 font-semibold text-[var(--ink)]">
                        {node.totalVisits.toLocaleString("en-US")}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/6 bg-white/55 px-3 py-2">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                        Last Seen
                      </div>
                      <div className="mt-1 font-semibold text-[var(--ink)]">
                        {formatDate(node.lastSeenAt, "MM-dd")}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-[2.2rem] p-6 md:p-7">
        <div className="space-y-3">
          <p className="section-kicker">Stay Connected</p>
          <h3 className="font-serif text-[clamp(1.8rem,2.5vw,2.6rem)] font-semibold tracking-tight">
            联系方式
          </h3>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {contactTiles.map(({ label, detail, href, icon: Icon }) => {
            const isExternal = Boolean(
              href && (href.startsWith("http") || href.startsWith("mailto:")),
            );
            const content = (
              <>
                <span className="footer-contact-tile__icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                    {label}
                    {href ? (
                      <ExternalLink className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs leading-6 text-[var(--ink-soft)]">
                    {detail}
                  </span>
                </span>
              </>
            );

            if (!href) {
              return (
                <div
                  key={label}
                  className="footer-contact-tile rounded-[1.45rem] border border-black/8 bg-white/75 px-4 py-4"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
                className="footer-contact-tile rounded-[1.45rem] border border-black/8 bg-white/75 px-4 py-4"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export async function SiteFooter() {
  const [profile, footerAnalytics] = await Promise.all([getSiteProfile(), getFooterAnalytics()]);

  return (
    <footer className="border-t border-black/5 py-8">
      <div className="container-shell">
        <div className="flex flex-col gap-3 text-sm text-[var(--ink-soft)] md:flex-row md:items-center md:justify-between">
          <p>
            {profile.fullName} · {formatDate(footerAnalytics.launchedAt, "yyyy")} - now · site
            telemetry is stored as anonymized regional aggregates.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[rgba(27,107,99,0.08)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
              保持活力
            </span>
            <span className="rounded-full bg-[rgba(168,123,53,0.1)] px-3 py-1 text-xs font-semibold text-[var(--gold)]">
              持续努力
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
