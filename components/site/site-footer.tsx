import Link from "next/link";
import {
  Activity,
  BellRing,
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
type FooterFilingItem = {
  label: string;
  href?: string;
};

type FooterInlineLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

const mapLandmarks = [
  "footer-atlas__land footer-atlas__land--north-america",
  "footer-atlas__land footer-atlas__land--south-america",
  "footer-atlas__land footer-atlas__land--europe",
  "footer-atlas__land footer-atlas__land--africa",
  "footer-atlas__land footer-atlas__land--asia",
  "footer-atlas__land footer-atlas__land--oceania",
];

function buildFooterStats(footerAnalytics: FooterAnalytics) {
  return [
    {
      label: "上线天数",
      value: `${footerAnalytics.daysOnline}`,
      detail: `自 ${formatDate(footerAnalytics.launchedAt, "yyyy-MM-dd")} 起`,
      icon: Clock3,
    },
    {
      label: "独立访客",
      value: footerAnalytics.uniqueVisitors.toLocaleString("zh-CN"),
      detail: "按独立 IP 统计",
      icon: Activity,
    },
    {
      label: "总访问量",
      value: footerAnalytics.totalVisits.toLocaleString("zh-CN"),
      detail: "全站累计访问记录",
      icon: RadioTower,
    },
    {
      label: "活跃地区",
      value: footerAnalytics.activeRegions.toLocaleString("zh-CN"),
      detail: "近期有访问的地区数量",
      icon: Globe2,
    },
  ];
}

function buildFooterOverviewCards(footerAnalytics: FooterAnalytics) {
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
      label: "最活跃地区",
      value: topRegion?.label ?? "等待数据",
      detail: topRegion
        ? `${topRegion.uniqueVisitors.toLocaleString("zh-CN")} 个 IP / ${topRegion.totalVisits.toLocaleString("zh-CN")} 次访问`
        : "有新访问后会自动显示",
    },
    {
      label: "最新活动",
      value: latestRegion?.label ?? "暂无记录",
      detail: latestRegion
        ? `${formatDate(latestRegion.lastSeenAt, "MM-dd")} 最近一次访问`
        : "等待下一次访问记录",
    },
    {
      label: "人均访问",
      value: `${averageVisitsPerVisitor} 次`,
      detail: "每位独立访客平均访问次数",
    },
  ];
}

function buildContactTiles(profile: FooterProfile): ContactTile[] {
  return [
    {
      label: "邮件订阅",
      detail: "通过邮箱订阅更新",
      href: "/subscribe",
      icon: BellRing,
    },
    {
      label: "RSS 订阅",
      detail: "订阅 XML Feed",
      href: "/feed.xml",
      icon: Rss,
    },
    {
      label: "JSON Feed",
      detail: "适合阅读器的结构化订阅",
      href: "/feed.json",
      icon: Waves,
    },
    ...(profile.email
      ? [
          {
            label: "邮箱",
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
            detail: "代码、草稿与实验",
            href: profile.githubUrl,
            icon: Github,
          },
        ]
      : []),
    ...(profile.linkedinUrl
      ? [
          {
            label: "LinkedIn",
            detail: "职业主页",
            href: profile.linkedinUrl,
            icon: Linkedin,
          },
        ]
      : []),
    ...(profile.scholarUrl
      ? [
          {
            label: "Scholar",
            detail: "论文与引用",
            href: profile.scholarUrl,
            icon: GraduationCap,
          },
        ]
      : []),
    ...(profile.cvUrl
      ? [
          {
            label: "简历",
            detail: "查看当前版本简历",
            href: profile.cvUrl,
            icon: FileText,
          },
        ]
      : []),
    ...(profile.location
      ? [
          {
            label: "所在地",
            detail: profile.location,
            icon: MapPin,
          },
        ]
      : []),
  ];
}

function readFooterEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function buildFooterFilingItems(): FooterFilingItem[] {
  const icpNumber = readFooterEnvValue("SITE_ICP_NUMBER", "NEXT_PUBLIC_SITE_ICP_NUMBER");
  const icpLink =
    readFooterEnvValue("SITE_ICP_LINK", "NEXT_PUBLIC_SITE_ICP_LINK") || "https://beian.miit.gov.cn/";
  const publicSecurityNumber = readFooterEnvValue(
    "SITE_PUBLIC_SECURITY_NUMBER",
    "NEXT_PUBLIC_SITE_PUBLIC_SECURITY_NUMBER",
  );
  const publicSecurityLink = readFooterEnvValue(
    "SITE_PUBLIC_SECURITY_LINK",
    "NEXT_PUBLIC_SITE_PUBLIC_SECURITY_LINK",
  );

  const items = [
    ...(icpNumber
      ? [
          {
            label: icpNumber,
            href: icpLink,
          },
        ]
      : []),
    ...(publicSecurityNumber
      ? [
          {
            label: publicSecurityNumber,
            href: publicSecurityLink || undefined,
          },
        ]
      : []),
  ];

  return items.length > 0 ? items : [{ label: "备案信息待补充" }];
}

function buildFooterUtilityItems(profile: FooterProfile): FooterInlineLinkItem[] {
  return [
    { label: "RSS", href: "/feed.xml" },
    { label: "JSON Feed", href: "/feed.json" },
    ...(profile.githubUrl
      ? [{ label: "GitHub", href: profile.githubUrl, external: true }]
      : []),
    ...(profile.email
      ? [{ label: "邮箱", href: `mailto:${profile.email}`, external: true }]
      : []),
  ];
}

function FooterInlineLinks({
  items,
}: {
  items: Array<{ label: string; href?: string; external?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${item.href ?? "static"}`} className="flex items-center gap-x-3">
          {index > 0 ? <span className="text-black/18">/</span> : null}
          {item.href ? (
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="transition hover:text-[var(--accent-strong)]"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export async function HomeFooterPanels() {
  const [profile, footerAnalytics] = await Promise.all([getSiteProfile(), getFooterAnalytics()]);
  const stats = buildFooterStats(footerAnalytics);
  const overviewCards = buildFooterOverviewCards(footerAnalytics);
  const contactTiles = buildContactTiles(profile);

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2.2rem] p-6 md:p-7">
        <div className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="section-kicker">站点脉搏</p>
            <h3 className="font-serif text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight">
              站点活动概览
            </h3>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              用更紧凑的方式展示站点运行时长、访问体量，以及最近活跃的访问地区。
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
                      访问地图
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      实时访问轨迹
                    </p>
                  </div>
                  <div className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
                    实时轨迹
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
                          {node.uniqueVisitors.toLocaleString("zh-CN")} 个 IP / {node.totalVisits.toLocaleString("zh-CN")} 次访问
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
                        热点地区 {String(index + 1).padStart(2, "0")}
                      </p>
                      <h4 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                        {node.label}
                      </h4>
                    </div>
                    <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      {node.uniqueVisitors.toLocaleString("zh-CN")} 个 IP
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--ink-soft)]">
                    <div className="rounded-2xl border border-black/6 bg-white/55 px-3 py-2">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                        访问量
                      </div>
                      <div className="mt-1 font-semibold text-[var(--ink)]">
                        {node.totalVisits.toLocaleString("zh-CN")}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/6 bg-white/55 px-3 py-2">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                        最近访问
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
          <p className="section-kicker">保持联系</p>
          <h3 className="font-serif text-[clamp(1.8rem,2.5vw,2.6rem)] font-semibold tracking-tight">
            连接方式
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
  const profile = await getSiteProfile();
  const filingItems = buildFooterFilingItems();
  const utilityItems = buildFooterUtilityItems(profile);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 py-8">
      <div className="container-shell">
        <div className="space-y-3 text-center text-sm text-[var(--ink-soft)]">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[var(--ink)]">
              <span className="font-medium">
                &copy; {currentYear} {profile.fullName}
              </span>
              <span className="hidden text-black/18 lg:inline">/</span>
              <FooterInlineLinks items={utilityItems} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <FooterInlineLinks items={filingItems} />
          </div>
        </div>
      </div>
    </footer>
  );
}
